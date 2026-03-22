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

## Step-by-Step Plan

## Step 1: Freeze the architectural boundaries

Goal:
Define the code boundaries before implementation starts.

Deliverables:

- confirm the project structure
- confirm UI, service, and domain responsibilities
- confirm that Rust/Wasm is treated as the engine rather than the whole app
- confirm that browser APIs own file access and permission boundaries

Educational focus:

- why plain JS still needs architecture
- why the UI should not call low-level Wasm exports everywhere
- why service boundaries matter for future migration

Exit criteria:

- the team can explain what belongs in UI code, service code, worker code, and Rust code
- the team agrees that deployment location must not leak into the UI

---

## Step 2: Build the minimal browser shell

Goal:
Create a working browser application shell with no real IRIG processing yet.

Deliverables:

- static HTML entry page
- CSS tokens, layout, and base visual structure
- initial app bootstrap in plain JavaScript modules
- placeholder regions for source explorer, workspace, inspector, and status area

Educational focus:

- how the application layout maps to operational workflows
- how to organize plain JS modules without a framework
- how to keep rendering logic small and inspectable

Exit criteria:

- the application loads with the planned panel structure
- the codebase demonstrates the intended app/module organization

---

## Step 3: Introduce explicit state and rendering flow

Goal:
Make state the source of truth before adding real data handling.

Deliverables:

- a small authoritative state store
- action functions for meaningful state changes
- a notification/subscription mechanism
- render functions driven from state rather than ad hoc DOM mutation

Educational focus:

- state -> render -> interaction -> action -> state loop
- why no-framework UI still needs disciplined state transitions
- how to separate transient UI state from domain state

Exit criteria:

- a basic interaction updates state and re-renders only the intended region
- the team can trace user interaction through actions and state updates

---

## Step 4: Define the service boundary

Goal:
Create the JavaScript service interface that the UI will call regardless of execution model.

Deliverables:

- a service module with operations such as:
  - `loadFile`
  - `runAnalysis`
  - `decodeChannel`
  - `exportSelection`
- request/response DTO shapes
- structured error objects suitable for UI display

Educational focus:

- why the UI should depend on service operations instead of Wasm details
- how a stable interface protects later migration to worker, desktop, or server

Exit criteria:

- UI code talks only to the service boundary for domain operations
- low-level implementation details are hidden behind adapters

---

## Step 5: Prove browser file acquisition

Goal:
Implement file selection using browser-approved mechanisms and keep that model explicit.

Deliverables:

- file input and/or drag-and-drop support
- creation of a `File`, `Blob`, or browser file handle based flow
- file metadata display in the UI
- clear error handling for unsupported or canceled operations

Educational focus:

- browser file access starts with user-granted browser APIs
- Rust/Wasm does not directly open local file paths in the browser
- the browser security boundary controls file access

Key rule:

- think in terms of "browser grants access -> JS/worker obtains bytes or handle -> Wasm interprets bytes"

Exit criteria:

- the app can accept a local file through browser-supported mechanisms
- the team understands that file permission and file parsing are separate concerns

---

## Step 6: Add a stub worker and message protocol

Goal:
Introduce the worker boundary before introducing real heavy logic.

Deliverables:

- one worker entry point, preferably `engine-worker.js` or `analysis-worker.js`
- a worker client module in the UI/service layer
- message types for request, progress, success, and failure
- a working round-trip from UI -> worker -> UI with stubbed data

Educational focus:

- workers are separate execution contexts
- workers do not manipulate the DOM
- workers communicate only by messages
- separating the worker entry point makes the runtime boundary obvious

Exit criteria:

- the UI can send a job to the worker and receive a result back
- the team understands why worker code is not just another UI feature module

---

## Step 7: Integrate the first Wasm engine path

Goal:
Connect the service layer and worker to one shared Wasm build.

Deliverables:

- one Rust core crate for domain logic
- one Wasm-facing crate or adapter layer
- one JS Wasm loader such as `wasm-engine.js`
- one worker path that initializes the Wasm engine and runs a simple domain operation

Educational focus:

- one Wasm module artifact does not mean one global singleton runtime
- each worker usually creates its own Wasm instance from the same Wasm build output
- one Wasm module is the correct default until size or isolation pressures justify splitting

Exit criteria:

- the worker can initialize Wasm and execute a simple operation successfully
- the UI remains unaware of low-level Wasm initialization details

---

## Step 8: Move file reading and parsing into the worker

Goal:
Keep the UI responsive by performing heavy reads and parsing away from the main thread.

Deliverables:

- main thread acquires the browser file object
- the file object or file-derived work request is sent to the worker
- the worker performs reads and invokes Wasm parsing
- the worker posts progress, metadata, and result summaries back to the UI

Educational focus:

- why one worker is the preferred first design
- why file reading in the worker avoids unnecessary UI thread work
- why it is better to centralize file ownership and parsing flow early

Default processing model:

1. the user grants file access
2. the main thread receives the browser file object
3. the worker performs heavy reads and processing
4. the worker calls the Wasm engine
5. the worker posts progress and results back to the UI

Exit criteria:

- a real file can be selected and processed without freezing the UI
- progress and completion are visible in the interface

---

## Step 9: Add chunking and practical copy-avoidance rules

Goal:
Support larger binary files without designing around unrealistic zero-copy assumptions.

Deliverables:

- chunked or streaming-oriented file processing design
- transferable `ArrayBuffer` usage when bytes must move across contexts
- documented rules for when to read in the main thread vs the worker
- measurements or observations for large-file behavior

Educational focus:

- zero-copy is a boundary-specific optimization, not an end-to-end guarantee
- reading a `File` into memory still materializes bytes in memory
- transferable buffers avoid extra copies between contexts
- shared memory should be treated as an advanced option, not the default

Performance rules:

- prefer reading large files in the worker when practical
- avoid unnecessary copying of large buffers
- use transferred buffers when large binary data must cross contexts
- prefer chunked processing for large files
- treat `SharedArrayBuffer` as an advanced later optimization with deployment constraints

Exit criteria:

- the app can process larger files with a credible plan for responsiveness and memory behavior
- the team understands the difference between practical copy reduction and perfect zero-copy claims

---

## Step 10: Build the first useful analysis workflow

Goal:
Turn the architecture into a user-visible vertical slice.

Deliverables:

- file loaded into the workspace
- visible metadata or structure summary
- one real analysis or decode workflow
- clear success, failure, busy, and idle states

Educational focus:

- how UI, state, worker orchestration, and Wasm combine into one feature
- how to keep long-running jobs understandable to the user

Exit criteria:

- a user can complete one meaningful end-to-end workflow
- the implementation proves the planned architecture is viable

---

## Step 11: Add job status, progress, and cancellation patterns

Goal:
Make long-running operations trustworthy and operationally clear.

Deliverables:

- job status display
- measurable progress where possible
- intentional busy indicators
- cancellation hooks where feasible
- structured error reporting tied to specific operations

Educational focus:

- long-running work must not feel opaque
- the UI should show operation state without freezing interaction
- status communication is part of the architecture, not decoration

Exit criteria:

- users can see what is running, what completed, and what failed
- long operations do not collapse into an indefinite busy state

---

## Step 12: Reassess worker topology only after real pressure appears

Goal:
Delay complexity until evidence exists.

Deliverables:

- explicit decision on whether to keep one worker or split into multiple workers
- reasons based on profiling, module size, isolation, or operational requirements
- updated architecture notes if the topology changes

Educational focus:

- multiple workers are not automatically better
- multiple workers usually imply multiple Wasm instances, not multiple Wasm apps
- one coordinator worker is often simpler than several specialized workers early on

Decision rule:

- start with one worker and one Wasm module
- split only if concurrency, organization, or isolation needs justify it

Exit criteria:

- the project keeps the simplest worker topology that meets real needs

---

## Step 13: Prepare the migration path

Goal:
Confirm that the implementation still supports future desktop or server execution.

Deliverables:

- review of Rust core purity and portability
- review of JS adapters and DTO boundaries
- review of worker assumptions that would matter for server migration
- list of browser-specific concerns that remain intentionally isolated

Educational focus:

- how to preserve migration flexibility without overbuilding the first version
- how stable service interfaces reduce rewrite risk

Exit criteria:

- the team can explain how `runAnalysis()` could later move from browser Wasm to worker-hosted Wasm, desktop-native Rust, or a server API without a major UI rewrite

---

## Recommended Milestone Grouping

Use these milestones to keep progress visible.

### Milestone A: UI Shell

Covers:

- Step 1
- Step 2
- Step 3

Outcome:

- a structured browser shell with explicit state and rendering flow

### Milestone B: Service and File Flow

Covers:

- Step 4
- Step 5
- Step 6

Outcome:

- the UI can acquire files, talk to a worker, and rely on a stable service boundary

### Milestone C: Wasm-Powered Processing

Covers:

- Step 7
- Step 8
- Step 9

Outcome:

- one worker and one Wasm engine can process real binary data while preserving responsiveness

### Milestone D: First Real Tool Slice

Covers:

- Step 10
- Step 11

Outcome:

- one end-to-end workflow is usable and operationally clear

### Milestone E: Scale and Migration Readiness

Covers:

- Step 12
- Step 13

Outcome:

- the project scales only where needed and retains future deployment flexibility

---

## Teaching Notes for Iterative Development

When implementing each step, prefer this sequence:

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
