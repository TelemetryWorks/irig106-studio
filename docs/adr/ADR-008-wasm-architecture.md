# ADR-008: WASM Deployment Architecture

| Field         | Value                                      |
|---------------|--------------------------------------------|
| Status        | **Accepted**                               |
| Date          | 2026-03-28                                 |
| Decision by   | Joey                                       |
| Traces to     | L1-APP-050, L2-DEPLOY-010, Phase 3 Roadmap |

## Context

IRIG106-Studio must run in the browser with zero installation. The same
`irig106-studio-core` crate that powers the Tauri desktop backend needs
to compile to WebAssembly and be callable from the frontend.

The architecture must handle:
1. Loading WASM modules in a web context
2. Transferring multi-MB file data from JavaScript to Rust
3. Serializing Rust structs back to JavaScript objects
4. Memory management for large Ch10 files (potentially >1 GB)

## Decision

Three-layer architecture with a thin WASM glue crate:

```
Browser JS (WasmAdapter in platform/adapter.ts)
    │  calls via wasm-bindgen
    ▼
irig106-studio-wasm (crates/irig106-studio-wasm)
    │  #[wasm_bindgen] glue — serialize via serde-wasm-bindgen
    ▼
irig106-studio-core (crates/irig106-studio-core)
    │  uses MemBuffer (Vec<u8> — entire file in WASM linear memory)
    ▼
PacketIndex → Ch10Summary → packet data
```

### Key design choices

**`StudioSession` as the WASM entry point.** A single `#[wasm_bindgen]`
struct holds the opened `Ch10File`. JavaScript creates one session per
file open. This avoids passing raw pointers or managing lifetimes
across the JS/WASM boundary.

**`serde-wasm-bindgen` for serialization.** Rust structs that implement
`Serialize` are converted directly to JavaScript objects via
`serde_wasm_bindgen::to_value()`. This is faster than JSON
round-tripping and produces native JS objects.

**`Vec<u8>` return for binary data.** `read_data()` returns `Vec<u8>`
which wasm-bindgen automatically converts to `Uint8Array` on the JS
side. No manual memory management needed.

**Dynamic import for graceful degradation.** The `WasmAdapter` uses
`import("../wasm/irig106_studio_wasm.js")` so the WASM module is only
loaded when present. If the WASM build hasn't been done, the adapter
fails to load and the factory falls back to `MockAdapter`.

**Browser File API for file input.** The `WasmAdapter` uses
`<input type="file">` (programmatically triggered) to get a `File`
object, reads it to `ArrayBuffer`, and passes the bytes to WASM.
Drag-and-drop also provides a `File` object through the same path.

## Build Pipeline

```bash
# Build the WASM module
cd crates/irig106-studio-wasm
wasm-pack build --target web --out-dir ../../src/wasm

# The output goes to src/wasm/ where Vite can import it:
#   src/wasm/irig106_studio_wasm.js   (JS glue)
#   src/wasm/irig106_studio_wasm_bg.wasm  (WASM binary)
```

Vite serves the `.wasm` file as a static asset. The JS glue handles
instantiation via `WebAssembly.instantiateStreaming()`.

## Memory Management

WASM linear memory is a single contiguous `ArrayBuffer`. When
`StudioSession.open()` is called, the file bytes are copied into
this memory (via `data.to_vec()` in Rust). The `PacketIndex` also
lives in WASM memory.

| File size | WASM memory needed | Status |
|-----------|--------------------|--------|
| < 100 MB  | ~200 MB            | Works  |
| 100 MB–1 GB | ~2 GB           | Near limit |
| > 1 GB    | Exceeds 32-bit     | Needs chunked reading |

For files exceeding ~1.5 GB, a future chunked reading strategy (Roadmap
Phase 3.5) will stream packets without loading the entire file. The
`FileBuffer` trait is already designed to support this — `read_at()`
returns a slice, so a chunked implementation could manage a sliding
window of mapped pages.

## Consequences

- **File size doubled in memory.** The `ArrayBuffer` on the JS side
  and the `Vec<u8>` in WASM are separate copies. For most telemetry
  analysis sessions (files < 500 MB), this is acceptable. For larger
  files, the desktop (Tauri + mmap) path should be used.

- **No threading.** WASM doesn't support shared memory threads in
  most browsers. Packet indexing runs single-threaded. For a 1M-packet
  file, this takes ~100ms — fast enough. For 10M+ packets, a Web
  Worker approach may be needed.

- **`BigInt` for RTC.** The 48-bit RTC values serialize as JavaScript
  `BigInt` via serde-wasm-bindgen. The TypeScript `PacketHeader` type
  uses `bigint` to match. This works in all modern browsers but not
  IE11 (which is not a target).

## Alternatives Rejected

- **Emscripten.** Would require rewriting the C-style entry points.
  wasm-bindgen is the Rust-native choice and integrates with the
  existing type system.

- **AssemblyScript.** Would require rewriting the core in a TypeScript
  dialect. Rejected because the core is already Rust.

- **Web Worker for heavy parsing.** Deferred to Phase 3.5. Not needed
  for the initial WASM build since indexing is fast enough on the
  main thread for typical file sizes.
