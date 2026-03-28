//! # irig106-studio-core
//!
//! Core logic for IRIG106-Studio. This crate provides:
//!
//! - **File opening and indexing** — parse Ch10 headers, build a packet
//!   index, extract TMATS metadata
//! - **Packet reading** — random access to packet headers and data payloads
//!   via the packet index
//! - **Channel summarization** — enumerate channels, compute statistics
//! - **Data decoding** — decode data type–specific payloads (1553, PCM,
//!   ARINC 429, etc.) into structured data
//!
//! ## Design Principles
//!
//! 1. **Platform-agnostic public API.** All public types and functions work
//!    on both native and `wasm32` targets. Platform-specific I/O (mmap vs
//!    ArrayBuffer) is abstracted behind the [`io`] module.
//!
//! 2. **Zero-copy where possible.** Packet data is returned as borrowed
//!    slices (`&[u8]`) from the underlying file buffer when the lifetime
//!    allows, or as `Vec<u8>` when ownership transfer is needed (e.g.
//!    across wasm-bindgen).
//!
//! 3. **Deterministic error handling.** All fallible operations return
//!    `Result<T, StudioError>`. No panics in the public API.
//!
//! ## Architecture
//!
//! ```text
//! ┌─────────────────────────────────────────────┐
//! │           irig106-studio-core                │
//! ├─────────────┬───────────────┬───────────────┤
//! │  file       │  index        │  decode       │
//! │  open/close │  packet index │  1553, PCM,   │
//! │  mmap/buf   │  random access│  ARINC, etc.  │
//! ├─────────────┼───────────────┼───────────────┤
//! │  tmats      │  time         │  summary      │
//! │  Ch9 parser │  RTC→IRIG     │  channel stats│
//! │  (wraps     │  (wraps       │               │
//! │  irig106-   │  irig106-     │               │
//! │  tmats)     │  time)        │               │
//! └─────────────┴───────────────┴───────────────┘
//! ```
//!
//! ## Requirements Traced
//!
//! - L1-FILE-010: Open Ch10 files and parse structure
//! - L1-FILE-020: Parse and display TMATS metadata
//! - L1-FILE-030: Build channel index
//! - L1-FILE-040: Validate packet checksums
//! - L1-STD-010:  Support IRIG 106-04 through 106-23
//! - L1-STD-020:  Support all Ch10 data types
//! - L1-STD-030:  Parse all IRIG time formats

pub mod decode;
pub mod error;
pub mod file;
pub mod index;
pub mod io;
pub mod summary;
pub mod time;
pub mod tmats;
pub mod types;

// Re-export the primary public API
pub use error::StudioError;
pub use file::Ch10File;
pub use index::PacketIndex;
pub use summary::Ch10Summary;
pub use types::*;
