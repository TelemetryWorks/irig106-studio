<!-- docs/implementation-plan.md -->

# Irig106 Studio Implementation Plan

This document is the top-level roadmap for implementing `irig106-studio`.

This roadmap is paired with the chapter-style documents in `docs/implementation/`. Those chapters are intended to be read and executed in order like a workbook.

The implementation set is intentionally structured so each step:

- produces a working result
- teaches one architectural concept at a time
- keeps future migration paths open
- avoids locking the project into premature complexity

---

## Implementation Goals

The early implementation should prove these ideas in order:

1. a plain browser UI can stay structured without a frontend framework
2. JavaScript can own browser concerns while Rust/Wasm owns parsing and compute
3. the app can keep the UI responsive by moving heavy work into a worker
4. file access in the browser is mediated by browser APIs, not native path access
5. the service boundary can remain stable as execution moves from main thread to worker and later to desktop or server

The plan should also:

- provide educational demos that are functional before they become IRIG-specific
- leave clear breadcrumbs for pausing and resuming work
- track back to the rules in `docs/ui-guidelines.md` whenever a new layer or abstraction is introduced

---

## Default Technical Starting Point

Start with this default unless a real constraint forces a different path:

- one Rust core integration point
- one Wasm module
- one browser worker for heavy processing
- one UI-to-service boundary
- one selected file active at a time in the first usable version

This is the preferred starting point because it minimizes moving parts while preserving the architecture needed for later growth.

### Important external dependency note

The eventual Rust core for IRIG-specific behavior is expected to come from an external open source crate under active development: `irig106-core`.

That means this project should explicitly plan for two modes:

- educational and architectural progress using generic or stub domain logic
- later integration work once the external crate is ready enough to depend on

The implementation docs below should therefore distinguish between:

- what can be built now with placeholder or demo logic
- what must pause until the external crate reaches the needed level of capability or stability

### Important model assumptions

- Workers are execution lanes.
- The Wasm module is the engine.
- Multiple workers do not require multiple Wasm builds.
- If multiple workers are added later, each worker will usually initialize its own instance of the same Wasm module.
- Shared truth should live in application state, explicit messages, or persistence layers, not in hidden in-memory Wasm state spread across workers.

---

## Document Set

Use this document as the roadmap and status page.

Use the chapter documents for implementation detail:

1. `docs/implementation/README.md`
2. `docs/implementation/01-foundations-and-rules.md`
3. `docs/implementation/02-browser-shell.md`
4. `docs/implementation/03-state-actions-and-rendering.md`
5. `docs/implementation/04-service-boundary-and-file-intake.md`
6. `docs/implementation/05-worker-model-and-message-flow.md`
7. `docs/implementation/06-wasm-integration-and-external-core-pause.md`
8. `docs/implementation/07-performance-copying-and-large-files.md`
9. `docs/implementation/08-first-vertical-slices-and-breadcrumbs.md`

If screenshots or diagrams are added later, place them under:

- `docs/images/implementation/`

---

## Major Tracks

The implementation is divided into the following major tracks:

1. browser UI foundations
2. state and rendering discipline
3. service boundary and browser file handling
4. worker orchestration
5. Wasm integration
6. performance and large-file handling
7. initial vertical slices
8. pause and resume strategy for external IRIG dependencies

Each track is broken into smaller chapter-level steps in `docs/implementation/`.

---

## Current Recommended Order

Follow the docs in this order:

1. establish the repo-level boundaries and file responsibilities
2. build a browser shell with static but functional UI regions
3. add state, actions, subscriptions, and targeted rendering
4. introduce a service boundary that hides implementation details from the UI
5. prove browser-mediated file intake using generic binary or text samples
6. add a single worker and a clear message contract
7. connect a first Wasm-backed demo path
8. pause at the point where real IRIG-domain integration requires the external `irig106-core`
9. resume later by replacing demo or stub domain logic behind the existing boundaries
10. then grow into real file parsing, analysis workflows, and larger data handling

---

## Repo-Specific Implementation Targets

The current planned repo layout suggests the following responsibility map.

### App shell and UI wiring

- `app/src/index.html`
  - application shell and mount points
- `app/src/styles/tokens.css`
  - design tokens and basic visual variables
- `app/src/styles/base.css`
  - element defaults and typography rules
- `app/src/styles/layout.css`
  - workbench layout and panel framing
- `app/src/styles/components.css`
  - reusable UI pieces once they earn extraction
- `app/src/js/main.js`
  - startup entry point
- `app/src/js/app/bootstrap.js`
  - startup orchestration and initial service wiring
- `app/src/js/app/router.js`
  - route or panel-state coordination if needed
- `app/src/js/app/state.js`
  - authoritative state container and subscription mechanism
- `app/src/js/app/actions.js`
  - controlled state mutations and orchestration entry points
- `app/src/js/app/events.js`
  - DOM event binding helpers or event normalization if needed

### Service boundary and browser integration

- `app/src/js/services/worker-client.js`
  - UI-facing worker communication
- `app/src/js/services/wasm-engine.js`
  - Wasm loader and adapter boundary
- `app/src/js/services/storage.js`
  - browser persistence and preferences
- `app/src/js/services/api-client.js`
  - future server/client migration path, likely stubbed initially

### Feature areas

- `app/src/js/features/source-explorer/`
  - loaded sources, files, hierarchy, and selection entry points
- `app/src/js/features/workspace/`
  - main working views and demos
- `app/src/js/features/analysis/`
  - analysis orchestration and views
- `app/src/js/features/inspector/`
  - current selection details
- `app/src/js/features/jobs/`
  - progress, background work, and operation status

### Worker and Wasm runtime

- `app/workers/analysis-worker.js`
  - initial single worker for expensive jobs
- `app/wasm/`
  - generated bindings or loader output when Wasm build integration exists
- `crates/irig106-wasm/`
  - browser-facing Wasm crate or adapter crate
- external `irig106-core`
  - eventual source of real IRIG-domain logic once ready

---

## Educational Demo Strategy

Before real IRIG-specific functionality is available, each implementation chapter should end with a small demo that proves the architecture.

Recommended demo progression:

1. static workbench shell with fake panels
2. counter or selection demo proving state and rendering flow
3. file intake demo using text or generic binary metadata
4. worker round-trip demo using synthetic analysis jobs
5. Wasm-backed demo using simple transforms or checksum-style logic
6. chunked large-file demo using generic data rather than IRIG-specific parsing

These demos should be functional and inspectable, but should not pretend to be final product behavior.

They exist to teach:

- where responsibilities live
- how data moves
- how the UI remains responsive
- how future IRIG-specific code will slot into the same structure

---

## Teaching Notes For Iterative Development

When implementing each phase, prefer this sequence:

1. explain the architectural purpose of the step
2. build the smallest working version
3. verify behavior visibly in the UI or logs
4. document what boundary was proven
5. only then add the next layer of complexity

This keeps the project educational and reduces the chance of hiding architectural mistakes under premature feature work.

Every new module or abstraction should answer:

- which rule from `docs/ui-guidelines.md` it is serving
- why it belongs in this repo path
- what would break if it were placed in a different layer

---

## Pause And Resume Breadcrumbs

Because work on the external IRIG crates will continue separately, this project should leave explicit breadcrumbs at each stopping point.

Each implementation chapter should record:

- what was completed
- what remains stubbed
- what assumptions were made about the external crate
- what file should be opened first when resuming
- what demo proves the current boundary still works

Recommended resume checklist:

1. open `docs/implementation-plan.md`
2. open `docs/implementation/README.md`
3. open the last incomplete chapter in `docs/implementation/`
4. verify the demo for the last completed chapter still runs
5. then continue with the next chapter

---

## Image And Diagram Placement

If you want to add screenshots or architecture diagrams later, place them here:

- `docs/images/implementation/`

Suggested image types:

- browser shell screenshots
- state flow sketches
- worker message flow diagrams
- file intake diagrams
- Wasm loading diagrams
- progress and jobs panel screenshots

---

## Summary

The preferred first implementation for `irig106-studio` is:

- plain HTML/CSS/JavaScript
- explicit state and rendering
- browser-mediated file access
- one worker for heavy processing
- one shared Wasm build
- one stable service boundary between UI and engine

The educational implementation should progress now using demos and placeholder domain behavior, then pause cleanly when real IRIG-domain integration depends on the external `irig106-core`, and later resume without changing the UI, service, worker, and Wasm architecture that was proven earlier.
