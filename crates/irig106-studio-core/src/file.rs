//! Ch10 file open, close, and top-level operations.
//!
//! This module is the primary entry point for working with Ch10 files.
//! It owns the [`FileBuffer`] and the [`PacketIndex`], and provides
//! methods to access packets, channels, and metadata.
//!
//! ## Usage
//!
//! ```rust,no_run
//! use irig106_studio_core::Ch10File;
//! use std::path::Path;
//!
//! let file = Ch10File::open(Path::new("recording.ch10"))?;
//! let summary = file.summary()?;
//! println!("Packets: {}", summary.file.packet_count);
//! # Ok::<(), irig106_studio_core::StudioError>(())
//! ```
//!
//! Requirements traced:
//!   L1-FILE-010  Open Ch10 files and parse structure
//!   L1-FILE-030  Build channel index
//!   L1-FILE-040  Validate packet checksums

use crate::error::{Result, StudioError};
use crate::index::PacketIndex;
use crate::io::FileBuffer;
use crate::summary::Ch10Summary;
use crate::types::*;

#[cfg(not(target_arch = "wasm32"))]
use crate::io::MmapBuffer;
use crate::io::MemBuffer;

#[cfg(not(target_arch = "wasm32"))]
use std::path::Path;

/// An opened Ch10 file with a built packet index.
pub struct Ch10File {
    buffer: Box<dyn FileBuffer>,
    index: PacketIndex,
    info: Ch10FileInfo,
}

impl Ch10File {
    /// Open a Ch10 file from a filesystem path (native only).
    ///
    /// This memory-maps the file and builds the packet index.
    #[cfg(not(target_arch = "wasm32"))]
    pub fn open(path: &Path) -> Result<Self> {
        let buffer = MmapBuffer::open(path)?;
        let file_size = buffer.len();

        if file_size < PACKET_HEADER_SIZE as u64 {
            return Err(StudioError::FileTooSmall { size: file_size });
        }

        let filename = path
            .file_name()
            .map(|n| n.to_string_lossy().into_owned())
            .unwrap_or_else(|| "unknown".into());
        let filepath = path.to_string_lossy().into_owned();

        let buffer: Box<dyn FileBuffer> = Box::new(buffer);
        let index = PacketIndex::build(&*buffer)?;

        let info = Ch10FileInfo {
            filename,
            filepath,
            file_size,
            packet_count: index.len() as u64,
            duration_sec: 0.0, // TODO: compute from first/last time packets
            standard_version: "106-17".into(), // TODO: detect from TMATS
        };

        Ok(Self { buffer, index, info })
    }

    /// Open a Ch10 file from an in-memory buffer (wasm or test).
    pub fn from_bytes(data: Vec<u8>, filename: &str) -> Result<Self> {
        let file_size = data.len() as u64;
        if file_size < PACKET_HEADER_SIZE as u64 {
            return Err(StudioError::FileTooSmall { size: file_size });
        }

        let buffer: Box<dyn FileBuffer> = Box::new(MemBuffer::from_vec(data));
        let index = PacketIndex::build(&*buffer)?;

        let info = Ch10FileInfo {
            filename: filename.to_string(),
            filepath: String::new(),
            file_size,
            packet_count: index.len() as u64,
            duration_sec: 0.0,
            standard_version: "106-17".into(),
        };

        Ok(Self { buffer, index, info })
    }

    /// Get file-level metadata.
    pub fn file_info(&self) -> &Ch10FileInfo {
        &self.info
    }

    /// Get the packet index.
    pub fn index(&self) -> &PacketIndex {
        &self.index
    }

    /// Build a complete summary (for sending to the frontend).
    pub fn summary(&self) -> Result<Ch10Summary> {
        Ch10Summary::build(&self.info, &self.index, &*self.buffer)
    }

    /// Read a packet header at the given index.
    pub fn read_header(&self, packet_index: usize) -> Result<PacketHeader> {
        self.index.read_header(packet_index, &*self.buffer)
    }

    /// Read raw packet data payload at the given file offset.
    pub fn read_data(&self, file_offset: u64, length: usize) -> Result<&[u8]> {
        self.buffer.read_at(file_offset, length)
    }
}
