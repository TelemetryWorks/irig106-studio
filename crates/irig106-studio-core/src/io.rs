//! Platform-abstracted I/O for Ch10 file access.
//!
//! On native targets, files are memory-mapped via `memmap2` for
//! zero-copy access to multi-GB recordings.
//!
//! On wasm32 targets, files are loaded into a `Vec<u8>` buffer
//! (received from the JavaScript File API via wasm-bindgen).
//!
//! The [`FileBuffer`] trait provides a uniform interface.
//!
//! Requirements traced:
//!   L2-FILE-040  Tauri backend SHALL support mmap for files > 1 GB

use crate::error::Result;

/// Uniform read-only access to a Ch10 file's bytes.
pub trait FileBuffer: Send + Sync {
    /// Total file size in bytes.
    fn len(&self) -> u64;

    /// Whether the buffer is empty.
    fn is_empty(&self) -> bool {
        self.len() == 0
    }

    /// Read a slice of bytes at the given offset.
    ///
    /// Returns `Err` if `offset + len` exceeds the file size.
    fn read_at(&self, offset: u64, len: usize) -> Result<&[u8]>;

    /// Get the entire buffer as a slice (only practical for smaller files
    /// or wasm where the whole file is in memory).
    fn as_slice(&self) -> &[u8];
}

// ── Native: memory-mapped file ──

#[cfg(not(target_arch = "wasm32"))]
mod native {
    use super::*;
    use memmap2::Mmap;
    use std::fs::File;
    use std::path::Path;

    /// Memory-mapped Ch10 file for zero-copy native access.
    pub struct MmapBuffer {
        _file: File,
        mmap: Mmap,
    }

    impl MmapBuffer {
        /// Open and memory-map a Ch10 file.
        ///
        /// # Safety
        /// The file must not be modified while mapped.
        pub fn open(path: &Path) -> Result<Self> {
            let file = File::open(path)?;
            // SAFETY: We only read; the file is not modified.
            let mmap = unsafe { Mmap::map(&file)? };
            Ok(Self { _file: file, mmap })
        }
    }

    impl FileBuffer for MmapBuffer {
        fn len(&self) -> u64 {
            self.mmap.len() as u64
        }

        fn read_at(&self, offset: u64, len: usize) -> Result<&[u8]> {
            let start = offset as usize;
            let end = start + len;
            if end > self.mmap.len() {
                return Err(crate::error::StudioError::Io(std::io::Error::new(
                    std::io::ErrorKind::UnexpectedEof,
                    format!(
                        "read_at: offset {offset:#x} + len {len} exceeds file size {}",
                        self.mmap.len()
                    ),
                )));
            }
            Ok(&self.mmap[start..end])
        }

        fn as_slice(&self) -> &[u8] {
            &self.mmap
        }
    }
}

#[cfg(not(target_arch = "wasm32"))]
pub use native::MmapBuffer;

// ── WASM: in-memory buffer ──

/// In-memory buffer for wasm32 targets.
///
/// The JavaScript frontend reads the file via the File API and passes
/// the `ArrayBuffer` contents to this struct via wasm-bindgen.
pub struct MemBuffer {
    data: Vec<u8>,
}

impl MemBuffer {
    /// Create a buffer from owned bytes (e.g. from wasm-bindgen).
    pub fn from_vec(data: Vec<u8>) -> Self {
        Self { data }
    }
}

impl FileBuffer for MemBuffer {
    fn len(&self) -> u64 {
        self.data.len() as u64
    }

    fn read_at(&self, offset: u64, len: usize) -> Result<&[u8]> {
        let start = offset as usize;
        let end = start + len;
        if end > self.data.len() {
            return Err(crate::error::StudioError::Io(std::io::Error::new(
                std::io::ErrorKind::UnexpectedEof,
                format!(
                    "read_at: offset {offset:#x} + len {len} exceeds buffer size {}",
                    self.data.len()
                ),
            )));
        }
        Ok(&self.data[start..end])
    }

    fn as_slice(&self) -> &[u8] {
        &self.data
    }
}
