<!-- docs/implementation-plan.md -->

# Irig106 Studio Implementation Plan

This document turns the current UI and architecture guidance into a build order that supports incremental development and team education.

The plan is intentionally staged so each step:

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

---

## Default Technical Starting Point

Start with this default unless a real constraint forces a different path:

- one Rust core
- one Wasm module
- one browser worker for heavy processing
- one UI-to-service boundary
- one selected file active at a time in the first usable version

This is the preferred starting point because it minimizes moving parts while preserving the architecture needed for later growth.

### Important model assumptions

- Workers are execution lanes.
- The Wasm module is the engine.
- Multiple workers do not require multiple Wasm builds.
- If multiple workers are added later, each worker will usually initialize its own instance of the same Wasm module.
- Shared truth should live in application state, explicit messages, or persistence layers, not in hidden in-memory Wasm state spread across workers.

---

## Execution Phases

The implementation should be delivered in five short phases. Each phase should end in a working state and should prove one major architectural boundary before the next phase begins.

---

## Phase 1: Establish the browser application shell

Goal:
Create a structured browser UI with explicit boundaries before introducing real IRIG processing.

Includes:

- confirm UI, service, worker, and Rust responsibilities
- build the static HTML shell and CSS layout
- add JavaScript bootstrap code
- introduce explicit state, actions, subscriptions, and targeted rendering

Educational focus:

- plain JavaScript still needs architecture
- state must be the source of truth
- deployment details must not leak into the UI

Exit criteria:

- the app loads with the intended workbench layout
- at least one user interaction flows through action -> state -> render
- the team can explain what belongs in UI code versus service code versus Rust code

---

## Phase 2: Define the service boundary and browser file flow

Goal:
Create the application-facing service layer and prove the browser file acquisition model.

Includes:

- define service operations such as `loadFile`, `runAnalysis`, `decodeChannel`, and `exportSelection`
- define DTO-style request and response shapes
- implement file input and/or drag-and-drop
- surface selected-file metadata in the UI
- handle unsupported, canceled, and invalid file flows clearly

Educational focus:

- browser APIs own local file access permissions
- Rust/Wasm is the parsing and compute engine, not the file permission layer
- the UI should call service operations, not scattered low-level Wasm functions

Key rule:

- think in terms of "browser grants access -> JS or worker obtains bytes or handle -> Wasm interprets bytes"

Exit criteria:

- the UI acquires a local file through browser-approved mechanisms
- all domain-facing UI interactions go through the service boundary

---

## Phase 3: Introduce the worker and connect the first Wasm engine path

Goal:
Move heavy execution out of the UI thread and connect one worker to one shared Wasm build.

Includes:

- add one worker entry point, preferably `engine-worker.js` or `analysis-worker.js`
- add a worker client module and request/progress/result/error message protocol
- create one Rust core and one Wasm-facing adapter path
- add one JS Wasm loader such as `wasm-engine.js`
- initialize Wasm inside the worker and run one simple domain operation

Educational focus:

- workers are separate execution contexts
- workers do not manipulate the DOM
- one Wasm module artifact can back multiple worker instances
- one worker and one Wasm module is the correct default starting point

Exit criteria:

- the UI can send work to the worker and receive a result back
- the worker can initialize the Wasm engine successfully
- the UI remains unaware of low-level Wasm initialization details

---

## Phase 4: Process real files in the worker and add performance discipline

Goal:
Read and process actual binary inputs in the worker while keeping the UI responsive.

Includes:

- main thread receives the browser file object
- file object or file-derived work request is sent to the worker
- worker performs reads and invokes Wasm parsing
- worker posts progress, metadata, and result summaries back to the UI
- add chunked processing where appropriate
- use transferable `ArrayBuffer` paths when large buffers must cross contexts

Educational focus:

- one worker is usually the best first architecture
- file reading should happen in the worker when practical
- zero-copy is a boundary-specific optimization, not an end-to-end assumption
- shared memory is an advanced option, not the default

Default processing model:

1. the user grants file access
2. the main thread receives the browser file object
3. the worker performs heavy reads and processing
4. the worker calls the Wasm engine
5. the worker posts progress and results back to the UI

Exit criteria:

- a real file can be selected and processed without freezing the UI
- the team has a credible chunking and copy-avoidance strategy for larger files

---

## Phase 5: Deliver the first usable analysis slice and preserve migration flexibility

Goal:
Ship one real end-to-end workflow and confirm the architecture still supports later scaling.

Includes:

- load a file into the workspace
- display metadata or structure summaries
- deliver one real analysis or decode workflow
- add visible job status, progress, completion, and failure states
- add cancellation hooks where feasible
- review whether one worker remains sufficient
- review whether the service boundary still cleanly supports desktop or server migration

Educational focus:

- long-running work must remain operationally clear
- multiple workers are not automatically better
- migration readiness depends on stable boundaries, not on premature abstraction

Decision rule:

- keep one worker and one Wasm module unless real profiling or isolation needs justify a split

Exit criteria:

- one meaningful workflow is usable end to end
- users can see what is running, what completed, and what failed
- the team can explain how the same service interface could later target worker-hosted Wasm, desktop-native Rust, or a server API

---

## Teaching Notes for Iterative Development

When implementing each phase, prefer this sequence:

1. explain the architectural purpose of the step
2. build the smallest working version
3. verify behavior visibly in the UI or logs
4. document what boundary was proven
5. only then add the next layer of complexity

This keeps the project educational and reduces the chance of hiding architectural mistakes under premature feature work.

---

## Summary

The preferred first implementation for `irig106-studio` is:

- plain HTML/CSS/JavaScript
- explicit state and rendering
- browser-mediated file access
- one worker for heavy processing
- one shared Wasm build
- one stable service boundary between UI and engine

This plan should remain the default until real evidence justifies more workers, more Wasm modules, or a different deployment model.
