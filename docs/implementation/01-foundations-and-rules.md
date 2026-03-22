<!-- docs/implementation/01-foundations-and-rules.md -->

# Chapter 1: Foundations And Rules

## Purpose

This chapter establishes the architectural rules that every later chapter must obey.

The point is to avoid building UI code that accidentally absorbs domain logic, to avoid scattering Wasm details across the frontend, and to keep the repo ready for later migration to worker-hosted, desktop, or server-hosted execution.

## Must Track Back To UI Guidelines

This chapter is grounded in:

- `Keep the frontend simple`
- `Treat Rust/Wasm as the application engine`
- `JavaScript owns browser concerns`
- `No framework does not mean no architecture`
- `Design for migration from day one`

Those rules are defined in `docs/ui-guidelines.md`.

## Repo Paths Introduced Or Confirmed

- `docs/ui-guidelines.md`
- `docs/architecture.md`
- `docs/implementation-plan.md`
- `docs/PROJECT_STRUCTURE.md`

No application code is required yet. This chapter exists to lock in boundaries before coding starts.

## Responsibilities By Layer

### Presentation layer

Owns:

- HTML structure
- CSS styling
- DOM updates
- accessibility
- visible status communication

### App layer

Owns:

- state transitions
- action dispatch
- orchestration between UI and services
- deciding when async work starts or ends

### Service layer

Owns:

- Wasm loading
- worker communication
- file access adaptation
- browser persistence
- future network calls

### Domain layer

Owns:

- parsing
- validation
- transforms
- analysis
- correctness-heavy logic

For the real IRIG-specific implementation, this layer is expected to depend on the external `irig106-core` crate when that crate is ready.

## Rules To Preserve

- Do not put core domain logic in browser event handlers.
- Do not let UI modules call low-level Wasm exports directly.
- Do not make the DOM the source of truth.
- Do not introduce a framework to compensate for missing structure.
- Do not design around browser-only assumptions if the service boundary can stay portable.

## Educational Goal

By the end of this chapter, the team should be able to explain:

- why plain JavaScript is acceptable here
- why explicit state is still required
- why file access belongs to browser APIs
- why Wasm is an engine behind a service boundary rather than the app itself

## Stopping-Point Notes

When pausing after this chapter, the next file to open is:

- `docs/implementation/02-browser-shell.md`
