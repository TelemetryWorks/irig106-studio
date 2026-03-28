# irig106-studio

IRIG 106 Chapter 10 file visualization and analysis tool.

`irig106-studio` is a toolset for working with IRIG 106 telemetry and Chapter 10 recordings, covering everything from decoding and analysis to downstream workflows.

**Docked panel layout** with a clean separation between the UI layer and the backend — ready for both browser (WASM) and desktop (Tauri) deployment from a single codebase.

Releases are planned over time for:

- Browser Worker + WASM
- Server-native Rust
- Desktop

## Quick Start

### Browser-only (Vite dev server)

```bash
npm install
npm run dev
# → opens at http://localhost:1420
```

The app loads immediately with mock data. Press `?` to see all keyboard
shortcuts.

### Desktop (Tauri)

Prerequisites: [Rust toolchain](https://rustup.rs/) and
[Tauri v2 prerequisites](https://v2.tauri.app/start/prerequisites/).

```bash
npm install
cargo tauri dev
```

## Keyboard Shortcuts

|Action|Shortcut (Win/Linux)|Shortcut (macOS)|
|-|-|-|
|Open file|Ctrl+O|⌘O|
|Play / Pause|Space|Space|
|Jump to first packet|Home|Home|
|Jump to last packet|End|End|
|Step backward|←|←|
|Step forward|→|→|
|Waveform tab|Alt+1|⌥1|
|Hex tab|Alt+2|⌥2|
|Packets tab|Alt+3|⌥3|
|TMATS tab|Alt+4|⌥4|
|Console tab|Alt+Shift+1|⌥⇧1|
|Statistics tab|Alt+Shift+2|⌥⇧2|
|Time correlation tab|Alt+Shift+3|⌥⇧3|
|Errors tab|Alt+Shift+4|⌥⇧4|
|Previous channel|Alt+↑|⌥↑|
|Next channel|Alt+↓|⌥↓|
|Show shortcuts help|? or F1|? or F1|

## Drag-and-Drop

Drag a `.ch10` or `.c10` file onto the application window to open it.
A full-screen overlay provides visual feedback. Non-Ch10 files are
rejected with an error indicator.

## Architecture

```
irig106-studio/
├── index.html                  # Vite entry point
├── src/
│   ├── main.ts                 # App bootstrap — wires all components
│   ├── types/
│   │   └── domain.ts           # Shared domain types (ADR-006)
│   ├── platform/
│   │   └── adapter.ts          # Platform abstraction layer (ADR-002)
│   ├── components/
│   │   ├── toolbar.ts          # Top bar: menus, transport, time
│   │   ├── channel-tree.ts     # Left sidebar: Ch10 channel hierarchy
│   │   ├── viewport.ts         # Center: waveform, hex, packets, TMATS
│   │   ├── bottom-panel.ts     # Bottom: console, stats, time corr., errors
│   │   ├── properties-panel.ts # Right sidebar: channel \& packet props
│   │   ├── statusbar.ts        # Bottom strip: file stats, status
│   │   ├── keyboard-shortcuts.ts # Centralized keymap (ADR-005)
│   │   ├── shortcuts-overlay.ts  # Help overlay (? / F1)
│   │   └── drag-drop.ts        # Drag-and-drop file open
│   └── styles/
│       ├── reset.css            # Minimal reset
│       ├── tokens.css           # Design tokens (ADR-003)
│       └── app.css              # Layout + component styles
├── src-tauri/                   # Tauri v2 desktop backend (ADR-001)
│   ├── tauri.conf.json
│   ├── Cargo.toml
│   └── src/
│       ├── main.rs              # Desktop entry point
│       └── lib.rs               # Tauri commands (stubs → real crates)
├── docs/
│   ├── requirements/
│   │   ├── L1-requirements.md   # 25 top-level SHALL statements
│   │   ├── L2-requirements.md   # 65 decomposed requirements
│   │   └── traceability-matrix.md
│   └── adr/
│       ├── README.md            # ADR index + template
│       ├── ADR-001-tauri-v2.md
│       ├── ADR-002-platform-abstraction.md
│       ├── ADR-003-dark-theme.md
│       ├── ADR-004-vanilla-typescript.md
│       ├── ADR-005-keyboard-shortcuts.md
│       └── ADR-006-domain-types.md
├── vite.config.ts
├── tsconfig.json
└── package.json
```

### The Platform Boundary

The UI **never** imports `@tauri-apps/api` or `wasm-bindgen` directly.
All backend calls go through `src/platform/adapter.ts` (see \[ADR-002]):

```
┌──────────────────────────────────────────────────┐
│                   UI Components                   │
│   toolbar · channel-tree · viewport · props       │
│   bottom-panel · statusbar · keyboard-shortcuts   │
├──────────────────────────────────────────────────┤
│              PlatformAdapter interface             │
│   openFile() · readPacketHeaders() · onLog()      │
├──────────┬────────────────────┬──────────────────┤
│  Mock    │   TauriAdapter     │   WasmAdapter     │
│  (dev)   │   (desktop IPC)    │   (browser WASM)  │
└──────────┴────────────────────┴──────────────────┘
```

### Wiring in Real Crates

1. Uncomment the dependency lines in `src-tauri/Cargo.toml`
2. Replace the mock returns in `lib.rs` commands with real calls
3. The frontend doesn't change at all

## Documentation

### Requirements

The project follows aerospace-grade requirements traceability:

* [**L1 Requirements**](docs/requirements/L1-requirements.md) — 25
top-level SHALL statements covering the application shell, file
operations, navigation, visualization, properties, diagnostics,
and standards compliance.
* [**L2 Requirements**](docs/requirements/L2-requirements.md) — 65
decomposed requirements, each traced to a source file and tagged
with implementation status.
* [**Traceability Matrix**](docs/requirements/traceability-matrix.md) —
L1 → L2 → source file → verification method mapping with coverage
summary.

### Architecture Decision Records (ADRs)

Every significant design decision is recorded as an ADR:

|ADR|Title|
|-|-|
|001|Tauri v2 for desktop deployment|
|002|Platform abstraction layer|
|003|Dark IDE theme (Omniverse aesthetic)|
|004|Vanilla TypeScript component architecture|
|005|Centralized keyboard shortcut system|
|006|Domain type system as UI–backend contract|

See [docs/adr/README.md](docs/adr/README.md) for the full index and
template for new ADRs.

## Project Status (v0.1.0)

|Area|Status|Notes|
|-|-|-|
|Panel layout|Complete|Resizable sidebar, viewport, props, bottom panel|
|Keyboard shortcuts|Complete|17 bindings, help overlay, cross-platform mods|
|Drag-and-drop|Complete|Full overlay, extension validation, error state|
|Channel tree|Complete|Hierarchical, clickable, data-type badges|
|Waveform view|Demo only|Canvas2D rendering, needs real decoded data|
|Hex view|Complete|Address + hex + ASCII columns|
|Packet table|Complete|Sortable columns with CRC status|
|TMATS view|Complete|Monospaced raw text display|
|Properties panel|Complete|Channel + packet-at-cursor properties|
|Console / diagnostics|Complete|4-tab bottom panel with log, stats, time, errors|
|Platform abstraction|Complete|Mock adapter active; Tauri/WASM stubs ready|
|Tauri desktop build|Scaffolded|Compiles with stubs; needs real crate backends|
|WASM browser build|Not started|Waiting on irig106-studio-core WASM target|
|Requirements docs|Complete|25 L1 + 65 L2 + traceability matrix|
|ADRs|Complete|6 accepted decisions documented|

### Blocked On

* `irig106-studio-core` — Ch10 file parser, packet index, channel data decoder
* `irig106-time` — IRIG time parsing and RTC correlation
* `irig106-tmats` — TMATS (Chapter 9) parser

Once these crates are ready, the integration path is:

1. Uncomment Cargo.toml dependencies
2. Replace stub returns in `lib.rs`
3. Frontend is untouched
