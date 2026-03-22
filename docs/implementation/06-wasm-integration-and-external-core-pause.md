<!-- docs/implementation/06-wasm-integration-and-external-core-pause.md -->

# Chapter 6: Wasm Integration And External Core Pause

## Purpose

Connect the worker and service boundary to one Wasm-backed path while acknowledging that the real IRIG-domain core is external and still in development.

This chapter is where the project should become Wasm-capable without pretending that the final domain engine is already available.

## Must Track Back To UI Guidelines

This chapter primarily follows:

- `Treat Rust/Wasm as the application engine`
- `Wasm Integration Rules`
- `Rules for Server Evolution`

## Repo Paths

- `crates/irig106-wasm/`
- `app/src/js/services/wasm-engine.js`
- `app/workers/analysis-worker.js`
- `app/wasm/`

## Expected External Dependency

Real IRIG parsing and analysis logic is expected to rely on the external `irig106-core` crate once that crate is ready.

Until then, this repo should support one of these approaches:

- placeholder Rust logic in `crates/irig106-wasm/`
- a temporary demo transform or compute routine
- stubbed request/response flows that prove integration points

## Important Wasm Model

Keep this distinction clear:

- one Wasm module artifact
- one or more Wasm instances

If multiple workers exist later, each worker will usually initialize its own instance of the same Wasm module.

That does not mean:

- multiple Wasm apps
- shared hidden in-memory state across workers

## What To Build

Create:

- one JS-facing Wasm adapter in `wasm-engine.js`
- one worker path that initializes Wasm
- one simple Wasm-backed operation the UI can trigger indirectly through the service boundary

## Recommended Generic Demo

Build a Wasm-backed demo operation such as:

- checksum calculation
- byte histogram
- chunk counting
- simple transform over generic binary input

The exact demo is less important than the architectural proof:

- UI -> action -> service -> worker -> Wasm -> worker -> UI

## Pause Rule

If the next meaningful step would require real IRIG-specific core logic from the external crate, stop and record:

- what Wasm integration path already works
- what request and response shapes are already established
- which demo proves the integration still works
- what assumptions are waiting on `irig106-core`

## Success Criteria

- Wasm is initialized behind the service boundary
- the UI does not know or care about low-level Wasm setup
- the repo has a clean stopping point while the external crate continues evolving

## Stopping-Point Notes

When pausing after this chapter, the next file to open is:

- `docs/implementation/07-performance-copying-and-large-files.md`
