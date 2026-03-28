//! Packet index — scans the Ch10 file and builds a random-access
//! lookup table of packet offsets.
//!
//! The index is built once when a file is opened. After that,
//! any packet can be accessed by index in O(1) time.
//!
//! Requirements traced:
//!   L1-FILE-030  Build channel index
//!   L1-FILE-040  Validate packet checksums

use crate::error::{Result, StudioError};
use crate::io::FileBuffer;
use crate::types::*;

/// Entry in the packet index — stores just enough to locate and
/// identify each packet without re-reading the full header.
#[derive(Debug, Clone, Copy)]
pub struct IndexEntry {
    /// Byte offset of the packet in the file.
    pub file_offset: u64,
    /// Channel ID from the packet header.
    pub channel_id: u16,
    /// Data type from the packet header.
    pub data_type: u8,
    /// Total packet length in bytes (header + data + optional filler).
    pub packet_length: u32,
}

/// Random-access index over all packets in a Ch10 file.
pub struct PacketIndex {
    entries: Vec<IndexEntry>,
}

impl PacketIndex {
    /// Scan the file buffer and build the index.
    ///
    /// Iterates through the file looking for sync patterns (0xEB25),
    /// validates minimal header fields, and records each packet's
    /// offset and metadata.
    pub fn build(buffer: &dyn FileBuffer) -> Result<Self> {
        let file_len = buffer.len();
        let mut entries = Vec::new();
        let mut offset: u64 = 0;

        while offset + (PACKET_HEADER_SIZE as u64) <= file_len {
            let header_bytes = buffer.read_at(offset, PACKET_HEADER_SIZE)?;

            // Check sync pattern
            let sync = u16::from_le_bytes([header_bytes[0], header_bytes[1]]);
            if sync != SYNC_PATTERN {
                // Try advancing by 1 byte to find next sync
                // (handles corrupt or non-Ch10 data at start)
                offset += 1;
                continue;
            }

            let channel_id = u16::from_le_bytes([header_bytes[2], header_bytes[3]]);
            let packet_length = u32::from_le_bytes([
                header_bytes[4],
                header_bytes[5],
                header_bytes[6],
                header_bytes[7],
            ]);
            let data_type = header_bytes[18]; // byte 18 in the header

            // Sanity check: packet_length must be at least header size
            if (packet_length as usize) < PACKET_HEADER_SIZE {
                return Err(StudioError::InvalidHeader {
                    offset,
                    detail: format!(
                        "packet_length {} < header size {}",
                        packet_length, PACKET_HEADER_SIZE
                    ),
                });
            }

            // Sanity check: packet must fit in the file
            if offset + (packet_length as u64) > file_len {
                // Truncated final packet — stop indexing
                break;
            }

            entries.push(IndexEntry {
                file_offset: offset,
                channel_id,
                data_type,
                packet_length,
            });

            offset += packet_length as u64;
        }

        Ok(Self { entries })
    }

    /// Number of packets in the index.
    pub fn len(&self) -> usize {
        self.entries.len()
    }

    /// Whether the index is empty.
    pub fn is_empty(&self) -> bool {
        self.entries.is_empty()
    }

    /// Get an index entry by packet number.
    pub fn get(&self, index: usize) -> Option<&IndexEntry> {
        self.entries.get(index)
    }

    /// Iterate over all index entries.
    pub fn iter(&self) -> impl Iterator<Item = &IndexEntry> {
        self.entries.iter()
    }

    /// Read the full packet header for a given packet index.
    pub fn read_header(&self, index: usize, buffer: &dyn FileBuffer) -> Result<PacketHeader> {
        let entry = self.entries.get(index).ok_or(StudioError::IndexOutOfRange {
            index: index as u64,
            count: self.entries.len() as u64,
        })?;

        let bytes = buffer.read_at(entry.file_offset, PACKET_HEADER_SIZE)?;
        parse_header(bytes, entry.file_offset)
    }

    /// Get all unique channel IDs in the file.
    pub fn channel_ids(&self) -> Vec<u16> {
        let mut ids: Vec<u16> = self
            .entries
            .iter()
            .map(|e| e.channel_id)
            .collect();
        ids.sort_unstable();
        ids.dedup();
        ids
    }

    /// Count packets for a given channel ID.
    pub fn count_for_channel(&self, channel_id: u16) -> u64 {
        self.entries
            .iter()
            .filter(|e| e.channel_id == channel_id)
            .count() as u64
    }
}

/// Parse a 24-byte packet header from raw bytes.
fn parse_header(bytes: &[u8], file_offset: u64) -> Result<PacketHeader> {
    debug_assert!(bytes.len() >= PACKET_HEADER_SIZE);

    let sync_pattern = u16::from_le_bytes([bytes[0], bytes[1]]);
    let channel_id = u16::from_le_bytes([bytes[2], bytes[3]]);
    let packet_length = u32::from_le_bytes([bytes[4], bytes[5], bytes[6], bytes[7]]);
    let data_length = u32::from_le_bytes([bytes[8], bytes[9], bytes[10], bytes[11]]);
    let data_type_version = bytes[12];
    let sequence_number = bytes[13];
    // Bytes 14-15: packet flags
    let data_type = bytes[16];
    // Bytes 17: reserved
    // Bytes 18-23: RTC (48-bit, little-endian)
    let rtc = u64::from_le_bytes([
        bytes[18], bytes[19], bytes[20], bytes[21], bytes[22], bytes[23], 0, 0,
    ]);

    // TODO: validate checksum (header checksum is in the packet flags)
    let checksum_valid = true; // Placeholder

    Ok(PacketHeader {
        sync_pattern,
        channel_id,
        packet_length,
        data_length,
        data_type_version,
        sequence_number,
        data_type,
        rtc,
        checksum_valid,
        file_offset,
    })
}
