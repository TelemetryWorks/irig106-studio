//! Core domain types for irig106-studio-core.
//!
//! These types are the Rust-side mirror of `src/types/domain.ts`.
//! When serialized via serde, they produce the exact JSON shape
//! expected by the TypeScript frontend.
//!
//! Requirements traced:
//!   ADR-006: Domain type system as UI–backend contract

use serde::{Deserialize, Serialize};

// ── Ch10 Data Types ──

/// IRIG 106 Chapter 10 data type identifiers.
///
/// Values are the actual hex codes from the standard.
/// See IRIG 106-17, Chapter 10, Table 10-6.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
#[repr(u8)]
pub enum DataType {
    Computer0     = 0x00,
    Computer1     = 0x01,
    Pcm_FmtA      = 0x09,
    Pcm_FmtB      = 0x0A,
    Time          = 0x11,
    Mil1553_FmtA  = 0x19,
    Mil1553_FmtB  = 0x1A,
    Analog        = 0x21,
    Discrete      = 0x29,
    Message       = 0x30,
    Arinc429      = 0x38,
    Video_FmtA    = 0x40,
    Video_FmtB    = 0x41,
    Image_FmtA    = 0x48,
    Uart          = 0x50,
    Ieee1394      = 0x58,
    ParallelDC    = 0x60,
    Ethernet_FmtA = 0x68,
    Ethernet_FmtB = 0x69,
    Tspi          = 0x70,
    Can           = 0x78,
    FibreCh       = 0x79,
}

impl DataType {
    /// Try to convert a raw u8 to a DataType.
    pub fn from_u8(value: u8) -> Option<Self> {
        // Safe: we only accept known discriminants
        match value {
            0x00 => Some(Self::Computer0),
            0x01 => Some(Self::Computer1),
            0x09 => Some(Self::Pcm_FmtA),
            0x0A => Some(Self::Pcm_FmtB),
            0x11 => Some(Self::Time),
            0x19 => Some(Self::Mil1553_FmtA),
            0x1A => Some(Self::Mil1553_FmtB),
            0x21 => Some(Self::Analog),
            0x29 => Some(Self::Discrete),
            0x30 => Some(Self::Message),
            0x38 => Some(Self::Arinc429),
            0x40 => Some(Self::Video_FmtA),
            0x41 => Some(Self::Video_FmtB),
            0x48 => Some(Self::Image_FmtA),
            0x50 => Some(Self::Uart),
            0x58 => Some(Self::Ieee1394),
            0x60 => Some(Self::ParallelDC),
            0x68 => Some(Self::Ethernet_FmtA),
            0x69 => Some(Self::Ethernet_FmtB),
            0x70 => Some(Self::Tspi),
            0x78 => Some(Self::Can),
            0x79 => Some(Self::FibreCh),
            _ => None,
        }
    }
}

// ── File & Channel Model ──

/// File-level metadata.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Ch10FileInfo {
    pub filename: String,
    pub filepath: String,
    pub file_size: u64,
    pub packet_count: u64,
    pub duration_sec: f64,
    pub standard_version: String,
}

/// A single data channel in a Ch10 file.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Channel {
    pub channel_id: u16,
    pub data_type: u8,
    pub label: String,
    pub data_source_id: String,
    pub packet_count: u64,
    /// Average data rate in bytes/sec.
    pub data_rate: u64,
}

/// A group of channels from one recording data source.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DataSource {
    pub id: String,
    pub label: String,
    pub channels: Vec<Channel>,
}

// ── Packet Header ──

/// On-disk Ch10 packet header (24 bytes).
///
/// See IRIG 106-17, Chapter 10, Figure 10-4.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PacketHeader {
    /// Sync pattern — always 0xEB25 for valid packets.
    pub sync_pattern: u16,
    pub channel_id: u16,
    pub packet_length: u32,
    pub data_length: u32,
    pub data_type_version: u8,
    pub sequence_number: u8,
    pub data_type: u8,
    /// 48-bit Relative Time Counter.
    pub rtc: u64,
    /// Whether the header/data checksum validated correctly.
    pub checksum_valid: bool,
    /// Byte offset of this packet in the file.
    pub file_offset: u64,
}

/// Size of the on-disk packet header in bytes.
pub const PACKET_HEADER_SIZE: usize = 24;

/// Ch10 sync pattern constant.
pub const SYNC_PATTERN: u16 = 0xEB25;

// ── Time ──

/// Parsed IRIG time value.
#[derive(Debug, Clone, Copy, Serialize, Deserialize)]
pub struct IrigTime {
    pub day_of_year: u16,
    pub hours: u8,
    pub minutes: u8,
    pub seconds: u8,
    pub microseconds: u32,
}

impl IrigTime {
    /// Format as DOY:HH:MM:SS.μμμμμμ.
    pub fn format(&self) -> String {
        format!(
            "{:03}:{:02}:{:02}:{:02}.{:06}",
            self.day_of_year,
            self.hours,
            self.minutes,
            self.seconds,
            self.microseconds,
        )
    }
}
