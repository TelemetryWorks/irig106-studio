# ADR-001: Tauri v2 for Desktop Deployment

| Field         | Value                              |
|---------------|------------------------------------|
| Status        | **Accepted**                       |
| Date          | 2026-03-28                         |
| Decision by   | Joey                               |
| Traces to     | L1-APP-050, L2-DEPLOY-010 thru -040 |

## Context

IRIG106-Studio needs to run as both a browser application (zero-install,
shareable via URL) and a native desktop application (native file system
access, mmap for multi-GB Ch10 files, no WASM memory limits). The project
already has a Vite + TypeScript frontend and a Rust backend architecture
(`irig106-studio-core`), so the desktop framework must support:

1. Embedding a web frontend in a native window
2. Calling Rust functions from the frontend
3. Cross-platform builds (Windows, macOS, Linux)
4. Small binary size and low memory overhead

## Alternatives Considered

| Framework | Backend    | Bundle size | Memory | Rust interop         | Verdict              |
|-----------|------------|-------------|--------|----------------------|----------------------|
| Electron  | Node.js    | ~100 MB     | High   | FFI via napi-rs      | Rejected — bloated, wrong language for backend |
| Tauri v2  | Rust       | ~3 MB       | Low    | Native (`#[tauri::command]`) | **Selected**         |
| Wails     | Go         | ~10 MB      | Medium | None (wrong language)| Rejected — Go backend doesn't align with Rust ecosystem |
| Neutralinojs | System | ~2 MB       | Low    | None                 | Rejected — no Rust backend integration |

## Decision

Use **Tauri v2** as the desktop application framework.

## Rationale

1. **Rust-native backend.** The Tauri `#[tauri::command]` system lets
   the frontend call Rust functions with full type safety. This maps
   directly to the `PlatformAdapter` interface — each adapter method
   becomes a single `invoke()` call.

2. **Same frontend, two targets.** The Vite frontend compiles to static
   HTML/JS/CSS. In browser mode, it loads in any browser. In Tauri mode,
   it loads in the system webview. No code changes between the two.

3. **The Rust stack is already there.** `irig106-studio-core`,
   `irig106-time`, and `irig106-tmats` are all Rust crates. Tauri's
   backend IS Rust — there is no FFI boundary, no serialization overhead
   for hot paths, and `irig106-studio-core` can mmap Ch10 files directly.

4. **Tiny footprint.** A Tauri app is typically 3 MB vs. Electron's 100+
   MB. For a tool that might be distributed to hundreds of engineers on a
   flight test program, this matters.

5. **Tauri v2 supports mobile.** While not an immediate requirement,
   Tauri v2's iOS/Android support leaves the door open for tablet-based
   visualization in the field.

## Consequences

- **WebView compatibility.** Tauri uses the system webview (WebKit on
  macOS/Linux, WebView2 on Windows). The frontend must work in both
  Chromium and WebKit. This is low-risk since the app uses standard
  HTML/CSS/Canvas APIs.

- **No Node.js.** Build tools must be npm-based (Vite), but the runtime
  has no Node.js. Any functionality that would typically use Node (e.g.
  file I/O) goes through Tauri IPC to Rust instead.

- **Compile times.** Initial Rust compilation for Tauri is slow (~2-4
  minutes). Incremental builds are fast. This is acceptable for a
  desktop build step.
