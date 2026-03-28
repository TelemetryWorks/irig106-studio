# IRIG106-Studio — L2 Requirements

| Document    | IRIG106-Studio L2 Requirements Specification  |
|-------------|------------------------------------------------|
| Version     | 0.1.0                                          |
| Status      | Draft                                          |
| Date        | 2026-03-28                                     |
| Author      | Joey                                           |

## 1. Purpose

This document decomposes each L1 requirement into concrete L2 requirements
that map directly to implementation modules. Every L2 requirement traces
upward to exactly one L1 requirement and forward to a source file or
component.

## 2. L2 Requirements

### 2.1 Application Shell  (L1-APP-*)

#### L1-APP-010 → Docked Panel Layout

| ID              | Requirement                                                                                | Source File              | Status       |
|-----------------|--------------------------------------------------------------------------------------------|--------------------------|--------------|
| L2-LAYOUT-010   | The layout SHALL consist of: toolbar, left sidebar, center viewport, right properties panel, bottom panel, and status bar. | `src/main.ts`            | Implemented  |
| L2-LAYOUT-020   | The left sidebar SHALL be horizontally resizable via a drag handle on its right edge.       | `src/main.ts`, `app.css` | Implemented  |
| L2-LAYOUT-030   | The right properties panel SHALL be horizontally resizable via a drag handle on its left edge. | `src/main.ts`, `app.css` | Implemented  |
| L2-LAYOUT-040   | The bottom panel SHALL be vertically resizable via a drag handle on its top edge.           | `src/main.ts`, `app.css` | Implemented  |
| L2-LAYOUT-050   | Drag handles SHALL provide visual feedback (accent color highlight) during resize operations. | `app.css`                | Implemented  |
| L2-LAYOUT-060   | Panel sizes SHALL be clamped to minimum and maximum bounds to prevent layout collapse.      | `src/main.ts`            | Implemented  |
| L2-LAYOUT-070   | The viewport waveform canvas SHALL redraw when panels are resized.                          | `src/main.ts`            | Implemented  |

#### L1-APP-020 → Keyboard Navigation

| ID              | Requirement                                                                                | Source File              | Status       |
|-----------------|--------------------------------------------------------------------------------------------|--------------------------|--------------|
| L2-UI-KEYS-010  | All keyboard shortcuts SHALL be registered in a single declarative keymap.                  | `keyboard-shortcuts.ts`  | Implemented  |
| L2-UI-KEYS-020  | Shortcuts SHALL NOT fire when keyboard focus is in an input, textarea, or contenteditable element. | `keyboard-shortcuts.ts`  | Implemented  |
| L2-UI-KEYS-030  | The system SHALL abstract the modifier key (Cmd on macOS, Ctrl on Windows/Linux).           | `keyboard-shortcuts.ts`  | Implemented  |
| L2-UI-KEYS-040  | A keyboard shortcut help overlay SHALL be togglable via "?" or F1.                          | `shortcuts-overlay.ts`   | Implemented  |
| L2-UI-KEYS-050  | Ctrl/Cmd+O SHALL trigger the file open dialog.                                              | `keyboard-shortcuts.ts`  | Implemented  |
| L2-UI-KEYS-060  | Space SHALL toggle play/pause transport.                                                    | `keyboard-shortcuts.ts`  | Implemented  |
| L2-UI-KEYS-070  | Arrow Left/Right SHALL step backward/forward through packets.                               | `keyboard-shortcuts.ts`  | Implemented  |
| L2-UI-KEYS-080  | Home/End SHALL jump to the first/last packet.                                               | `keyboard-shortcuts.ts`  | Implemented  |
| L2-UI-KEYS-090  | Alt+1–4 SHALL switch viewport tabs (Waveform, Hex, Packets, TMATS).                        | `keyboard-shortcuts.ts`  | Implemented  |
| L2-UI-KEYS-100  | Alt+Shift+1–4 SHALL switch bottom panel tabs (Console, Statistics, Time Correlation, Errors). | `keyboard-shortcuts.ts`  | Implemented  |
| L2-UI-KEYS-110  | Alt+Up/Down SHALL navigate to the previous/next channel in the tree.                        | `keyboard-shortcuts.ts`  | Implemented  |

#### L1-APP-030 → Drag-and-Drop

| ID              | Requirement                                                                                | Source File              | Status       |
|-----------------|--------------------------------------------------------------------------------------------|--------------------------|--------------|
| L2-UI-DND-010   | The system SHALL accept Ch10 files (.ch10, .c10) via drag-and-drop onto the application window. | `drag-drop.ts`           | Implemented  |
| L2-UI-DND-020   | A full-window overlay SHALL appear during drag operations with clear visual feedback.       | `drag-drop.ts`, `app.css`| Implemented  |
| L2-UI-DND-030   | The system SHALL reject files with non-Ch10 extensions and display an error state for 2 seconds. | `drag-drop.ts`           | Implemented  |
| L2-UI-DND-040   | Successful drop SHALL trigger the same file load path as File > Open.                       | `src/main.ts`            | Implemented  |
| L2-UI-DND-050   | The drag event counter SHALL correctly handle nested dragenter/dragleave events.            | `drag-drop.ts`           | Implemented  |

#### L1-APP-040 → Platform Abstraction

| ID              | Requirement                                                                                | Source File              | Status       |
|-----------------|--------------------------------------------------------------------------------------------|--------------------------|--------------|
| L2-PLAT-010     | All backend calls SHALL go through the `PlatformAdapter` interface.                         | `platform/adapter.ts`    | Implemented  |
| L2-PLAT-020     | UI components SHALL NOT import `@tauri-apps/api` or `wasm-bindgen` directly.                | all `src/components/*`   | Implemented  |
| L2-PLAT-030     | The platform adapter SHALL auto-detect the runtime (Tauri vs. browser) at startup.          | `platform/adapter.ts`    | Implemented  |
| L2-PLAT-040     | A MockAdapter SHALL provide synthetic data for development and demonstration.               | `platform/adapter.ts`    | Implemented  |
| L2-PLAT-050     | The TauriAdapter SHALL map 1:1 to `#[tauri::command]` functions in `src-tauri/src/lib.rs`. | `platform/adapter.ts`    | Stub         |
| L2-PLAT-060     | The WasmAdapter SHALL call `irig106-studio-core` compiled to WASM via `wasm-bindgen`.      | `platform/adapter.ts`    | Not started  |

#### L1-APP-050 → Dual Deployment

| ID              | Requirement                                                                                | Source File              | Status       |
|-----------------|--------------------------------------------------------------------------------------------|--------------------------|--------------|
| L2-DEPLOY-010   | `npm run dev` SHALL launch the application in browser mode via Vite dev server.             | `vite.config.ts`         | Implemented  |
| L2-DEPLOY-020   | `cargo tauri dev` SHALL launch the application as a native desktop window.                  | `src-tauri/tauri.conf.json` | Implemented  |
| L2-DEPLOY-030   | The Vite build output SHALL be a self-contained bundle with no external runtime dependencies. | `vite.config.ts`         | Implemented  |
| L2-DEPLOY-040   | The Tauri window SHALL default to 1440×900 with a 960×600 minimum.                         | `src-tauri/tauri.conf.json` | Implemented  |

### 2.2 File Operations  (L1-FILE-*)

| ID              | Requirement                                                                                | Source File              | Status       |
|-----------------|--------------------------------------------------------------------------------------------|--------------------------|--------------|
| L2-FILE-010     | The PlatformAdapter.openFile() method SHALL return a `Ch10Summary` on success or null on cancel. | `platform/adapter.ts`    | Implemented  |
| L2-FILE-020     | The `Ch10Summary` type SHALL include: file info, data source list, and raw TMATS string.   | `types/domain.ts`        | Implemented  |
| L2-FILE-030     | The Tauri backend SHALL use `tauri-plugin-dialog` for the native open dialog.               | `src-tauri/src/lib.rs`   | Stub         |
| L2-FILE-040     | The Tauri backend SHALL support memory-mapped file access for Ch10 files > 1 GB.            | `src-tauri/src/lib.rs`   | Not started  |

### 2.3 File Load Path  (cross-cutting)

| ID              | Requirement                                                                                | Source File              | Status       |
|-----------------|--------------------------------------------------------------------------------------------|--------------------------|--------------|
| L2-LOAD-010     | The `loadSummary()` function SHALL be the single entry point for pushing file data to all UI components. | `src/main.ts`            | Implemented  |
| L2-LOAD-020     | File load SHALL auto-select the first channel in the first data source.                     | `src/main.ts`            | Implemented  |
| L2-LOAD-030     | File load SHALL update the status bar with file size, packet count, and duration.           | `src/main.ts`            | Implemented  |
| L2-LOAD-040     | File load SHALL set the IRIG time display in the toolbar.                                   | `src/main.ts`            | Implemented  |
| L2-LOAD-050     | File load SHALL set the IRIG 106 standard version in the toolbar and status bar.           | `src/main.ts`            | Implemented  |

### 2.4 Navigation  (L1-NAV-*)

| ID              | Requirement                                                                                | Source File              | Status       |
|-----------------|--------------------------------------------------------------------------------------------|--------------------------|--------------|
| L2-NAV-010      | The channel tree SHALL render a three-level hierarchy: file root → data sources → channels. | `channel-tree.ts`        | Implemented  |
| L2-NAV-020      | Each channel node SHALL display its channel ID and a data type badge.                       | `channel-tree.ts`        | Implemented  |
| L2-NAV-030      | Clicking a channel SHALL highlight it in the tree and update the properties panel.          | `channel-tree.ts`        | Implemented  |
| L2-NAV-040      | Transport control buttons SHALL be displayed in the toolbar.                                | `toolbar.ts`             | Implemented  |
| L2-NAV-050      | The IRIG time display SHALL use DOY:HH:MM:SS.μμμμμμ format.                                | `types/domain.ts`        | Implemented  |

### 2.5 Visualization  (L1-VIS-*)

| ID              | Requirement                                                                                | Source File              | Status       |
|-----------------|--------------------------------------------------------------------------------------------|--------------------------|--------------|
| L2-VIS-010      | The viewport SHALL provide a tab bar for switching between Waveform, Hex, Packets, and TMATS views. | `viewport.ts`            | Implemented  |
| L2-VIS-020      | The waveform view SHALL render on an HTML Canvas for performance.                           | `viewport.ts`            | Implemented  |
| L2-VIS-030      | The waveform view SHALL display a vertical playhead and time-axis labels.                   | `viewport.ts`            | Implemented  |
| L2-VIS-040      | The waveform view SHALL display a legend identifying plotted channels by color.             | `viewport.ts`            | Implemented  |
| L2-VIS-050      | The hex view SHALL display 16 bytes per row with address, hex columns, and ASCII sidebar.  | `viewport.ts`            | Implemented  |
| L2-VIS-060      | The packets view SHALL display a table with: index, offset, channel, type, length, sequence, CRC status. | `viewport.ts`            | Implemented  |
| L2-VIS-070      | The TMATS view SHALL display raw TMATS text in a monospaced font.                           | `viewport.ts`            | Implemented  |

### 2.6 Properties & Diagnostics  (L1-PROP-*, L1-DIAG-*)

| ID              | Requirement                                                                                | Source File              | Status       |
|-----------------|--------------------------------------------------------------------------------------------|--------------------------|--------------|
| L2-PROP-010     | The properties panel SHALL display: channel ID, label, data type, data source, packet count, data rate. | `properties-panel.ts`    | Implemented  |
| L2-PROP-020     | The properties panel SHALL display packet-at-cursor details: offset, sync, seq#, data length, RTC, checksum. | `properties-panel.ts`    | Implemented  |
| L2-PROP-030     | Checksum status SHALL be color-coded (green = valid, red = invalid).                        | `properties-panel.ts`    | Implemented  |
| L2-DIAG-010     | The console tab SHALL display timestamped log entries with level badges (INFO, WARN, ERROR). | `bottom-panel.ts`        | Implemented  |
| L2-DIAG-020     | The console SHALL auto-scroll to the latest entry.                                          | `bottom-panel.ts`        | Implemented  |
| L2-DIAG-030     | The statistics tab SHALL display total packets, file size, duration, and CRC error count.   | `bottom-panel.ts`        | Implemented  |
| L2-DIAG-040     | The time correlation tab SHALL display time source, format, epoch, RTC overflow status, and max RTC gap. | `bottom-panel.ts`        | Implemented  |
| L2-DIAG-050     | The errors tab SHALL filter log entries to show only WARN and ERROR level messages.          | `bottom-panel.ts`        | Implemented  |

### 2.7 Shortcuts Overlay  (L2-UI-HELP-*)

| ID              | Requirement                                                                                | Source File              | Status       |
|-----------------|--------------------------------------------------------------------------------------------|--------------------------|--------------|
| L2-UI-HELP-010  | The overlay SHALL group shortcuts by category (File, Transport, Viewport, Navigation, App). | `shortcuts-overlay.ts`   | Implemented  |
| L2-UI-HELP-020  | The overlay SHALL display platform-correct modifier key symbols (⌘ on macOS, Ctrl on Win/Linux). | `keyboard-shortcuts.ts`  | Implemented  |
| L2-UI-HELP-030  | The overlay SHALL be dismissible via Escape key or clicking outside the dialog.              | `shortcuts-overlay.ts`   | Implemented  |
| L2-UI-HELP-040  | The overlay SHALL deduplicate shortcuts that share an action (e.g. "?" and "F1").            | `keyboard-shortcuts.ts`  | Implemented  |

## 3. Status Summary

| Status        | Count |
|---------------|-------|
| Implemented   | 60    |
| Stub          | 3     |
| Not started   | 2     |
| **Total**     | **65** |
