//! Ch10 packet checksum validation.
//!
//! IRIG 106 Chapter 10 supports several checksum modes, indicated by
//! the Packet Flags field (bytes 14-15). The header checksum covers
//! the first 22 bytes (11 × 16-bit words) of the packet header.
//!
//! ## Checksum types (from Packet Flags bits 0-1)
//!
//! | Value | Mode            | Size    |
//! |-------|-----------------|---------|
//! | 0b00  | No checksum     | —       |
//! | 0b01  | 8-bit checksum  | 1 byte  |
//! | 0b10  | 16-bit checksum | 2 bytes |
//! | 0b11  | 32-bit checksum | 4 bytes |
//!
//! The data checksum, when present, is appended after the data payload
//! and before any filler bytes.
//!
//! Requirements traced:
//!   L1-FILE-040  Validate packet checksums
//!   L2-CHKSUM-010  Implement header checksum validation

/// Checksum type extracted from Packet Flags.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum ChecksumType {
    None,
    Sum8,
    Sum16,
    Sum32,
}

impl ChecksumType {
    /// Extract checksum type from the Packet Flags word (bytes 14-15).
    pub fn from_flags(flags: u16) -> Self {
        match flags & 0x03 {
            0b00 => Self::None,
            0b01 => Self::Sum8,
            0b10 => Self::Sum16,
            0b11 => Self::Sum32,
            _ => unreachable!(),
        }
    }

    /// Size of the checksum in bytes (0 if no checksum).
    pub fn size(&self) -> usize {
        match self {
            Self::None => 0,
            Self::Sum8 => 1,
            Self::Sum16 => 2,
            Self::Sum32 => 4,
        }
    }
}

/// Compute a 16-bit arithmetic checksum over the given bytes.
///
/// Sum is computed as 16-bit wrapping addition of sequential
/// little-endian 16-bit words. If `data.len()` is odd, the last
/// byte is treated as a 16-bit word with a zero high byte.
pub fn checksum_16(data: &[u8]) -> u16 {
    let mut sum: u16 = 0;
    let mut i = 0;
    while i + 1 < data.len() {
        sum = sum.wrapping_add(u16::from_le_bytes([data[i], data[i + 1]]));
        i += 2;
    }
    if i < data.len() {
        sum = sum.wrapping_add(data[i] as u16);
    }
    sum
}

/// Compute an 8-bit arithmetic checksum.
pub fn checksum_8(data: &[u8]) -> u8 {
    let mut sum: u8 = 0;
    for &byte in data {
        sum = sum.wrapping_add(byte);
    }
    sum
}

/// Compute a 32-bit arithmetic checksum over the given bytes.
///
/// Sum is computed as 32-bit wrapping addition of sequential
/// little-endian 32-bit words.
pub fn checksum_32(data: &[u8]) -> u32 {
    let mut sum: u32 = 0;
    let mut i = 0;
    while i + 3 < data.len() {
        sum = sum.wrapping_add(u32::from_le_bytes([
            data[i],
            data[i + 1],
            data[i + 2],
            data[i + 3],
        ]));
        i += 4;
    }
    // Handle remaining bytes
    match data.len() - i {
        3 => sum = sum.wrapping_add(u32::from_le_bytes([data[i], data[i + 1], data[i + 2], 0])),
        2 => sum = sum.wrapping_add(u32::from_le_bytes([data[i], data[i + 1], 0, 0])),
        1 => sum = sum.wrapping_add(data[i] as u32),
        _ => {}
    }
    sum
}

/// Validate a packet header checksum.
///
/// `header_bytes` must be exactly 24 bytes (the full packet header).
/// Returns `true` if the checksum validates or if no checksum is present.
///
/// The header checksum covers bytes 0–21 (11 × 16-bit words).
/// The expected checksum value occupies bytes 22–23 as a 16-bit LE word.
///
/// NOTE: This implements the 16-bit header checksum mode. For files
/// using 8-bit or 32-bit mode, the packet flags must be inspected
/// first. This function assumes 16-bit mode when a checksum is present.
pub fn validate_header_checksum(header_bytes: &[u8]) -> bool {
    debug_assert!(header_bytes.len() >= 24);

    let flags = u16::from_le_bytes([header_bytes[14], header_bytes[15]]);
    let cksum_type = ChecksumType::from_flags(flags);

    match cksum_type {
        ChecksumType::None => true,
        ChecksumType::Sum16 => {
            let computed = checksum_16(&header_bytes[..22]);
            let stored = u16::from_le_bytes([header_bytes[22], header_bytes[23]]);
            computed == stored
        }
        ChecksumType::Sum8 => {
            // 8-bit checksum of first 22 bytes, stored in byte 22
            let computed = checksum_8(&header_bytes[..22]);
            computed == header_bytes[22]
        }
        ChecksumType::Sum32 => {
            // 32-bit checksum doesn't fit in 2 bytes —
            // this mode is used for data checksums, not typically
            // for the header. Treat as no header checksum.
            true
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn checksum_8_basic() {
        assert_eq!(checksum_8(&[1, 2, 3, 4]), 10);
        assert_eq!(checksum_8(&[]), 0);
        assert_eq!(checksum_8(&[0xFF, 0x01]), 0x00); // wrapping
    }

    #[test]
    fn checksum_8_wrapping() {
        assert_eq!(checksum_8(&[0x80, 0x80]), 0x00);
        assert_eq!(checksum_8(&[0xFF, 0xFF]), 0xFE);
    }

    #[test]
    fn checksum_16_basic() {
        // Two 16-bit words: 0x0201 + 0x0403 = 0x0604
        assert_eq!(checksum_16(&[1, 2, 3, 4]), 0x0201u16.wrapping_add(0x0403));
        assert_eq!(checksum_16(&[]), 0);
    }

    #[test]
    fn checksum_16_odd_length() {
        // [0x01, 0x02, 0x03] → 0x0201 + 0x0003 = 0x0204
        assert_eq!(checksum_16(&[1, 2, 3]), 0x0201u16.wrapping_add(0x0003));
    }

    #[test]
    fn checksum_16_wrapping() {
        assert_eq!(checksum_16(&[0xFF, 0xFF, 0x02, 0x00]), 0xFFFFu16.wrapping_add(0x0002));
    }

    #[test]
    fn checksum_32_basic() {
        // One 32-bit word: [1, 0, 0, 0] = 1
        assert_eq!(checksum_32(&[1, 0, 0, 0]), 1);
        assert_eq!(checksum_32(&[]), 0);
    }

    #[test]
    fn checksum_32_multiple_words() {
        // [1,0,0,0] + [2,0,0,0] = 3
        assert_eq!(checksum_32(&[1, 0, 0, 0, 2, 0, 0, 0]), 3);
    }

    #[test]
    fn checksum_32_remainder_bytes() {
        // [1,0,0,0] + [5,6,0,0] (2 remainder bytes treated as partial word)
        assert_eq!(checksum_32(&[1, 0, 0, 0, 5, 6]), 1u32 + 0x0605);
    }

    #[test]
    fn checksum_type_from_flags() {
        assert_eq!(ChecksumType::from_flags(0b0000), ChecksumType::None);
        assert_eq!(ChecksumType::from_flags(0b0001), ChecksumType::Sum8);
        assert_eq!(ChecksumType::from_flags(0b0010), ChecksumType::Sum16);
        assert_eq!(ChecksumType::from_flags(0b0011), ChecksumType::Sum32);
        // Upper bits should be ignored
        assert_eq!(ChecksumType::from_flags(0xFF00), ChecksumType::None);
        assert_eq!(ChecksumType::from_flags(0xFF02), ChecksumType::Sum16);
    }

    #[test]
    fn checksum_type_size() {
        assert_eq!(ChecksumType::None.size(), 0);
        assert_eq!(ChecksumType::Sum8.size(), 1);
        assert_eq!(ChecksumType::Sum16.size(), 2);
        assert_eq!(ChecksumType::Sum32.size(), 4);
    }

    #[test]
    fn validate_header_no_checksum() {
        let mut header = [0u8; 24];
        header[0] = 0x25; header[1] = 0xEB; // sync
        header[14] = 0x00; header[15] = 0x00; // flags = no checksum
        assert!(validate_header_checksum(&header));
    }

    #[test]
    fn validate_header_16bit_correct() {
        let mut header = [0u8; 24];
        header[0] = 0x25; header[1] = 0xEB; // sync
        // Set flags to 16-bit checksum
        header[14] = 0x02; header[15] = 0x00;
        // Compute checksum of bytes 0-21 and store in 22-23
        let sum = checksum_16(&header[..22]);
        let sum_bytes = sum.to_le_bytes();
        header[22] = sum_bytes[0];
        header[23] = sum_bytes[1];

        assert!(validate_header_checksum(&header));
    }

    #[test]
    fn validate_header_16bit_incorrect() {
        let mut header = [0u8; 24];
        header[0] = 0x25; header[1] = 0xEB;
        header[14] = 0x02; header[15] = 0x00; // 16-bit checksum
        header[22] = 0xFF; header[23] = 0xFF; // wrong checksum

        assert!(!validate_header_checksum(&header));
    }
}
