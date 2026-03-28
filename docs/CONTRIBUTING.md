# Contributing to IRIG106-Studio

This guide gets a new developer from zero to a running application
and explains how to make changes effectively.

## Prerequisites

### Required

| Tool         | Version  | Purpose                     | Install                      |
|--------------|----------|-----------------------------|------------------------------|
| Node.js      | ≥ 18     | Frontend build (Vite)       | https://nodejs.org           |
| npm          | ≥ 9      | Package manager             | Comes with Node.js           |
| Rust         | ≥ 1.77   | Core crate + Tauri backend  | https://rustup.rs            |
| Git          | ≥ 2.30   | Version control             | https://git-scm.com          |

### For Desktop Builds (Tauri)

Follow the [Tauri v2 prerequisites](https://v2.tauri.app/start/prerequisites/)
for your platform:

| Platform  | Additional deps                                  |
|-----------|--------------------------------------------------|
| Linux     | `webkit2gtk-4.1`, `libappindicator3-dev`, `librsvg2-dev` |
| macOS     | Xcode Command Line Tools                         |
| Windows   | WebView2 (usually pre-installed on Win 10+), Visual Studio C++ build tools |

### Optional

| Tool            | Purpose                          |
|-----------------|----------------------------------|
| VS Code         | Recommended editor               |
| rust-analyzer   | Rust IDE support (VS Code ext.)  |
| wasm-pack       | Building the WASM target         |

## Getting Started

### 1. Clone and install

```bash
git clone <repo-url>
cd irig106-studio
npm install
```

### 2. Run the frontend (browser mode)

```bash
npm run dev
```

Opens at http://localhost:1420. The app loads with mock data
immediately — no backend required. You'll see the full panel layout
with a simulated `flight_test_042.ch10` file.

**Try these right away:**
- Press `?` to see all keyboard shortcuts
- Press `Ctrl+Shift+T` to toggle dark/light theme
- Click channels in the left sidebar
- Switch tabs with `Alt+1` through `Alt+4`
- Drag any file onto the window to see the drop overlay

### 3. Run the desktop app (Tauri)

```bash
cargo tauri dev
```

First build takes 2-4 minutes (Rust compilation). Subsequent builds
are fast (~5-10 seconds for frontend changes).

### 4. Build for production

```bash
# Browser bundle
npm run build
# Output: dist/

# Desktop binary
cargo tauri build
# Output: src-tauri/target/release/
```

### 5. Build the core crate (standalone)

```bash
cd crates/irig106-studio-core
cargo build
cargo test
```

## Project Architecture

Read `docs/PROJECT_STRUCTURE.md` for the complete file map and data
flow diagrams. Here's the 30-second version:

```
User → main.ts → PlatformAdapter → Backend (Mock/Tauri/WASM)
                                         │
                                    irig106-studio-core
                                    (Ch10 parsing + indexing)
                                         │
              loadSummary() ← Ch10Summary ┘
                    │
    ┌───────────────┼───────────────┐
    ▼               ▼               ▼
  tree          viewport         props
  (channels)    (waveform/hex)   (details)
```

**Key files to read first:**
1. `src/main.ts` — the wiring diagram
2. `src/platform/adapter.ts` — the boundary
3. `src/types/domain.ts` — the data contract

## Making Changes

### Frontend (TypeScript/CSS)

1. Edit files in `src/`
2. Vite hot-reloads automatically
3. CSS changes in `app.css` or `tokens.css` also hot-reload
4. Run `npm run build` to verify production build

### Adding a component

```bash
# 1. Create the component
touch src/components/my-panel.ts

# 2. Follow the factory pattern (see any existing component)
# 3. Wire it in main.ts
# 4. Add styles to app.css
```

See `docs/PROJECT_STRUCTURE.md` → "Adding a New Feature — Checklist"
for the complete process.

### Core crate (Rust)

```bash
cd crates/irig106-studio-core
cargo test          # run tests
cargo clippy        # lint
cargo doc --open    # generate docs
```

### Adding a keyboard shortcut

1. Add entry to `KEYMAP[]` in `src/components/keyboard-shortcuts.ts`
2. Add handler case in `main.ts` (inside `initKeyboardShortcuts` callback)
3. The help overlay updates automatically (it reads from `KEYMAP[]`)

### Adding a theme color

1. Add the variable to BOTH theme blocks in `src/styles/tokens.css`
   (`:root, [data-theme="dark"]` AND `[data-theme="light"]`)
2. Use `var(--your-variable)` in CSS or read it in Canvas via
   `getComputedStyle(document.documentElement).getPropertyValue("--your-variable")`

### Integrating a real backend crate

When `irig106-studio-core` (or `irig106-time`, `irig106-tmats`) is
ready:

1. Uncomment the dependency in `src-tauri/Cargo.toml`:
   ```toml
   irig106-studio-core = { path = "../crates/irig106-studio-core" }
   ```

2. Replace the mock returns in `src-tauri/src/lib.rs`:
   ```rust
   #[tauri::command]
   fn open_ch10_file(path: String) -> Result<Ch10Summary, String> {
       let file = irig106_studio_core::Ch10File::open(Path::new(&path))
           .map_err(|e| e.to_string())?;
       file.summary().map_err(|e| e.to_string())
   }
   ```

3. The frontend is completely untouched — the `PlatformAdapter`
   interface doesn't change.

## Documentation Standards

This project follows aerospace-grade documentation practices:

### Requirements

- **L1 requirements** are top-level SHALL statements (what the system does)
- **L2 requirements** decompose L1s into implementation-level detail
- Every L2 traces to an L1 parent AND a source file
- The traceability matrix maps L1 → L2 → source → verification method

When adding a feature, add requirements FIRST, then implement.

### ADRs (Architecture Decision Records)

Every non-obvious technical decision gets an ADR. Use the template
in `docs/adr/README.md`. ADRs answer:
- What was the context?
- What alternatives were considered?
- What was decided and why?
- What are the consequences?

### Code documentation

- Every TypeScript file starts with a JSDoc block explaining its purpose
- Every Rust module starts with `//!` doc comments
- Public Rust functions have `///` doc comments with examples
- Requirements traces appear as `L1-XXX-NNN` / `L2-YYY-NNN` comments

## Troubleshooting

### `npm run dev` fails with port in use

Vite uses port 1420 (required by Tauri). Kill the process using it:
```bash
lsof -i :1420  # find the PID
kill <PID>
```

### Tauri build fails on Linux

Install WebKit2GTK:
```bash
sudo apt install libwebkit2gtk-4.1-dev libappindicator3-dev librsvg2-dev
```

### First `cargo tauri dev` is very slow

Normal — Rust compiles all dependencies on first build (~2-4 min).
Incremental rebuilds are fast.

### Canvas waveform looks wrong after theme switch

The waveform reads CSS variables at draw time. If colors look stale,
the `viewport.resize()` call should trigger a redraw. If not, check
that `doToggleTheme()` in `main.ts` is calling `viewport.resize()`.

### TypeScript path aliases (`@/...`) not resolving

Ensure `tsconfig.json` has the paths configured AND `vite.config.ts`
has the matching `resolve.alias`. Both must agree.
