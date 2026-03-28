# IRIG106-Studio - Roadmap

| Document | IRIG106-Studio Development Roadmap |
|----------|------------------------------------|
| Version  | 0.1.0                              |
| Date     | 2026-03-28                         |
| Author   | Joey                               |

## Overview

This roadmap is organized into phases. Each phase can be worked mostly
independently, with later phases building on earlier ones. Tasks marked
**BLOCKED** depend on external TelemetryWorks crates or missing spec-level
decoder work.

---

## Phase 0 - Foundation (COMPLETE)

The initial UI shell and project scaffolding are done.

| #    | Task | Status |
|------|------|--------|
| 0.1  | Isaac Sim-style docked panel layout | Done |
| 0.2  | Toolbar with transport controls | Done |
| 0.3  | Channel tree sidebar | Done |
| 0.4  | Viewport with 4 tabbed views | Done |
| 0.5  | Properties panel (channel + packet) | Done |
| 0.6  | Bottom panel (console, stats, time, errors) | Done |
| 0.7  | Status bar | Done |
| 0.8  | Platform abstraction layer (ADR-002) | Done |
| 0.9  | Mock adapter with synthetic data | Done |
| 0.10 | Tauri v2 desktop scaffold (ADR-001) | Done |
| 0.11 | Keyboard shortcuts | Done |
| 0.12 | Drag-and-drop file open | Done |
| 0.13 | Dark/light theme switcher | Done |
| 0.14 | Domain type system (ADR-006) | Done |
| 0.15 | `irig106-studio-core` crate scaffold | Done |
| 0.16 | Requirements docs | Done |
| 0.17 | Architecture Decision Records | Done |
| 0.18 | Project structure + onboarding docs | Done |

---

## Phase 1 - UI Hardening and Testing

**Goal:** Make the frontend production-ready. No backend dependencies.

### 1A - UI Polish

| #    | Task | Traces to | Est. |
|------|------|-----------|------|
| 1.1  | Welcome/empty state instead of auto-open mock startup | L1-APP-010 | S |
| 1.2  | Panel collapse/expand with persisted state | L1-APP-010 | M |
| 1.3  | Channel tree search/filter | L1-NAV-010 | S |
| 1.4  | Context menus for channel tree and packet rows | L1-NAV-020 | M |
| 1.5  | Persistent layout state | L1-APP-010 | S |
| 1.6  | TMATS syntax highlighting | L1-VIS-040 | S |
| 1.7  | Hex view interactivity | L1-VIS-020 | M |
| 1.8  | Waveform zoom and pan | L1-VIS-010 | L |
| 1.9  | Multi-channel waveform overlay | L1-VIS-010 | L |
| 1.10 | Packet table virtual scrolling | L1-VIS-030 | L |

### 1B - Testing and CI

| #    | Task | Traces to | Est. |
|------|------|-----------|------|
| 1.11 | Vitest setup | - | S |
| 1.12 | ESLint + Prettier config | - | S |
| 1.13 | GitHub Actions frontend CI | - | S |
| 1.14 | Accessibility pass | L1-APP-020 | M |

### 1C - Documentation

| #    | Task | Est. |
|------|------|------|
| 1.15 | ADR-007 virtual scrolling strategy | S |
| 1.16 | Update L2 requirements | S |
| 1.17 | Update traceability matrix | S |

---

## Phase 2 - Core Crate Completion

**Goal:** Make `irig106-studio-core` a real, tested Ch10 reader.

### 2A - Core Functionality (UNBLOCKED)

| #    | Task | Traces to | Est. |
|------|------|-----------|------|
| 2.1  | PacketIndex unit tests on synthetic Ch10 data | L1-FILE-030 | M |
| 2.2  | MemBuffer + MmapBuffer unit tests | L2-PLAT-010 | S |
| 2.3  | Checksum implementation | L1-FILE-040 | M |
| 2.4  | Fuzz targets for packet index / parser safety | L1-FILE-030 | S |
| 2.5  | DataType round-trip tests | L1-STD-020 | S |
| 2.6  | Golden file test fixture | L1-FILE-010 | M |
| 2.7  | Channel enumeration helpers | L1-FILE-030 | S |
| 2.8  | CI for the core crate | - | S |
| 2.9  | Core benchmarks: index build, header reads, TMATS extraction, large synthetic scans | - | M |

### 2B - Integration Readiness (PARTIALLY BLOCKED)

| #    | Task | Blocked on | Est. |
|------|------|------------|------|
| 2.10 | TMATS extraction | - | S |
| 2.11 | Time packet RTC extraction | - | S |
| 2.12 | TMATS parsing integration | `irig106-tmats` | M |
| 2.13 | Time correlation integration | `irig106-time` | L |
| 2.14 | Tauri backend integration | 2.1-2.11 done | M |

---

## Phase 3 - WASM Deployment

**Goal:** Run `irig106-studio-core` in the browser via WebAssembly.

| #    | Task | Blocked on | Est. |
|------|------|------------|------|
| 3.1  | `irig106-studio-wasm` crate scaffold | Phase 2A done | M |
| 3.2  | WasmAdapter implementation | 3.1 | M |
| 3.3  | WASM build pipeline via `wasm-pack` | 3.1 | M |
| 3.4  | Browser File API integration | 3.2 | M |
| 3.5  | WASM memory-limit testing and chunked-reading decision | 3.4 | L |
| 3.6  | Worker-backed WASM configuration for alternate browser execution mode | 3.4 | M |
| 3.7  | Browser-hosted demo | 3.3 | S |
| 3.8  | ADR-008 WASM deployment architecture | 3.1 | S |
| 3.9  | WASM/browser benchmarks: load time, index time, memory, packet-table throughput, worker vs main-thread behavior | 3.5, 3.6 | M |

### WASM Architecture

```text
Browser JS (same Vite frontend)
    |
    v
WasmAdapter
    |
    v
irig106-studio-wasm
    |
    v
irig106-studio-core
    |
    v
PacketIndex -> Ch10Summary -> decoded data

Desktop path:

TauriAdapter
    |
    v
src-tauri/lib.rs
    |
    v
irig106-studio-core
```

Desktop uses `MmapBuffer` for zero-copy access to large files. Browser WASM
uses `MemBuffer` with file bytes copied into linear memory. If a worker-backed
configuration is adopted, it should remain a separately testable execution path,
not an implicit replacement for the main-thread path.

---

## Phase 4 - Data Type Decoders

**Goal:** Decode raw payloads into structured, displayable data.

**BLOCKED on:** `irig106-decode` plus supporting ecosystem crates.

| #    | Task | Blocked on | Est. |
|------|------|------------|------|
| 4.1  | MIL-STD-1553 decoder integration | `irig106-decode` | L |
| 4.2  | PCM decoder integration | `irig106-decode` + `irig106-tmats` | L |
| 4.3  | ARINC 429 decoder integration | `irig106-decode` | M |
| 4.4  | Time data decoder integration | `irig106-decode` + `irig106-time` | M |
| 4.5  | Analog decoder integration | `irig106-decode` + `irig106-tmats` | M |
| 4.6  | Ethernet decoder integration | `irig106-decode` | M |
| 4.7  | UART decoder integration | `irig106-decode` | S |
| 4.8  | Video decoder integration | `irig106-decode` | M |
| 4.9  | Discrete decoder integration | `irig106-decode` + `irig106-tmats` | S |
| 4.10 | Message decoder integration | `irig106-decode` | S |

---

## Phase 5 - Advanced Visualization

**Goal:** Rich interactive data visualization beyond demo waveforms.

| #    | Task | Blocked on | Est. |
|------|------|------------|------|
| 5.1  | Real waveform engine backed by decoded samples | Phase 4 | L |
| 5.2  | 1553 bus monitor view | 4.1 | L |
| 5.3  | ARINC 429 label table | 4.3 | M |
| 5.4  | Time health dashboard | 4.4, 2.13 | M |
| 5.5  | Packet density heatmap | Phase 2A | M |
| 5.6  | Search across packets | Phase 2A | L |
| 5.7  | Annotation system | - | M |
| 5.8  | Export (CSV, MAT, Parquet) | Phase 4 | L |

---

## Phase 6 - Multi-Version Standard Support

**Goal:** Handle Ch10 files from IRIG 106-04 through 106-23.

| #    | Task | Blocked on | Est. |
|------|------|------------|------|
| 6.1  | Version detection | `irig106-tmats` | S |
| 6.2  | 106-07 inflection point | Spec analysis | M |
| 6.3  | 106-09 inflection point | Spec analysis | S |
| 6.4  | 106-15 inflection point | Spec analysis | M |
| 6.5  | 106-17 inflection point | Spec analysis | S |
| 6.6  | Cross-version test suite | Test files needed | L |

---

## Milestone Summary

| Milestone | Description | Status | Blocked on |
|-----------|-------------|--------|------------|
| **v0.1**  | UI shell complete (Phase 0) | **Done** | - |
| **v0.2**  | UI hardened + tested (Phase 1) | **Done** | - |
| **v0.3**  | Core crate reads real Ch10 (Phase 2A) | **Done** | - |
| **v0.4**  | Desktop opens real files (Phase 2B) | **Partial** | `irig106-time`, `irig106-tmats` |
| **v0.5**  | Browser WASM build (Phase 3) | **Scaffolded** | Verify on machine + worker config |
| **v0.6**  | Data decoders (Phase 4) | Blocked | `irig106-decode` |
| **v1.0**  | Full visualization + export (Phases 5 + 6) | Blocked | Phase 4 |

---

## Current Status (updated 2026-03-28)

### Completion Summary

| Phase | Status | Detail |
|-------|--------|--------|
| Phase 0 - Foundation | **Complete** | 18/18 tasks |
| Phase 1 - UI Hardening | **Complete** | 14/14 tasks, 42 Vitest tests |
| Phase 2A - Core Tests | **Complete** | 61 Rust tests, 2 fuzz targets, checksum implementation. Benchmarks still planned. |
| Phase 2B - Integration | **Partial** | 2.10 TMATS extraction, 2.11 RTC extraction, 2.14 Tauri backend done. 2.12 and 2.13 blocked. |
| Phase 3 - WASM | **Scaffolded** | 3.1 crate, 3.2 adapter, 3.3 pipeline done. Needs `wasm-pack build` verification, worker config, and benchmarks. |
| Phase 4 - Decoders | **Blocked** | Waiting on `irig106-decode` |
| Phase 5 - Visualization | **Blocked** | Waiting on Phase 4 |
| Phase 6 - Multi-version | **Blocked** | Waiting on Phase 4 + test files |

### Dependency Graph

```text
Completed:
  Phase 0 -> Phase 1 -> Phase 2A -> Phase 2B (partial)
                                 -> Phase 3 (scaffolded)

Blocked on TelemetryWorks crate ecosystem:
  irig106-time
    -> unblocks 2.13 and 4.4

  irig106-tmats
    -> unblocks 2.12, 4.2, 4.5, 4.9, 6.1

  irig106-decode
    -> unblocks Phase 4
    -> which unblocks Phase 5 and Phase 6
```

### What To Do When Coming Back To This Repo

**Immediate (no crate deps needed):**
1. `cargo test --workspace` - verify all Rust tests pass
2. `cargo tauri dev` - open a real `.ch10` file in the desktop app
3. `npm run build:wasm` - compile the WASM module and test in browser mode
4. `npm run test` - verify frontend tests pass
5. add benchmark harnesses for core and WASM/browser execution before performance-sensitive refactors
6. define a worker-enabled WASM test configuration so browser execution modes can be compared directly

**When `irig106-time` stabilizes:**
1. Add the dependency to `crates/irig106-studio-core/Cargo.toml`
2. Implement `TimeCorrelator` in `src/time.rs`
3. Add `rtc_to_irig_time()` wiring in the core crate
4. Flow absolute timestamps through Tauri/WASM DTOs and the frontend

**When `irig106-tmats` is available:**
1. Add the dependency to the core crate
2. Replace synthetic labels in `summary.rs` with parsed TMATS names
3. Group channels into real data sources from TMATS metadata

**When `irig106-decode` is available:**
1. Add the dependency to the core crate
2. Replace decode stubs with real packet decoding
3. Flow decoded payloads into properties, tables, and waveform views

### Integration Trait Interfaces (Pre-defined)

See `docs/INTEGRATION.md` for the full integration plan. The studio expects:

```rust
// From irig106-time:
fn correlate(rtc: u64, calibration: &[TimeCalibrationPoint]) -> IrigTime;

// From irig106-tmats:
fn parse(tmats_text: &str) -> TmatsMetadata;

// From irig106-decode:
fn decode_packet(data_type: u8, payload: &[u8]) -> DecodedData;
```

### Project Metrics

| Metric | Value |
|--------|-------|
| Frontend tests | 42 (Vitest) |
| Rust tests | 61 (`cargo test`) |
| Fuzz targets | 2 (`cargo-fuzz`) |
| ADRs | 7 |
| L1 coverage | 76% (19/25) |

