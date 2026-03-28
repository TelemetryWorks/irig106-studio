# ADR-002: Platform Abstraction Layer

| Field         | Value                              |
|---------------|------------------------------------|
| Status        | **Accepted**                       |
| Date          | 2026-03-28                         |
| Decision by   | Joey                               |
| Traces to     | L1-APP-040, L2-PLAT-010 thru -060 |

## Context

IRIG106-Studio must support three backend modes:

1. **MockAdapter** — synthetic data for development and demos
2. **TauriAdapter** — native Rust calls via Tauri IPC for desktop
3. **WasmAdapter** — `irig106-studio-core` compiled to WASM for browsers

The UI layer must not know or care which backend is active. This requires
a clean boundary between the frontend and all backend logic.

## Decision

Define a `PlatformAdapter` interface in `src/platform/adapter.ts` that
all three backends implement. The UI imports only this interface. A
factory function (`getPlatform()`) auto-detects the runtime and returns
the appropriate adapter.

```
┌───────────────────────────────────────────┐
│               UI Components               │
│   (never import tauri-apps or wasm)       │
├───────────────────────────────────────────┤
│          PlatformAdapter interface         │
│   openFile()  readPacketHeaders()         │
│   readPacketData()  onLog()               │
├────────────┬──────────────┬───────────────┤
│ MockAdapter│ TauriAdapter │ WasmAdapter   │
│ (dev/demo) │ (desktop)    │ (browser)     │
└────────────┴──────────────┴───────────────┘
```

## Rationale

1. **No import leakage.** Components in `src/components/` must never
   import `@tauri-apps/api` or `wasm-bindgen` globals. This is enforced
   by convention and will be enforced by lint rule. A single violation
   couples the UI to a specific backend and breaks the other modes.

2. **Testability.** MockAdapter provides deterministic synthetic data
   with no external dependencies. This makes the full UI exercisable in
   any browser, in CI, and in screenshots — before any real crate exists.

3. **Incremental backend integration.** The Tauri backend stubs return
   mock data today. When `irig106-studio-core` is ready, the stubs are
   replaced with real calls. The frontend is untouched. The adapter is
   the firewall.

4. **Single load path.** The `loadSummary()` function in `main.ts` is
   the only function that pushes data to UI components. Whether the
   data came from a mock, a Tauri IPC response, or a WASM call, it
   enters the UI through the same door.

## Consequences

- **Serialization overhead for Tauri.** Tauri IPC serializes arguments
  and return values as JSON. For large data (e.g. waveform sample arrays),
  this may need optimization via `tauri::ipc::Response` (binary transfer).
  This is a known Tauri pattern and does not break the abstraction.

- **Async everywhere.** All adapter methods return `Promise<T>` because
  Tauri IPC and WASM calls are inherently async. The MockAdapter fakes
  this with `delay()` calls to simulate realistic timing.

- **Feature parity is a discipline.** When adding a new backend
  capability, all three adapters must be updated (even if Mock and Wasm
  just throw "not implemented"). The interface is the contract.

## Alternatives Rejected

- **Direct Tauri imports in components.** Faster to prototype but
  creates hard coupling. Rejected because it would require conditional
  imports and `if (isTauri)` checks scattered throughout the UI.

- **Event bus / pub-sub.** More flexible but harder to trace. The
  adapter's method-call interface is easier to reason about, type-check,
  and trace to requirements.
