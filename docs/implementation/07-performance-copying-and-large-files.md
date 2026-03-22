<!-- docs/implementation/07-performance-copying-and-large-files.md -->

# Chapter 7: Performance, Copying, And Large Files

## Purpose

Teach the practical browser-side performance model before real large-file workflows are implemented.

This chapter should prevent premature or incorrect assumptions about zero-copy behavior, worker sharing, and memory ownership.

## Must Track Back To UI Guidelines

This chapter primarily follows:

- `Preparing for Heavy Compute`
- `Browser Responsiveness Rules`
- `Rules for Server Evolution`

## Repo Paths

- `app/workers/analysis-worker.js`
- `app/src/js/services/worker-client.js`
- `app/src/js/services/wasm-engine.js`
- `app/src/js/features/jobs/`

## Performance Rules

- prefer reading large files in the worker when practical
- avoid unnecessary main-thread copies
- use transferable `ArrayBuffer` paths when large buffers must cross contexts
- treat chunking as a default strategy for large files
- treat `SharedArrayBuffer` as an advanced later optimization, not the first design

## Important Mental Model

There may be low-copy or zero-copy behavior at specific boundaries, but do not promise a magical end-to-end zero-copy path from local disk to Wasm memory.

Use the practical model:

- browser grants file access
- a worker reads file data
- data is processed in chunks where appropriate
- transferable buffers reduce extra copies between contexts
- Wasm interprets the data within the browser sandbox

## Recommended Generic Demo

Build a large-file demo that:

- reads a non-IRIG file in chunks
- reports chunk progress
- runs a simple compute routine per chunk
- updates the jobs/status area

The point is to teach responsiveness and movement of data, not to finalize domain behavior.

## Success Criteria

- the team can explain where copying may still occur
- the worker handles large-file flows without freezing the main UI
- the project has a realistic performance model before IRIG-specific integration deepens

## Stopping-Point Notes

When pausing after this chapter, the next file to open is:

- `docs/implementation/08-first-vertical-slices-and-breadcrumbs.md`
