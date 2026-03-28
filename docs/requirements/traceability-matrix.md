# IRIG106-Studio — Requirements Traceability Matrix

| Document    | IRIG106-Studio Traceability Matrix             |
|-------------|------------------------------------------------|
| Version     | 0.1.0                                          |
| Status      | Draft                                          |
| Date        | 2026-03-28                                     |

## Verification Methods

| Code | Method        | Description                                     |
|------|---------------|-------------------------------------------------|
| T    | Test          | Automated unit or integration test              |
| D    | Demonstration | Manual or automated functional demonstration    |
| I    | Inspection    | Code review or architectural review             |
| A    | Analysis      | Design analysis or document review              |

## Traceability Matrix

| L1 ID        | L1 Title                      | L2 IDs                                          | Source Files                              | Verify | Status        |
|---------------|-------------------------------|-------------------------------------------------|-------------------------------------------|--------|---------------|
| L1-APP-010    | Docked panel layout           | L2-LAYOUT-010 thru -070                         | `main.ts`, `app.css`                      | D, I   | Implemented   |
| L1-APP-020    | Keyboard navigation           | L2-UI-KEYS-010 thru -110                        | `keyboard-shortcuts.ts`, `main.ts`        | T, D   | Implemented   |
| L1-APP-030    | Drag-and-drop file open       | L2-UI-DND-010 thru -050                         | `drag-drop.ts`, `main.ts`, `app.css`      | T, D   | Implemented   |
| L1-APP-040    | Platform abstraction          | L2-PLAT-010 thru -060                           | `platform/adapter.ts`, `src-tauri/lib.rs` | I, A   | Partial       |
| L1-APP-050    | Dual deployment               | L2-DEPLOY-010 thru -040                         | `vite.config.ts`, `tauri.conf.json`       | D      | Implemented   |
| L1-FILE-010   | Open Ch10 files               | L2-FILE-010, -020, -030, -040                   | `platform/adapter.ts`, `lib.rs`           | T, D   | Partial       |
| L1-FILE-020   | Parse TMATS                   | L2-FILE-020                                     | `types/domain.ts`                         | T      | Mock only     |
| L1-FILE-030   | Build channel index           | L2-LOAD-010 thru -050                           | `main.ts`                                 | T, D   | Implemented   |
| L1-FILE-040   | Validate checksums            | L2-PROP-030                                     | `properties-panel.ts`                     | T      | Mock only     |
| L1-NAV-010    | Channel tree hierarchy        | L2-NAV-010, -020, -030                          | `channel-tree.ts`                         | D      | Implemented   |
| L1-NAV-020    | Channel selection              | L2-NAV-030, L2-PROP-010                         | `channel-tree.ts`, `properties-panel.ts`  | D      | Implemented   |
| L1-NAV-030    | Transport controls            | L2-NAV-040, L2-UI-KEYS-060 thru -080           | `toolbar.ts`, `keyboard-shortcuts.ts`     | D      | Implemented   |
| L1-NAV-040    | IRIG time display             | L2-NAV-050                                      | `types/domain.ts`, `toolbar.ts`           | T      | Implemented   |
| L1-VIS-010    | Waveform display              | L2-VIS-020, -030, -040                          | `viewport.ts`                             | D      | Demo only     |
| L1-VIS-020    | Hex dump                      | L2-VIS-050                                      | `viewport.ts`                             | D      | Implemented   |
| L1-VIS-030    | Packet table                  | L2-VIS-060                                      | `viewport.ts`                             | D      | Implemented   |
| L1-VIS-040    | TMATS text display            | L2-VIS-070                                      | `viewport.ts`                             | D      | Implemented   |
| L1-PROP-010   | Channel properties            | L2-PROP-010                                     | `properties-panel.ts`                     | D      | Implemented   |
| L1-PROP-020   | Packet properties             | L2-PROP-020, -030                               | `properties-panel.ts`                     | D      | Implemented   |
| L1-DIAG-010   | Console log                   | L2-DIAG-010, -020                               | `bottom-panel.ts`                         | D      | Implemented   |
| L1-DIAG-020   | File statistics               | L2-DIAG-030                                     | `bottom-panel.ts`                         | D      | Implemented   |
| L1-DIAG-030   | Time correlation diagnostics  | L2-DIAG-040                                     | `bottom-panel.ts`                         | D      | Mock only     |
| L1-STD-010    | IRIG 106-04 through 106-23   | *(deferred to irig106-studio-core)*              | —                                         | T, A   | Not started   |
| L1-STD-020    | All Ch10 data types           | *(deferred to irig106-studio-core)*              | —                                         | T, A   | Not started   |
| L1-STD-030    | All IRIG time formats         | *(deferred to irig106-time)*                     | —                                         | T      | Not started   |

## Coverage Summary

| Status        | L1 Count | Percentage |
|---------------|----------|------------|
| Implemented   | 14       | 56%        |
| Partial/Mock  | 7        | 28%        |
| Not started   | 4        | 16%        |
| **Total**     | **25**   | **100%**   |

## Open Items

1. **L1-STD-010/020/030** — Blocked on completion of `irig106-studio-core`, `irig106-time`, and `irig106-tmats` crates.
2. **L1-FILE-010 (real parser)** — TauriAdapter and WasmAdapter stubs need real crate integration.
3. **L1-VIS-010 (real waveform)** — Currently renders demo data; needs waveform engine backed by decoded channel data.
4. **L1-DIAG-030** — Time correlation diagnostics are static mock data; needs `irig106-time` correlation engine.
