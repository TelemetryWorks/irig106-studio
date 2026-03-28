//! Error types for irig106-studio-core.

use thiserror::Error;

/// All errors that can occur when operating on Ch10 files.
#[derive(Debug, Error)]
pub enum StudioError {
    /// The file could not be opened or read.
    #[error("I/O error: {0}")]
    Io(#[from] std::io::Error),

    /// The file does not start with a valid Ch10 sync pattern (0xEB25).
    #[error("Invalid sync pattern at offset {offset:#x}: expected 0xEB25, got {actual:#06x}")]
    InvalidSync { offset: u64, actual: u16 },

    /// A packet header field is out of the valid range.
    #[error("Invalid packet header at offset {offset:#x}: {detail}")]
    InvalidHeader { offset: u64, detail: String },

    /// Packet checksum validation failed.
    #[error("Checksum mismatch at offset {offset:#x}: expected {expected:#06x}, got {actual:#06x}")]
    ChecksumMismatch {
        offset: u64,
        expected: u16,
        actual: u16,
    },

    /// The file is too small to contain a valid Ch10 packet.
    #[error("File too small: {size} bytes (minimum is 24 bytes for a single packet header)")]
    FileTooSmall { size: u64 },

    /// A requested packet index is out of range.
    #[error("Packet index {index} is out of range (file contains {count} packets)")]
    IndexOutOfRange { index: u64, count: u64 },

    /// TMATS parsing failed.
    #[error("TMATS parse error: {0}")]
    TmatsParse(String),

    /// Time correlation failed.
    #[error("Time correlation error: {0}")]
    TimeCorrelation(String),

    /// An unsupported IRIG 106 standard version was encountered.
    #[error("Unsupported standard version: {0}")]
    UnsupportedVersion(String),

    /// A data type decoder encountered invalid payload data.
    #[error("Decode error for data type {data_type:#04x} at offset {offset:#x}: {detail}")]
    DecodeError {
        data_type: u8,
        offset: u64,
        detail: String,
    },
}

/// Convenience type alias.
pub type Result<T> = std::result::Result<T, StudioError>;
