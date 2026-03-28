//! # irig106-studio-wasm
//!
//! WebAssembly bindings for `irig106-studio-core`. This crate provides
//! a thin `#[wasm_bindgen]` layer that the browser's `WasmAdapter`
//! calls via JavaScript.
//!
//! ## Architecture
//!
//! ```text
//! Browser JS (WasmAdapter)
//!     │  calls via wasm-bindgen
//!     ▼
//! irig106-studio-wasm (this crate)
//!     │  thin glue — serializes Rust types to JsValue
//!     ▼
//! irig106-studio-core
//!     │  uses MemBuffer (Vec<u8> from File API)
//!     ▼
//! PacketIndex → Ch10Summary → decoded data
//! ```
//!
//! ## Usage from JavaScript
//!
//! ```javascript
//! import init, { StudioSession } from './irig106_studio_wasm.js';
//!
//! await init();
//! const arrayBuffer = await file.arrayBuffer();
//! const bytes = new Uint8Array(arrayBuffer);
//!
//! const session = StudioSession.open(bytes, "recording.ch10");
//! const summary = session.summary();  // → JSON-serialized Ch10Summary
//! const headers = session.read_headers(0, 100);
//! const data = session.read_data(0x1000, 64);
//! ```
//!
//! Requirements traced:
//!   L1-APP-050   Run as browser application via WASM
//!   ADR-002      Platform abstraction layer

use wasm_bindgen::prelude::*;
use irig106_studio_core::{Ch10File, PacketIndex};
use irig106_studio_core::io::FileBuffer;

/// A Ch10 file session held in WASM memory.
///
/// Created by passing the file's bytes from JavaScript.
/// All subsequent operations reference the in-memory data.
#[wasm_bindgen]
pub struct StudioSession {
    file: Ch10File,
}

#[wasm_bindgen]
impl StudioSession {
    /// Open a Ch10 file from a byte array (received from the JS File API).
    ///
    /// Returns a `StudioSession` that holds the file in WASM memory.
    /// Throws a JavaScript error if the file is invalid.
    #[wasm_bindgen(constructor)]
    pub fn open(data: &[u8], filename: &str) -> Result<StudioSession, JsError> {
        let file = Ch10File::from_bytes(data.to_vec(), filename)
            .map_err(|e| JsError::new(&e.to_string()))?;
        Ok(Self { file })
    }

    /// Get the file summary as a JSON-serialized JsValue.
    ///
    /// Returns the same shape as TypeScript's `Ch10Summary` type.
    #[wasm_bindgen]
    pub fn summary(&self) -> Result<JsValue, JsError> {
        let summary = self.file.summary()
            .map_err(|e| JsError::new(&e.to_string()))?;
        serde_wasm_bindgen::to_value(&summary)
            .map_err(|e| JsError::new(&e.to_string()))
    }

    /// Read packet headers starting at `start_index`, returning up to `count`.
    ///
    /// Returns a JSON array of PacketHeader objects.
    #[wasm_bindgen]
    pub fn read_headers(&self, start_index: u32, count: u32) -> Result<JsValue, JsError> {
        let index = self.file.index();
        let total = index.len();
        let start = start_index as usize;
        let end = (start + count as usize).min(total);

        let mut headers = Vec::with_capacity(end - start);
        for i in start..end {
            let header = self.file.read_header(i)
                .map_err(|e| JsError::new(&e.to_string()))?;
            headers.push(header);
        }

        serde_wasm_bindgen::to_value(&headers)
            .map_err(|e| JsError::new(&e.to_string()))
    }

    /// Read raw packet data at the given file offset and length.
    ///
    /// Returns a `Uint8Array` for zero-copy transfer to JavaScript.
    #[wasm_bindgen]
    pub fn read_data(&self, file_offset: u64, length: u32) -> Result<Vec<u8>, JsError> {
        let data = self.file.read_data(file_offset, length as usize)
            .map_err(|e| JsError::new(&e.to_string()))?;
        Ok(data.to_vec())
    }

    /// Get the raw TMATS text from channel 0.
    #[wasm_bindgen]
    pub fn tmats_text(&self) -> Result<String, JsError> {
        self.file.extract_tmats()
            .map_err(|e| JsError::new(&e.to_string()))
    }

    /// Get total packet count.
    #[wasm_bindgen]
    pub fn packet_count(&self) -> u32 {
        self.file.index().len() as u32
    }

    /// Get all unique channel IDs.
    #[wasm_bindgen]
    pub fn channel_ids(&self) -> Vec<u16> {
        self.file.index().channel_ids()
    }
}

/// Initialize the WASM module — called once on page load.
///
/// Sets up a panic hook for better error messages in the browser console.
#[wasm_bindgen(start)]
pub fn init() {
    #[cfg(feature = "console_error_panic_hook")]
    console_error_panic_hook::set_once();
}
