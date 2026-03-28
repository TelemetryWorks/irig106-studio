//! Fuzz target: feed arbitrary bytes to PacketIndex::build().
//! Must not panic, regardless of input.
//!
//! Run with:
//!   cd crates/irig106-studio-core
//!   cargo +nightly fuzz run fuzz_packet_index

#![no_main]
use libfuzzer_sys::fuzz_target;
use irig106_studio_core::io::MemBuffer;
use irig106_studio_core::index::PacketIndex;
use irig106_studio_core::io::FileBuffer;

fuzz_target!(|data: &[u8]| {
    let buf = MemBuffer::from_vec(data.to_vec());
    // Must not panic — errors are fine
    let _ = PacketIndex::build(&buf);

    // If indexing succeeded, read_header on each entry must not panic
    if let Ok(index) = PacketIndex::build(&buf) {
        for i in 0..index.len() {
            let _ = index.read_header(i, &buf);
        }
    }
});
