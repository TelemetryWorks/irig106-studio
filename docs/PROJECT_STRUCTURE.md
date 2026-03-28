# IRIG106-Studio — Project Structure

This document maps every file in the project, explains what it does,
and shows how the pieces connect. If you're new to the codebase, start
here.

## Directory Layout

```
irig106-studio/
│
├── Cargo.toml                          Rust workspace (core + tauri)
├── index.html                          Entry point — loads Vite + app
├── vite.config.ts                      Vite build config (dev server, Tauri, tests)
├── tsconfig.json                       TypeScript config (strict, path aliases)
├── tsconfig.node.json                  TypeScript config for Vite config file
├── package.json                        npm deps + scripts (dev, build, test, wasm)
├── eslint.config.js                    ESLint flat config (TypeScript strict)
├── .prettierrc                         Prettier formatting rules
├── .gitignore
│
├── src/                                ── FRONTEND (TypeScript + CSS) ──
│   │
│   ├── main.ts                         App bootstrap — creates all components,
│   │                                   wires them to the platform adapter,
│   │                                   registers keyboard shortcuts and drag-drop.
│   │                                   THIS IS THE WIRING DIAGRAM.
│   │
│   ├── types/
│   │   └── domain.ts                   Shared domain types (Ch10FileInfo, Channel,
│   │                                   PacketHeader, DataType enum, IrigTime, etc.)
│   │                                   THE CONTRACT between UI and backend.
│   │                                   [ADR-006]
│   │
│   ├── platform/
│   │   └── adapter.ts                  Platform abstraction layer — the ONE boundary.
│   │                                   Defines PlatformAdapter interface.
│   │                                   Contains MockAdapter (active), TauriAdapter (stub),
│   │                                   WasmAdapter (future).
│   │                                   [ADR-002]
│   │
│   ├── components/
│   │   ├── toolbar.ts                  Top bar: brand, menus, transport controls,
│   │   │                               IRIG time display, theme toggle, version.
│   │   │
│   │   ├── channel-tree.ts             Left sidebar: file → data sources → channels.
│   │   │                               Click a channel → properties panel updates.
│   │   │
│   │   ├── viewport.ts                 Center: 4 tabbed views (Waveform, Hex,
│   │   │                               Packets, TMATS). Waveform uses Canvas2D.
│   │   │
│   │   ├── bottom-panel.ts             Bottom: 4 tabbed views (Console, Statistics,
│   │   │                               Time Correlation, Errors).
│   │   │
│   │   ├── properties-panel.ts         Right sidebar: selected channel props,
│   │   │                               packet-at-cursor details, checksum status.
│   │   │
│   │   ├── statusbar.ts               Bottom strip: ready/loading/error indicator,
│   │   │                               packet count, duration, file size, version.
│   │   │
│   │   ├── keyboard-shortcuts.ts       Centralized keymap (declarative array),
│   │   │                               single document-level listener, modifier
│   │   │                               abstraction (Cmd/Ctrl). [ADR-005]
│   │   │
│   │   ├── shortcuts-overlay.ts        Help modal (? / F1): shows all shortcuts
│   │   │                               grouped by category, platform-correct labels.
│   │   │
│   │   ├── drag-drop.ts               Full-window drop zone for .ch10/.c10 files.
│   │   │                               Visual overlay with valid/invalid states.
│   │   │
│   │   └── theme-switcher.ts           Dark/light theme toggle. Persists to
│   │                                   localStorage. Applies data-theme attribute.
│   │
│   └── styles/
│       ├── tokens.css                  Design tokens: two themes (dark Omniverse,
│       │                               light Isaac Sim), data type badge colors,
│       │                               typography, spacing, layout constants.
│       │                               [ADR-003]
│       │
│       ├── app.css                     Full layout (toolbar, panels, resize handles),
│       │                               all component styles (tree, badges, props,
│       │                               console, waveform, overlays).
│       │
│       └── reset.css                   Minimal CSS reset, scrollbar styling.
│
├── src-tauri/                          ── DESKTOP BACKEND (Rust + Tauri v2) ──
│   │                                   [ADR-001]
│   │
│   ├── tauri.conf.json                 Tauri config: window size, CSP, build commands.
│   ├── Cargo.toml                      Rust dependencies (tauri, plugins, core crate).
│   ├── build.rs                        Tauri build script.
│   ├── capabilities/
│   │   └── default.json                Default Tauri capability set for desktop commands.
│   ├── icons/                          App icons used by tauri-build and desktop bundles.
│   ├── gen/
│   │   └── schemas/                    Generated Tauri schemas/capability metadata.
│   └── src/
│       ├── main.rs                     Desktop entry point (windows_subsystem).
│       └── lib.rs                      #[tauri::command] functions:
│                                       open_ch10_file(), read_packet_headers(),
│                                       read_packet_data(), get_tmats().
│                                       Holds the open Ch10File in app state
│                                       and maps IPC 1:1 to PlatformAdapter.
│
├── crates/                             ── RUST CRATES ──
│   ├── irig106-studio-core/            Core library (native + wasm32)
│   │   ├── Cargo.toml
│   │   ├── src/
│   │   │   ├── lib.rs                  Crate root — re-exports public API.
│   │   │   ├── types.rs                Domain types (Rust mirror of domain.ts).
│   │   │   ├── error.rs                StudioError enum — all error cases.
│   │   │   ├── io.rs                   FileBuffer trait + MmapBuffer + MemBuffer.
│   │   │   ├── file.rs                 Ch10File — open, index, summary, read,
│   │   │   │                           extract_tmats(), extract_time_rtcs().
│   │   │   ├── index.rs                PacketIndex — sync scan, random access.
│   │   │   ├── summary.rs              Ch10Summary — TMATS extraction baked in.
│   │   │   ├── checksum.rs             8/16/32-bit checksums + header validation.
│   │   │   ├── decode.rs               Data type decoders — stubs.
│   │   │   ├── time.rs                 TimeCorrelator — stub.
│   │   │   ├── tmats.rs                TmatsMetadata — stub.
│   │   │   └── tests.rs                61 unit tests + golden file.
│   │   └── fuzz/
│   │       ├── Cargo.toml
│   │       └── fuzz_targets/
│   │           ├── fuzz_packet_index.rs   Arbitrary bytes → PacketIndex.
│   │           └── fuzz_checksum.rs       Arbitrary bytes → checksum fns.
│   │
│   └── irig106-studio-wasm/            WASM bindings (ADR-008)
│       ├── Cargo.toml
│       └── src/
│           └── lib.rs                  StudioSession #[wasm_bindgen] glue.
│                                       Build: wasm-pack build --target web
│
├── src/wasm/                           Generated WASM glue output (gitignored).
│                                       Created by npm run build:wasm / wasm-pack:
│                                       .wasm binary + JS loader used by WasmAdapter.
│
├── docs/                               ── DOCUMENTATION ──
│   │
│   ├── requirements/
│   │   ├── L1-requirements.md          25 top-level SHALL statements.
│   │   ├── L2-requirements.md          65+ decomposed requirements with status.
│   │   └── traceability-matrix.md      L1 → L2 → source → verification mapping.
│   │
│   ├── adr/
│   │   ├── README.md                   ADR index + template.
│   │   ├── ADR-001-tauri-v2.md         Desktop framework selection.
│   │   ├── ADR-002-platform-abstraction.md  UI–backend boundary.
│   │   ├── ADR-003-dark-theme.md       Omniverse aesthetic + light theme.
│   │   ├── ADR-004-vanilla-typescript.md  No framework, factory-function components.
│   │   ├── ADR-005-keyboard-shortcuts.md  Centralized keymap system.
│   │   ├── ADR-006-domain-types.md     Domain types as the contract.
│   │   └── ADR-008-wasm-architecture.md WASM deployment stack.
│   │
│   ├── implementation/
│   │   ├── README.md                   Implementation-series index.
│   │   └── 01-08-*.md                  Design/build notes from the browser-shell
│   │                                   and integration planning phases.
│   ├── images/                         Reference screenshots and diagrams used by docs.
│   ├── architecture.md                 High-level architecture overview.
│   ├── implementation-plan.md          Original implementation sequencing notes.
│   ├── INTEGRATION.md                  How external TelemetryWorks crates plug in:
│   │                                   irig106-time, irig106-tmats, irig106-decode.
│   ├── PROJECT_STRUCTURE.md            ← YOU ARE HERE
│   └── CONTRIBUTING.md                 Onboarding guide for new developers.
│
└── dist/                               Vite build output (gitignored).
```

## Data Flow

```
User action (click, keyboard, drag-drop)
        │
        ▼
    main.ts                     ← dispatches to the correct component
        │
        ▼
    PlatformAdapter.method()    ← e.g. openFile(), readPacketHeaders()
        │
        ├── MockAdapter          → returns synthetic data (dev mode)
        ├── TauriAdapter         → invoke("command_name", args) → Rust IPC
        └── WasmAdapter          → wasm-bindgen call → irig106-studio-core
                │
                ▼
        irig106-studio-core      ← Ch10File.open() → PacketIndex → Ch10Summary
                │
                ▼
    loadSummary(summary)         ← THE SINGLE ENTRY POINT for all data into UI
        │
        ├── tree.setSummary()
        ├── viewport.setSummary()
        ├── statusbar.setFileInfo()
        ├── toolbar.setVersion()
        └── toolbar.setTime()
```

## Ecosystem Boundary

The studio is a consumer of the broader TelemetryWorks crate ecosystem:

- `irig106-studio-core` owns file access, indexing, summaries, and shared domain types
- `irig106-studio-wasm` is a thin browser-facing binding layer over the core crate
- `src-tauri` is a thin desktop-facing IPC layer over the core crate
- future crates like `irig106-time`, `irig106-tmats`, and `irig106-decode`
  should plug into `irig106-studio-core`, not directly into the frontend

That boundary matters because the frontend should only know about
`domain.ts` and `PlatformAdapter`, never about parser internals or
spec-level decoder implementation details.

## Component API Pattern

Every component follows the same factory-function pattern [ADR-004]:

```typescript
export function createFoo(
  container: HTMLElement,         // DOM element to render into
  callbacks: FooCallbacks         // events flowing OUT (clicks, selections)
): {
  setData(data: SomeType): void;  // data flowing IN (updates from backend)
  clear(): void;                  // reset state
} {
  container.innerHTML = `...`;    // render initial DOM
  // bind events
  // return update API
}
```

Components are created in `main.ts`, which is the only file that
knows about all components simultaneously. Components never import
each other.

## Theme System

Themes are controlled by `[data-theme]` on `<html>`:

```
tokens.css defines two rule sets:
  :root, [data-theme="dark"]  { --c-surface: #222226; ... }
  [data-theme="light"]        { --c-surface: #f2f0ea; ... }

theme-switcher.ts:
  initTheme()    → reads localStorage, applies attribute
  toggleTheme()  → flips attribute, persists, returns new theme

toolbar.ts:
  ◐ button → calls onThemeToggle callback → main.ts → doToggleTheme()

Keyboard: Ctrl+Shift+T toggles theme.
```

All colors in CSS and Canvas use CSS variables. When the data-theme
attribute changes, everything updates instantly — no page reload.

## Adding a New Feature — Checklist

1. **Define the requirement** — Add an L2 entry in `L2-requirements.md`
   with a parent L1 trace, source file, and status.

2. **Update the domain types** — If new data is needed, add it to
   `src/types/domain.ts` AND `crates/irig106-studio-core/src/types.rs`.

3. **Update the platform adapter** — Add the method to the
   `PlatformAdapter` interface, then implement it in MockAdapter
   (with synthetic data), TauriAdapter (stub or real), and
   WasmAdapter (stub or real).

4. **Build the component** — Create `src/components/your-thing.ts`
   using the factory-function pattern. No framework imports.

5. **Wire it in main.ts** — Create the component, connect its
   callbacks, feed it data from `loadSummary()` or wherever.

6. **Add keyboard shortcut** — Add an entry to `KEYMAP[]` in
   `keyboard-shortcuts.ts`, add a handler case in `main.ts`.

7. **Add CSS** — Put styles in `app.css`. Use CSS variables from
   `tokens.css` — never hardcode colors.

8. **Update traceability** — Update the traceability matrix with
   the new L2 → source → verification mapping.

9. **Write an ADR** — If the decision was non-obvious, write one
   in `docs/adr/`.
