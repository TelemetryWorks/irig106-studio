# ADR-004: Vanilla TypeScript Component Architecture

| Field         | Value                              |
|---------------|------------------------------------|
| Status        | **Accepted**                       |
| Date          | 2026-03-28                         |
| Decision by   | Joey                               |
| Traces to     | L1-APP-010, L1-APP-040             |

## Context

The IRIG106-Studio frontend needs a component model — a way to create,
compose, and update discrete UI panels (toolbar, channel tree, viewport,
properties, console). The question is whether to use a framework (React,
Vue, Svelte, Solid) or plain TypeScript.

## Alternatives Considered

| Option          | Bundle size | Learning curve | WASM interop | Tauri compat | Verdict         |
|-----------------|-------------|----------------|--------------|--------------|-----------------|
| React           | +45 KB      | Familiar       | Good         | Good         | Rejected        |
| Vue 3           | +33 KB      | Moderate       | Good         | Good         | Rejected        |
| Svelte 5        | +8 KB       | Low            | Good         | Good         | Considered      |
| Solid           | +7 KB       | Low            | Good         | Good         | Considered      |
| **Vanilla TS**  | **0 KB**    | **None**       | **Native**   | **Native**   | **Selected**    |

## Decision

Use vanilla TypeScript with a factory-function component pattern. Each
component is a function that receives a container `HTMLElement`, mutates
its DOM, and returns an API object with typed update methods.

```typescript
// Pattern used by every component
export function createFoo(container: HTMLElement, callbacks: FooCallbacks): {
  setSomeData(data: Data): void;
  clear(): void;
} {
  container.innerHTML = `...`;
  // bind events, return update API
  return { setSomeData, clear };
}
```

## Rationale

1. **Zero runtime overhead.** The entire app bundles to ~34 KB gzipped.
   A React dependency alone would add 45 KB. For a tool that may run
   inside a Tauri webview on constrained lab machines, this matters.

2. **No framework churn.** React hooks, Vue composition API, Svelte
   runes — each framework's paradigm shifts every 2-3 years. Vanilla
   DOM manipulation has been stable for 25 years. This tool will be
   maintained for years alongside the IRIG 106 crate ecosystem;
   framework migration is a cost with no user-visible benefit.

3. **Transparent WASM interop.** When `irig106-studio-wasm` returns a
   typed array of waveform samples, vanilla code writes it directly to
   a Canvas2D context. No framework reconciliation pass, no virtual DOM
   diff, no intermediate state management. The hot path from WASM to
   pixels is as short as possible.

4. **Simple mental model.** Each component owns its DOM subtree. Data
   flows in via typed method calls (`setSummary()`, `setChannel()`).
   Events flow out via callbacks passed at construction. There is no
   global state, no context providers, no signals, no stores. The
   dependency graph is visible in `main.ts` where all components are
   wired together.

5. **The app is panel-based, not component-heavy.** There are ~8
   components total, each managing a single panel. This is not a
   complex SPA with hundreds of reusable components — it's a
   professional workstation shell. The overhead of a framework is not
   justified by the component count.

## Consequences

- **Manual DOM updates.** When data changes, each component rebuilds
  its inner HTML or patches specific elements. This is more verbose
  than declarative templates but is explicit and predictable.

- **No hot module replacement for templates.** Vite HMR works for
  CSS and module-level changes, but full-page reload is needed for
  template changes. This is acceptable given the small component count.

- **Testing is DOM-based.** Tests (when added) will use `jsdom` or
  `happy-dom` and assert against DOM state rather than component
  snapshots. This is more resilient to refactoring.

- **Framework adoption later is possible.** If the component count
  grows significantly (e.g. a plugin system with third-party panels),
  migrating to a lightweight framework (Solid, Svelte) is feasible.
  The factory-function pattern maps cleanly to framework components.
