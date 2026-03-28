# IRIG106-Studio — Roadmap

| Document | IRIG106-Studio Development Roadmap |
|----------|-------------------------------------|
| Version  | 0.1.0                               |
| Date     | 2026-03-28                          |
| Author   | Joey                                |

## Overview

This roadmap is organized into phases. Each phase is designed to be
completable independently, with later phases building on earlier ones.
Tasks marked **BLOCKED** require external crate completion; everything
else can proceed now.

---

## Phase 0 — Foundation (COMPLETE)

The current state of the project. All items delivered.

| #  | Task                                   | Status    |
|----|----------------------------------------|-----------|
| 0.1  | Isaac Sim-style docked panel layout  | Done      |
| 0.2  | Toolbar with transport controls      | Done      |
| 0.3  | Channel tree sidebar                 | Done      |
| 0.4  | Viewport with 4 tabbed views         | Done      |
| 0.5  | Properties panel (channel + packet)  | Done      |
| 0.6  | Bottom panel (console, stats, time, errors) | Done |
| 0.7  | Status bar                           | Done      |
| 0.8  | Platform abstraction layer (ADR-002) | Done      |
| 0.9  | Mock adapter with synthetic data     | Done      |
| 0.10 | Tauri v2 desktop scaffold (ADR-001)  | Done      |
| 0.11 | Keyboard shortcuts (18 bindings)     | Done      |
| 0.12 | Drag-and-drop file open              | Done      |
| 0.13 | Dark/light theme switcher            | Done      |
| 0.14 | Domain type system (ADR-006)         | Done      |
| 0.15 | `irig106-studio-core` crate scaffold | Done      |
| 0.16 | Requirements docs (25 L1 + 65 L2)   | Done      |
| 0.17 | 6 Architecture Decision Records      | Done      |
| 0.18 | Project structure + onboarding docs  | Done      |

---

## Phase 1 — UI Hardening & Testing

**Goal:** Make the frontend production-ready. No backend dependencies.
Everything here is unblocked.

### 1A — UI Polish

| #    | Task                                          | Traces to    | Est. |
|------|-----------------------------------------------|--------------|------|
| 1.1  | **Welcome/empty state.** Replace auto-open mock data with a splash screen ("Drag a .ch10 file or press Ctrl+O"). Mock data loads only on explicit open. | L1-APP-010 | S |
| 1.2  | **Panel collapse/expand.** Double-click a resize handle to collapse a panel to zero width/height. Double-click again to restore. Store collapsed state. | L1-APP-010 | M |
| 1.3  | **Channel tree search/filter.** Wire the ⌕ icon to a text input that filters the channel list by label, ID, or data type badge. | L1-NAV-010 | S |
| 1.4  | **Context menus.** Right-click on channel tree items → "Copy channel ID", "Show in packets view". Right-click on packet table rows → "Copy hex", "Jump to offset". Actions stubbed where backend is needed. | L1-NAV-020 | M |
| 1.5  | **Persistent layout state.** Save panel widths, active tabs, and theme to localStorage. Restore on reload. | L1-APP-010 | S |
| 1.6  | **TMATS syntax highlighting.** Color group codes (R-x, B-x, D-x, etc.), attribute names, and values in the TMATS view. Pure regex-based; no parser needed. | L1-VIS-040 | S |
| 1.7  | **Hex view interactivity.** Click a byte to select it. Highlight the corresponding ASCII character. Show selected offset in status bar. Keyboard arrow navigation. | L1-VIS-020 | M |
| 1.8  | **Waveform zoom and pan.** Mouse wheel zooms the time axis. Click-drag pans horizontally. Zoom range clamped. Works against demo data. | L1-VIS-010 | L |
| 1.9  | **Multi-channel waveform overlay.** Drag channels from the tree onto the waveform area to add traces. Click a legend entry to remove it. Each channel gets a distinct color from the data type badge palette. | L1-VIS-010 | L |
| 1.10 | **Packet table virtual scrolling.** Replace the 100-row static table with a virtual scroll that can handle 1M+ rows. Uses `readPacketHeaders(startIndex, count)` with a viewport window. Row recycling. | L1-VIS-030 | L |

*Size: S = half day, M = 1 day, L = 2-3 days*

### 1B — Testing & CI

| #    | Task                                          | Traces to    | Est. |
|------|-----------------------------------------------|--------------|------|
| 1.11 | **Vitest setup.** Add Vitest to the project. Unit tests for: `formatIrigTime()`, `dataTypeBadge()`, keyboard shortcut matching, theme switcher state machine. | — | S |
| 1.12 | **ESLint + Prettier config.** Enforce consistent code style. No-unused-vars, strict TypeScript checks. Format on save. | — | S |
| 1.13 | **GitHub Actions CI pipeline.** On push: `npm ci` → `npm run build` → `npm test` → ESLint check. Cache `node_modules`. Fail on any error. | — | S |
| 1.14 | **Accessibility pass.** Add `aria-label` to toolbar buttons, `role="tree"` to channel tree, keyboard focus rings on interactive elements. | L1-APP-020 | M |

### 1C — Documentation

| #    | Task                                          | Est. |
|------|-----------------------------------------------|------|
| 1.15 | **ADR-007: Virtual scrolling strategy.** Document the approach for million-row packet tables (viewport window, row recycling, scroll position mapping). | S |
| 1.16 | **Update L2 requirements.** Add entries for all Phase 1 features (theme, filter, collapse, virtual scroll, etc.). | S |
| 1.17 | **Update traceability matrix.** Full coverage for Phase 1. | S |

---

## Phase 2 — Core Crate Completion

**Goal:** Make `irig106-studio-core` a real, tested Ch10 file reader.
Most tasks here are unblocked — they work against synthetic byte arrays.

### 2A — Core Functionality (UNBLOCKED)

| #    | Task                                          | Traces to    | Est. |
|------|-----------------------------------------------|--------------|------|
| 2.1  | **PacketIndex unit tests.** Synthesize valid Ch10 byte arrays in-memory. Test: single packet, multiple packets, truncated final packet, no sync pattern, sync at offset > 0. | L1-FILE-030 | M |
| 2.2  | **MemBuffer + MmapBuffer unit tests.** Test read_at bounds, empty buffer, exact-size reads. | L2-PLAT-010 | S |
| 2.3  | **Checksum implementation.** Implement IRIG 106 header checksum (arithmetic sum of header words) and data checksum (when present). Unit tests against hand-computed values. | L1-FILE-040 | M |
| 2.4  | **Fuzz targets.** `cargo-fuzz` target feeding random bytes to `PacketIndex::build()`. Must not panic on any input. | L1-FILE-030 | S |
| 2.5  | **DataType round-trip tests.** `from_u8()` for every valid discriminant, boundary values (0xFF, 0x00), and unknown types. Serde serialization round-trip. | L1-STD-020 | S |
| 2.6  | **Golden file test fixture.** Create a minimal valid Ch10 file (TMATS packet + one 1553 packet + one Time packet) as a binary fixture. Test that `Ch10File::from_bytes()` opens it, indexes it, and produces a correct summary. | L1-FILE-010 | M |
| 2.7  | **Channel enumeration.** `PacketIndex::channel_ids()` and `count_for_channel()` already exist. Add `data_type_for_channel()` and `byte_count_for_channel()` for statistics. | L1-FILE-030 | S |
| 2.8  | **CI for core crate.** GitHub Actions: `cargo build`, `cargo test`, `cargo clippy`, `cargo doc`. Run on push to `crates/` path. | — | S |

### 2B — Integration Readiness (PARTIALLY BLOCKED)

| #    | Task                                         | Blocked on        | Est. |
|------|----------------------------------------------|-------------------|------|
| 2.9  | **TMATS extraction.** Read channel 0 packet data, concatenate payloads, expose raw text. (Parsing is blocked, but extraction is not.) | — | S |
| 2.10 | **Time packet RTC extraction.** Read Time channel (0x11) packets, extract the 48-bit RTC. (Full time parsing is blocked on `irig106-time`, but RTC extraction is not.) | — | S |
| 2.11 | **TMATS parsing integration.** Call `irig106-tmats` to parse channel labels, data source groupings, standard version. | `irig106-tmats` | M |
| 2.12 | **Time correlation integration.** Call `irig106-time` to build calibration points, implement `rtc_to_time()` interpolation. | `irig106-time` | L |
| 2.13 | **Tauri backend integration.** Uncomment core crate dep, replace stub returns in `lib.rs` commands with real `Ch10File` calls. | 2.1–2.10 done | M |

---

## Phase 3 — WASM Deployment

**Goal:** Run the same `irig106-studio-core` in the browser via
WebAssembly, enabling zero-install sharing of the tool.

| #    | Task                                          | Blocked on        | Est. |
|------|-----------------------------------------------|-------------------|------|
| 3.1  | **`irig106-studio-wasm` crate scaffold.** Create `crates/irig106-studio-wasm/` with `wasm-bindgen` glue. Expose: `open_file(bytes: &[u8]) → JsValue`, `read_headers(start, count) → JsValue`, `read_data(offset, len) → Uint8Array`. Thin layer over `irig106-studio-core`. | Phase 2A done | M |
| 3.2  | **WasmAdapter implementation.** Fill in `src/platform/adapter.ts` WasmAdapter to call the WASM module via `wasm-bindgen` bindings. Platform detection auto-selects when `__TAURI_INTERNALS__` is absent and WASM module is loaded. | 3.1 | M |
| 3.3  | **WASM build pipeline.** Add `wasm-pack build` to the Vite pipeline. Output `.wasm` + JS glue to `dist/`. Vite plugin or manual integration. | 3.1 | M |
| 3.4  | **File API integration.** Browser WasmAdapter uses `<input type="file">` or drag-drop to get a `File`, reads it to `ArrayBuffer`, passes to WASM `open_file()`. Stream large files in chunks if needed. | 3.2 | M |
| 3.5  | **WASM memory limits.** Test with 2 GB+ Ch10 files. If WASM 32-bit address space is a bottleneck, implement chunked reading: index packets in streaming passes, only load requested packet data on demand. | 3.4 | L |
| 3.6  | **Browser-hosted demo.** Deploy the WASM build to a static site (GitHub Pages or similar). README badge linking to live demo. | 3.3 | S |
| 3.7  | **ADR-008: WASM deployment architecture.** Document the `core → wasm → frontend` stack, memory management strategy, chunked reading decision, and browser compatibility matrix. | 3.1 | S |

### WASM Architecture (planned)

```
┌────────────────────────────────────────────────┐
│              Browser (same Vite frontend)       │
│                                                 │
│   WasmAdapter                                   │
│     │  calls via wasm-bindgen                   │
│     ▼                                           │
│   irig106-studio-wasm                           │
│     │  thin #[wasm_bindgen] glue                │
│     ▼                                           │
│   irig106-studio-core                           │
│     │  uses MemBuffer (Vec<u8> from File API)   │
│     ▼                                           │
│   PacketIndex → Ch10Summary → decoded data      │
└────────────────────────────────────────────────┘

vs. Desktop:

┌────────────────────────────────────────────────┐
│         Tauri webview (same Vite frontend)      │
│                                                 │
│   TauriAdapter                                  │
│     │  invoke() IPC                             │
│     ▼                                           │
│   src-tauri/lib.rs  (#[tauri::command])         │
│     │  direct Rust function call                │
│     ▼                                           │
│   irig106-studio-core                           │
│     │  uses MmapBuffer (zero-copy, >4 GB)       │
│     ▼                                           │
│   PacketIndex → Ch10Summary → decoded data      │
└────────────────────────────────────────────────┘
```

The key difference: Desktop uses `MmapBuffer` for zero-copy access to
multi-GB files. Browser uses `MemBuffer` with the entire file in WASM
linear memory. For files exceeding ~1.5 GB in the browser, a chunked
streaming strategy (Phase 3.5) will be needed.

---

## Phase 4 — Data Type Decoders

**Goal:** Decode raw packet payloads into structured, displayable data.

**BLOCKED on:** `irig106-decode` crate (https://github.com/TelemetryWorks/irig106-decode).
The studio will *consume* the decoders, not implement them. When the
crate is ready, integration is a matter of:
1. Adding `irig106-decode` as a dependency
2. Calling the appropriate decoder based on `DataType`
3. Mapping decoded structs to the frontend display types

| #    | Task                                          | Blocked on             | Est. |
|------|-----------------------------------------------|------------------------|------|
| 4.1  | **MIL-STD-1553 decoder integration.** Command word, status word, data words. Bus A/B. RT/SA/WC extraction. | `irig106-decode` | L |
| 4.2  | **PCM decoder integration.** Frame sync, minor/major frame structure, word extraction. | `irig106-decode` + `irig106-tmats` P-group | L |
| 4.3  | **ARINC 429 decoder integration.** Label, SDI, SSM, data field extraction. BNR/BCD/discrete formats. | `irig106-decode` | M |
| 4.4  | **Time data decoder integration.** IRIG-B, GPS, RTC, NTP format extraction from Time channel payloads. | `irig106-decode` + `irig106-time` | M |
| 4.5  | **Analog decoder integration.** Sample extraction, scaling from TMATS D-group parameters. | `irig106-decode` + `irig106-tmats` | M |
| 4.6  | **Ethernet decoder integration.** Frame extraction from Ch10 Ethernet packets. | `irig106-decode` | M |
| 4.7  | **UART decoder integration.** Serial data extraction with timing. | `irig106-decode` | S |
| 4.8  | **Video decoder integration.** MPEG-TS extraction (not video decoding — just transport stream). | `irig106-decode` | M |
| 4.9  | **Discrete decoder integration.** Bit-level extraction with TMATS D-group mapping. | `irig106-decode` + `irig106-tmats` | S |
| 4.10 | **Message decoder integration.** Generic message extraction. | `irig106-decode` | S |

---

## Phase 5 — Advanced Visualization

**Goal:** Rich, interactive data visualization beyond basic waveforms.
Blocked on Phase 4 decoders.

| #    | Task                                          | Blocked on  | Est. |
|------|-----------------------------------------------|-------------|------|
| 5.1  | **Real waveform engine.** Replace demo data with decoded channel samples. Efficient Canvas2D rendering with level-of-detail (decimation at zoom-out). | Phase 4 | L |
| 5.2  | **1553 bus monitor view.** Tabular display of command/response pairs with timing. RT address filtering. Message decoding from ICD tables. | 4.1 | L |
| 5.3  | **ARINC 429 label table.** Decoded labels with engineering units, update rate highlighting. | 4.3 | M |
| 5.4  | **Time health dashboard.** Visual timeline of time correlation quality. Gaps, jumps, drift visualization. | 4.4, 2.12 | M |
| 5.5  | **Packet density heatmap.** Time vs. channel heatmap showing packet rate. Useful for identifying recording gaps or burst traffic. | Phase 2A | M |
| 5.6  | **Search across packets.** Find packets matching criteria: channel, data type, time range, payload byte pattern. Results as a filtered packet table. | Phase 2A | L |
| 5.7  | **Annotation system.** User can mark time ranges or packets with notes. Stored as a sidecar JSON file alongside the Ch10. | — | M |
| 5.8  | **Export.** Export decoded data as CSV, MATLAB .mat, or Apache Parquet. Selected channel or time range. | Phase 4 | L |

---

## Phase 6 — Multi-Version Standard Support

**Goal:** Handle Ch10 files from IRIG 106-04 through 106-23.

| #    | Task                                          | Blocked on       | Est. |
|------|-----------------------------------------------|------------------|------|
| 6.1  | **Version detection.** Auto-detect standard version from TMATS R-1\ID or packet header version fields. | `irig106-tmats` | S |
| 6.2  | **106-07 inflection point.** Handle pre-/post-106-07 packet header differences (RTC format changes). | Spec analysis | M |
| 6.3  | **106-09 inflection point.** Handle Ethernet data type additions. | Spec analysis | S |
| 6.4  | **106-15 inflection point.** Handle recording index packet changes. | Spec analysis | M |
| 6.5  | **106-17 inflection point.** Handle CAN bus and Fibre Channel additions. | Spec analysis | S |
| 6.6  | **Cross-version test suite.** Golden file fixtures for each major version. | Test files needed | L |

---

## Milestone Summary

| Milestone | Description                        | Status     | Blocked on          |
|-----------|------------------------------------|------------|---------------------|
| **v0.1**  | UI shell complete (Phase 0)        | **Done**   | —                   |
| **v0.2**  | UI hardened + tested (Phase 1)     | **Done**   | —                   |
| **v0.3**  | Core crate reads real Ch10 (2A)    | **Done**   | —                   |
| **v0.4**  | Desktop opens real files (2B)      | **Partial** | `irig106-time`, `irig106-tmats` |
| **v0.5**  | Browser WASM build (Phase 3)       | **Scaffolded** | Verify on machine |
| **v0.6**  | Data decoders (Phase 4)            | Blocked    | `irig106-decode`    |
| **v1.0**  | Full visualization + export (5+6)  | Blocked    | Phase 4             |

---

## Current Status (updated 2026-03-28)

### Completion summary

| Phase | Status | Detail |
|-------|--------|--------|
| Phase 0 — Foundation | **Complete** | 18/18 tasks |
| Phase 1 — UI Hardening | **Complete** | 14/14 tasks, 42 Vitest tests |
| Phase 2A — Core Tests | **Complete** | 61 Rust tests, 2 fuzz targets, checksum impl |
| Phase 2B — Integration | **Partial** | 2.9 TMATS extraction, 2.10 RTC extraction, 2.13 Tauri backend — done. 2.11 and 2.12 blocked. |
| Phase 3 — WASM | **Scaffolded** | 3.1 crate, 3.2 adapter, 3.3 pipeline — done. Needs `wasm-pack build` verification. |
| Phase 4 — Decoders | **Blocked** | Waiting on `irig106-decode` crate |
| Phase 5 — Visualization | **Blocked** | Waiting on Phase 4 |
| Phase 6 — Multi-version | **Blocked** | Waiting on Phase 4 + test files |

### Dependency graph

```
Completed work:
  Phase 0 ✓ → Phase 1 ✓ → Phase 2A ✓ → Phase 2B (partial) ✓
                                      → Phase 3 (scaffolded) ✓

Blocked on TelemetryWorks crate ecosystem:
  ┌─────────────────────────────────────────────────────────────┐
  │ github.com/TelemetryWorks                                  │
  │                                                             │
  │   irig106-time   (v0.2.0, API still evolving)              │
  │     → unblocks: 2.12 time correlation, 4.4 time decoder    │
  │                                                             │
  │   irig106-tmats  (not yet started / early)                  │
  │     → unblocks: 2.11 TMATS-driven labels, 4.2 PCM setup,  │
  │                  4.5 analog scaling, 4.9 discrete mapping,  │
  │                  6.1 version detection                      │
  │                                                             │
  │   irig106-decode (not yet started)                          │
  │     → unblocks: Phase 4 entirely (1553, PCM, ARINC, etc.)  │
  │     → which unblocks: Phase 5 (real waveforms, export)      │
  │     → which unblocks: Phase 6 (multi-version)               │
  └─────────────────────────────────────────────────────────────┘
```

### What to do when coming back to this repo

**Immediate (no crate deps needed):**
1. `cargo test --workspace` — verify all 61 Rust tests pass
2. `cargo tauri dev` — open a real `.ch10` file in the desktop app
3. `npm run build:wasm` — compile WASM module, test in browser
4. `npm run test` — verify 42 frontend tests pass

**When `irig106-time` API stabilizes:**
1. Add `irig106-time = { path = "..." }` to `crates/irig106-studio-core/Cargo.toml`
2. Implement task 2.12: `TimeCorrelator` in `src/time.rs`
3. Wire into `Ch10File` — add `rtc_to_irig_time()` method
4. Wire into `PacketHeaderDto` — add absolute timestamp field
5. Update frontend `PacketHeader` type and packet table column
6. Update waveform timescale to show real IRIG time

**When `irig106-tmats` is available:**
1. Add `irig106-tmats = { path = "..." }` to core crate
2. Implement task 2.11: parse TMATS in `summary.rs` for real channel labels
3. Replace synthetic "Ch N" labels with TMATS-sourced names
4. Group channels into real data sources from TMATS R-group

**When `irig106-decode` is available:**
1. Add `irig106-decode = { path = "..." }` to core crate
2. Implement `decode.rs` module — call decoder per `DataType`
3. Each decoder returns structured data (e.g., 1553 → command/status/data words)
4. Frontend: add decoded data display in properties panel
5. Frontend: feed real decoded samples to waveform engine
6. This unlocks Phase 5 (visualization) and Phase 6 (multi-version)

### Integration trait interfaces (pre-defined)

The studio expects these interfaces from the ecosystem crates.
See `docs/INTEGRATION.md` for full details.

```rust
// From irig106-time:
fn correlate(rtc: u64, calibration: &[TimeCalibrationPoint]) -> IrigTime;

// From irig106-tmats:
fn parse(tmats_text: &str) -> TmatsMetadata;
struct TmatsMetadata {
    channels: Vec<TmatsChannel>,  // label, data_source, data_type info
    recording_info: RecordingInfo, // R-group metadata
    standard_version: String,
}

// From irig106-decode:
fn decode_packet(data_type: u8, payload: &[u8]) -> DecodedData;
enum DecodedData {
    Mil1553 { messages: Vec<Mil1553Message> },
    Pcm { samples: Vec<f64> },
    Arinc429 { words: Vec<Arinc429Word> },
    // ... etc
}
```

### Project metrics

| Metric | Value |
|--------|-------|
| Frontend (TS+CSS) | 21 files, 1,349 lines |
| Core crate (Rust) | 12 files, 2,039 lines |
| WASM crate (Rust) | 1 file, 136 lines |
| Tauri backend (Rust) | 2 files, 167 lines |
| Documentation | 14 files, 1,774 lines |
| Frontend tests | 42 (Vitest) |
| Rust tests | 61 (cargo test) |
| Fuzz targets | 2 (cargo-fuzz) |
| ADRs | 7 |
| L1 coverage | 76% (19/25) |
| **Total source** | **~5,500 lines** |
