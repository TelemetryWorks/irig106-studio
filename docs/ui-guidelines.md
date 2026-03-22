<!-- docs/ui-guidelines.md -->

# Irig106 Studio UI Guidelines

## Purpose

This document defines the UI architecture and development guidance for `irig106-studio`.

The goal is to build a Rust + Wasm application with:

- minimal frontend dependencies
- plain HTML/CSS/JavaScript
- strong separation between UI and compute logic
- easy review and approval on disconnected networks
- a path to evolve into desktop or client/server deployment later
- predictable state management without needing a frontend framework

This document is intended to guide both implementation and future step-by-step development instructions.

---

## Core Design Principles

### 1. Keep the frontend simple
The frontend should use:

- plain HTML
- plain CSS
- vanilla JavaScript with ES modules

Do not introduce a frontend framework unless there is a clear, demonstrated need.

Rationale:

- reduces package approval burden
- reduces security review surface
- improves portability to disconnected networks
- keeps build and deployment understandable
- avoids framework lock-in

Reference material for this design choice:

- [MDN: JavaScript modules](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Modules)
- [MDN: Introducing a complete toolchain](https://developer.mozilla.org/en-US/docs/Learn_web_development/Extensions/Client-side_tools/Introducing_complete_toolchain)
- [MDN: Introduction to web APIs](https://developer.mozilla.org/en-US/docs/Learn_web_development/Extensions/Client-side_APIs/Introduction)

### Why this bias exists in this project

For `irig106-studio`, avoiding unnecessary frontend dependencies is not just a style preference. It is also an operational and approval strategy.

In disconnected or tightly controlled environments, each additional frontend dependency can introduce:

- package review and approval work
- additional transitive dependencies
- more security scanning and maintenance effort
- more build tooling complexity
- more upgrade burden over time

Using plain HTML, CSS, and vanilla JavaScript keeps the dependency surface small and makes the application easier to inspect, review, approve, and maintain.

This approach also gives tighter control over how JavaScript and Rust/Wasm interact. The team can define clear boundaries rather than inheriting framework-specific patterns that may be harder to justify in restricted environments.

---

### 2. Treat Rust/Wasm as the application engine
Rust/Wasm should contain:

- domain logic
- parsing
- validation
- transforms
- computation
- IRIG 106-specific processing rules

The browser layer should **not** contain core business logic if it can live in Rust.

Rationale:

- preserves correctness in one place
- makes logic reusable across browser, desktop, and server
- reduces duplication between JS and Rust
- simplifies future migration to native/server execution

---

### 3. JavaScript owns browser concerns
JavaScript should own:

- DOM interaction
- event wiring
- browser APIs
- app bootstrapping
- routing/navigation state
- local storage/session storage integration
- coordination between UI and Wasm

Rust/Wasm should not directly own presentation structure.

Rationale:

- keeps the UI layer lightweight
- avoids over-coupling the render layer to Wasm internals
- makes the frontend easier to inspect and debug

---

### 4. No framework does not mean no architecture
Even without React, Vue, Svelte, or similar, the UI must still be structured.

The application should use:

- explicit state containers
- explicit actions
- clear rendering boundaries
- feature-based folder structure
- unidirectional data flow where practical

Ad hoc DOM manipulation spread across random files is not acceptable.

---

### 5. Design for migration from day one
The app should be designed so the compute engine can later run in different places:

- browser Wasm
- browser worker + Wasm
- desktop host
- server-native Rust
- server-side Wasm if ever needed

The UI should call a stable application service interface, not a deployment-specific implementation.

Rationale:

- protects the investment in the Rust core
- allows heavy compute to move off-client later
- supports offline and hybrid modes

---

## UI Philosophy

For a Rust/Wasm application, architectural clarity matters more than adopting a frontend framework by default.

If the UI remains operationally focused, the state model is explicit, and the rendering layer stays thin, the application can be built successfully with:

- Rust/Wasm for compute-heavy or correctness-critical logic
- vanilla JavaScript for DOM, events, and browser integration
- HTML/CSS for presentation

This approach is especially attractive in disconnected or tightly controlled environments where dependency approval and long-term maintainability matter.

## The UI should feel:

- functional
- fast
- clear
- tool-like
- operational rather than decorative
- stable under large or complex data flows

This is a studio/workbench application, not a marketing site.

The interface should prioritize:

- readability
- discoverability
- task flow
- predictable controls
- clear system status
- keyboard and mouse efficiency

Avoid visual noise and unnecessary motion.

---

## Primary UX Goals

The UI must make it easy to:

1. load or connect to IRIG 106 data sources
2. inspect files, streams, channels, and metadata
3. navigate large datasets safely
4. run parsing or analysis operations
5. see progress and system status clearly
6. review decoded results in structured views
7. recover from errors without confusion
8. scale to heavier compute later without changing the user mental model

---

## Frontend Technology Rules

## Allowed by default

- HTML
- CSS
- JavaScript ES modules
- Rust compiled to Wasm
- browser-native APIs
- Web Workers when needed
- Web Components only if they solve a real reuse problem

## Avoid by default

- frontend frameworks
- client-side state libraries
- large component libraries
- complex JS build chains
- unnecessary npm dependencies

Any new dependency must justify:

- why native browser APIs are not enough
- what approval cost it introduces
- what maintenance burden it adds
- what happens if it cannot be approved on disconnected networks

## Tradeoffs of vanilla JavaScript

Using vanilla JavaScript is a deliberate tradeoff.

### What this project gains

- very small dependency surface
- easier review for restricted or disconnected environments
- simpler deployment packaging
- less framework lock-in
- direct control over browser/Wasm boundaries
- easier inspection of startup and failure behavior
- fewer surprises from third-party abstractions
- Simpler interop with Rust/Wasm because you decide exactly where JS stops and Wasm begins. MDN’s modules guidance also makes it practical to structure plain JS cleanly without a framework.

Supporting references for the benefits above:

- [MDN: JavaScript modules](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Modules)
- [MDN: Introducing a complete toolchain](https://developer.mozilla.org/en-US/docs/Learn_web_development/Extensions/Client-side_tools/Introducing_complete_toolchain)

### What this project gives up

- no built-in component model by default
- no built-in reactive state system
- no framework conventions to force consistency
- more responsibility on the team to keep structure disciplined
- more manual design work for rendering boundaries and reuse patterns
- some frameworks provide integrated SSR or full-stack application patterns that would need to be designed separately in this approach

Supporting references for the limitations above:

- [Leptos Book](https://book.leptos.dev/)
- [Leptos Book: Server-Side Rendering](https://book.leptos.dev/ssr/index.html)
- [Leptos Book: The Life Cycle of a Server-Side App](https://book.leptos.dev/ssr/22_life_cycle.html)

Because of these tradeoffs, choosing vanilla JavaScript does not remove the need for architecture. It increases the need for architectural discipline.  

---

## Rendering Model

The application should use a simple rendering model:

- state is the source of truth
- views render from state
- user interactions dispatch actions
- actions update state
- state changes trigger targeted rerenders

The DOM should be treated as a projection of state, not as the primary store of application truth.

### Rendering guidance

- Prefer small render functions by feature or panel.
- Avoid giant monolithic `renderApp()` functions once the app grows.
- Avoid scattered direct DOM mutation unless it is tightly scoped and intentional.
- Re-render only the affected region when practical.
- Keep templates understandable and inspectable.

---

## State Management Rules

A special frontend framework is not required for state management.

### No special framework is required

State management does not require Redux, MobX, Zustand, Vuex, or similar tools if the application is structured deliberately.

A no-framework state model is acceptable when it preserves:

- one authoritative state tree or a small number of clearly bounded stores
- controlled mutations through actions
- subscription or notification for rerendering
- rendering from state rather than treating the DOM as the source of truth
- explicit boundaries between UI logic, service logic, and domain logic

State management can be implemented with simple architectural discipline using plain JavaScript, provided the application maintains:

- a clear source of truth
- controlled writes through actions or reducers
- predictable state transitions
- subscriptions or notifications for rerendering
- separation between domain state and UI state

The absence of a framework does not remove the need for state architecture. It means the architecture must be explicit and intentional.

A special framework is not required for state management.

State should be implemented with simple architectural discipline.

## Required characteristics

- a small number of authoritative state stores
- controlled mutation through actions or reducers
- subscription/notification mechanism
- derived view state computed from source state
- no arbitrary mutation from random modules

## Suggested shape

Use state domains such as:

- `app`
- `workspace`
- `dataSource`
- `channels`
- `selection`
- `analysis`
- `jobs`
- `ui`
- `errors`
- `preferences`

Example conceptually:

```js
state = {
  workspace: {},
  dataSource: {},
  channels: [],
  selection: {},
  analysis: {},
  jobs: [],
  ui: {
    activePanel: null,
    busy: false,
    notifications: []
  }
}
```

### Conceptual state flow example

A typical interaction should follow a predictable path:

1. the user clicks a channel in the explorer
2. the UI dispatches an action such as `selectChannel`
3. the state store updates `selection.currentChannelId`
4. subscribed render functions update only the affected panels
5. dependent services may load additional data if needed

This pattern should be preferred over direct DOM manipulation mixed with hidden mutable state.

### State rules
- Keep persistent state distinct from transient UI state.
- Keep server/worker job state distinct from view state.
- Use actions for all meaningful writes.
- Prefer deterministic state transitions.
- Logically group state by feature rather than by widget.

### Conceptual implementation pattern

#### 1. One authoritative state tree

```js
export const state = {
  auth: { user: null, token: null },
  jobs: [],
  selectedJobId: null,
  ui: { busy: false, error: null }
};
```

#### 2. Mutations go through actions

```js
export function setBusy(value) {
  state.ui.busy = value;
  notify();
}
```

#### 3. Pub/sub or event-target notifications

```js
const bus = new EventTarget();

export function subscribe(fn) {
  const handler = () => fn(state);
  bus.addEventListener("change", handler);
  return () => bus.removeEventListener("change", handler);
}

function notify() {
  bus.dispatchEvent(new Event("change"));
}
```

#### 4. Render from state
The DOM should be treated as a projection of state, not as the primary store of truth.  

#### 5. Keep boundaries explicit
- JavaScript owns DOM, browser APIs, routing, and storage
- Rust/Wasm owns business rules, validation, transforms, and heavy compute
- shared DTO-style messages define the interface between them

## Application Boundaries

The system should be split into layers.

### 1. Presentation layer

Responsible for:

- HTML structure
- CSS styling
- DOM updates
- event listeners
- accessibility concerns

### 2. App layer

Responsible for:

- actions
- orchestration
- state transitions
- coordination between UI and services

### 3. Service layer

Responsible for:

- Wasm engine calls
- file access adapters
- browser storage
- worker communication
- future network calls

### 4. Domain layer

Responsible for:

- IRIG 106 parsing logic
- validation rules
- transformations
- compute-heavy operations
This layer should primarily live in Rust.

## Wasm Integration Rules
  
### Treat Wasm as an engine, not the app

The browser application should not be tightly coupled to direct Wasm invocation everywhere.

Prefer a stable service-style interface such as:

- `runAnalysis(input) -> result`
- `decodeChannel(input) -> result`
- `exportSelection(input) -> result`

The UI should depend on these operations, not on low-level Wasm exports scattered throughout the codebase.

This keeps the browser app indifferent to whether the engine is:

- local browser Wasm
- worker-hosted Wasm
- native Rust behind a desktop boundary
- a remote server API
  
The UI should not depend on raw Wasm details everywhere.  

Instead, expose a small JS-facing adapter layer such as:  
  
- `loadFile`
- `parsePacket`
- `decodeChannel`
- `runAnalysis`
- `exportSelection`
  
The UI calls these service methods, not low-level Wasm functions scattered throughout the app.  
  
This boundary is important because Rust/Wasm is the application engine, not the entire frontend architecture.

JavaScript continues to play a necessary role for:

- DOM rendering
- browser event handling
- file input and browser APIs
- storage integration
- navigation state
- coordination of async work
- adapting the UI to different deployment models over time

This keeps Rust focused on correctness-heavy domain logic while keeping browser-facing concerns in the browser layer.  
  
## Wasm design rules

- Keep Rust core logic pure where possible.
- Avoid browser-specific assumptions in the Rust core.
- Use clear DTO-style request and response objects.
- Make errors structured and user-displayable.
- Keep serialization boundaries explicit.

## Preparing for Heavy Compute
  
The initial version may run in browser Wasm, but architecture must allow movement to:  
  
- worker + Wasm for responsiveness
- native Rust on desktop
- client/server deployment for heavier jobs

### Additional deployment options

When compute requirements increase, the system may evolve in several directions:

- browser main thread + Wasm for simple workflows
- browser worker + Wasm for improved responsiveness
- desktop host application reusing the Rust core
- local service process with browser UI
- remote client/server deployment
- hybrid split execution where lightweight tasks remain local and heavy tasks are delegated
  
The UI and service boundaries should be designed so these options remain open.  
  
### Rule

UI code must depend on an abstract application service boundary, not directly on deployment location.  
  
Example mental model:  
  
- today: `runAnalysis()` uses browser Wasm
- later: `runAnalysis()` uses worker + Wasm
- later still: `runAnalysis()` calls server API
  
The UI should not need a major rewrite when that changes.  

## Browser Responsiveness Rules
  
Long-running work must never make the app feel stuck.  
  
### Requirements

- avoid blocking the main thread
- use workers for expensive client-side jobs when needed
- show progress for long operations
- support cancellation where feasible
- show busy state intentionally, not globally and indefinitely

### UX requirements for long jobs

For any operation that can take noticeable time:

- indicate that work started
- show progress if measurable
- show completion or failure clearly
- preserve user trust during waiting
- avoid freezing input unnecessarily

## Information Architecture

The UI should be organized around operational work areas.  
  
Suggested high-level layout:  
  
- top app bar or header
- left navigation or source explorer
- central work area
- optional right-side detail/inspector panel
- bottom status/log/progress area

### Suggested panel concepts

#### Source Explorer

Shows:  

- loaded files or sessions
- available streams
- channels
- packet groups
- data hierarchy

#### Main Workspace

Shows the active tool or view:

- summary view
- timeline
- packet table
- channel decode view
- analysis results
- export configuration

#### Inspector / Details
  
Shows context-sensitive detail:  
  
- metadata
- field detail
- decode detail
- warnings
- schema information
- selection properties

#### Status / Job Panel

Shows:

- busy state
- current operations
- parse progress
- warnings
- errors
- completed jobs
- background tasks

## Interaction Design Rules

### 1. Every major action should be visible
  
Do not hide core functions behind obscure gestures.  
  
### 2. Selection should be explicit  
  
The user should always understand what item is selected and what the current context is.  

### 3. Status should be visible
  
The app should always communicate:

- what data is loaded
- what operation is running
- whether output is current
- whether the system is idle, busy, or failed

### 4. Errors should be actionable

Error messages should state:

- what failed
- what object or operation was involved
- what the user can do next

### 5. Large data must remain navigable

Support:

- filtering
- sorting
- progressive disclosure
- lazy rendering when needed
- chunked loading if required

## Accessibility and Usability Rules

The application should be usable without perfect conditions.

### Requirements

- semantic HTML where possible
- keyboard accessibility for major workflows
- visible focus states
- sufficient contrast
- readable typography
- avoid relying on color alone for meaning
- labels for controls and status indicators

This is especially important for tool-oriented interfaces used for extended sessions.  

## Styling Rules

The visual language should be conservative and functional.  

### Prefer

- clean spacing
- clear hierarchy
- restrained color use
- obvious data grouping
- alignment and consistency
- reusable CSS tokens/variables

### Avoid

- decorative complexity
- excessive animation
- visually noisy panels
- ambiguous icon-only controls without labels or tooltips
- inconsistent spacing and typography

### CSS guidance

Use:

- CSS custom properties for design tokens
- layout utilities sparingly
- component or feature-scoped CSS organization
- simple naming conventions
  
Avoid CSS approaches that require large external styling frameworks.  

## Component Strategy

A framework is not required, but reusable UI patterns still matter.  
  
Reusable units may be implemented as:  
  
- plain render modules
- small view helpers
- Web Components when justified
  
Only introduce a formal component abstraction when repetition and complexity justify it.  

### Web Components as a middle ground

Web Components are a reasonable middle-ground option when reusable UI elements are needed but a full frontend framework is not justified.

They can provide:

- reusable custom elements
- encapsulation of behavior and markup
- browser-native composition patterns

They should still be introduced only when they solve a real reuse or maintenance problem, not as a default abstraction layer for the whole application.

Supporting reference:

- [MDN: Web Components](https://developer.mozilla.org/en-US/docs/Web/API/Web_components)

### Good candidates for reuse

- data table shell
- toolbar
- modal/dialog shell
- status banner
- progress indicator
- tree view row
- inspector field block
- notification item

### When frameworks actually help

A frontend framework may begin to justify its cost when one or more of the following become true:

- many developers need a common UI pattern
- the UI becomes deeply nested and frequently changing
- SSR, hydration, or SEO become real requirements
- full-stack conventions are needed
- a rich component ecosystem becomes necessary
- the custom rendering or state layer is effectively turning into a framework

Until those conditions exist, the preferred approach is to keep the architecture disciplined without taking on the runtime and dependency burden of a framework.

### Rules for Future Framework Adoption

A frontend framework is not required for the initial architecture and should only be adopted if:

- the UI complexity clearly exceeds the maintainability of the current approach
- the team can justify the approval and maintenance burden
- the migration offers clear gains in productivity or correctness
- the architecture is already suffering without it

A framework should not be adopted merely because it is common.

## Rules for Server Evolution

If heavier compute is required later:

- keep the Rust core
- preserve the frontend interaction model
- move compute behind a service interface
- keep lightweight/local operations in browser Wasm if valuable
- move heavy operations to worker, native host, or server as needed
  
Do not couple the UI directly to "browser-only Wasm" assumptions.  
  
Moving to a client/server model later does not require throwing away the Rust/Wasm investment.  
  
Possible migration strategies include:  
  
- keep Rust/Wasm in the browser for lightweight parsing or local inspection, while heavy analysis moves to a server
- move browser Wasm behind a Web Worker first, then later replace that service implementation with a server API
- reuse the Rust core as a native server-side library and keep the browser layer as a thin client
- support a hybrid model where some operations stay local for responsiveness and privacy while heavier jobs run remotely
  
The preferred design rule is that the UI depends on application service interfaces, not on whether the implementation is browser Wasm, worker-based Wasm, native Rust, or a remote server.  
  
The preferred migration path is:  
  
1. browser Wasm
2. browser worker + Wasm
3. hybrid local + server
4. native Rust/server-native Rust for heavy jobs

### Practical service boundary

The preferred architecture is to keep the UI coupled to an application service boundary rather than directly to browser-Wasm calls.

Conceptual flow:

UI -> app actions -> domain service interface -> implementation

Possible implementations behind that interface include:

- browser Wasm
- Web Worker + Wasm
- server HTTP API
- native desktop process

This allows execution location to change without forcing a major UI rewrite.

### Migration options when compute grows

When compute requirements increase, the preferred approach is to keep the domain logic and change the execution location.

Common options include:

#### Option A: Hybrid

Keep a lighter Wasm module in the browser for:

- validation
- local transforms
- preview
- optimistic UX
- offline-capable workflows

Move expensive work to the server for:

- large datasets
- long-running jobs
- shared compute resources
- protected algorithms
- privileged operations

This is often the preferred long-term architecture.

#### Option B: Thin client

Remove most browser-side Wasm and keep a JavaScript UI that communicates with remote services.

This is appropriate when:

- compute is clearly server-centric
- data is too large to move efficiently to clients
- centralized control or auditing is required

#### Option C: Worker-first client

Move client-side computation into Web Workers while keeping Wasm local.

This is appropriate when:

- the primary issue is responsiveness
- total compute demand does not yet justify a server migration

#### Option D: Job-based or asynchronous server processing

For sporadic heavy workloads:

- the browser submits a job
- a remote worker or service processes it asynchronously
- the browser polls or subscribes for results

## Development Rules

### Build in slices

Each development step should produce a working state.

### Prefer explicitness over magic

Code should be easy to inspect and review.

### Keep interfaces small

Small service boundaries are easier to migrate later.

### Test core logic in Rust

Domain correctness belongs in Rust tests.

### Minimize frontend complexity

The frontend should coordinate and present, not become the logic engine.

### Design now so migration stays easy later

To preserve future deployment flexibility:

1. keep domain logic pure
2. avoid DOM, fetch, and browser globals inside core Rust
3. define request/response contracts early
4. use plain DTO-style data crossing the UI/compute boundary
5. put interop behind adapters
6. separate immediate UI actions from long-running job orchestration
7. avoid framework-specific state assumptions
8. treat Wasm as an engine rather than the entire application

## Definition of Done for UI Features

A UI feature is complete when:

- the user can discover it
- the interaction is understandable
- the state updates are predictable
- long work shows status
- errors are communicated clearly
- the code follows the defined architecture
- the feature does not create unnecessary dependency burden

## Summary

`irig106-studio` should be built as a lightweight, architecture-first Rust/Wasm application with:

- plain HTML/CSS/JavaScript
- explicit state management
- Rust as the core engine
- clean UI/service/domain boundaries
- responsiveness preserved through proper compute placement
- future portability to desktop and server deployments
  
The application should prioritize correctness, maintainability, portability, and operational clarity over framework convenience.  

