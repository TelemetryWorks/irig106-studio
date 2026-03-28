//! Fuzz target: checksum functions must not panic on arbitrary input.
//!
//! Run with:
//!   cd crates/irig106-studio-core
//!   cargo +nightly fuzz run fuzz_checksum

#![no_main]
use libfuzzer_sys::fuzz_target;
use irig106_studio_core::checksum::{checksum_8, checksum_16, checksum_32, validate_header_checksum};

fuzz_target!(|data: &[u8]| {
    // These must never panic regardless of input
    let _ = checksum_8(data);
    let _ = checksum_16(data);
    let _ = checksum_32(data);

    // validate_header_checksum requires >= 24 bytes
    if data.len() >= 24 {
        let _ = validate_header_checksum(data);
    }
});
