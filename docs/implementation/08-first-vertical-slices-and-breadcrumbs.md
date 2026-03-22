<!-- docs/implementation/08-first-vertical-slices-and-breadcrumbs.md -->

# Chapter 8: First Vertical Slices And Breadcrumbs

## Purpose

Turn the architectural groundwork into one or more thin but complete user-visible slices, while leaving explicit breadcrumbs for later return.

## Must Track Back To UI Guidelines

This chapter primarily follows:

- `Primary UX Goals`
- `Interaction Design Rules`
- `Definition of Done for UI Features`

## Repo Paths

- `app/src/js/features/source-explorer/`
- `app/src/js/features/workspace/`
- `app/src/js/features/analysis/`
- `app/src/js/features/inspector/`
- `app/src/js/features/jobs/`
- `docs/implementation-plan.md`
- `docs/implementation/README.md`

## What To Build

Deliver one or more thin vertical slices such as:

- load a file and show metadata
- select an item and update inspector details
- run a generic worker-backed analysis and display results
- show job status, progress, and failures clearly

These can remain generic until the external IRIG-domain crate is ready.

## Book-Style Teaching Rule

Each vertical slice should document:

- what the user sees
- what state changes
- what services are called
- whether the worker is involved
- whether Wasm is involved
- what later becomes IRIG-specific

## Breadcrumb Rules

Before pausing work, record:

- last working demo
- remaining stubs
- known dependency on the external `irig106-core`
- next recommended file to open
- next recommended code path to inspect

Suggested resume notes:

- top roadmap: `docs/implementation-plan.md`
- workbook index: `docs/implementation/README.md`
- current chapter file
- app startup: `app/src/js/main.js`
- service entry: `app/src/js/services/`
- worker entry: `app/workers/analysis-worker.js`

## Suggested First Resume Question

When returning later, ask:

"Which existing demo best proves that the current UI/service/worker/Wasm boundary still works before swapping in real IRIG behavior?"

## Success Criteria

- at least one complete thin slice exists
- status and errors are visible
- the project can pause without losing architectural context
