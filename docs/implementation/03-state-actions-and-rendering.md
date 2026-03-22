<!-- docs/implementation/03-state-actions-and-rendering.md -->

# Chapter 3: State, Actions, And Rendering

## Purpose

Introduce disciplined state management before real compute enters the app.

This chapter is where the project proves that no-framework UI does not mean ad hoc UI.

## Must Track Back To UI Guidelines

This chapter primarily follows:

- `Rendering Model`
- `State Management Rules`
- `Application Boundaries`

## Repo Paths

- `app/src/js/app/state.js`
- `app/src/js/app/actions.js`
- `app/src/js/app/events.js`
- `app/src/js/app/bootstrap.js`
- relevant render modules under `app/src/js/features/`

## What To Build

Create:

- one authoritative state object or clearly bounded store set
- a subscription mechanism
- action functions for meaningful mutations
- render functions that project state into the DOM

Suggested early domains:

- `workspace`
- `selection`
- `jobs`
- `ui`
- `errors`

## What Not To Build Yet

- no hidden mutable state in DOM nodes
- no direct service calls from random render functions
- no feature-specific state scattered without ownership

## Recommended Generic Demo

Build a simple selection demo:

1. click an item in the source explorer
2. dispatch an action
3. update selection state
4. re-render the workspace and inspector
5. update the status panel with the current selection

This demo is intentionally generic. It teaches state flow without requiring IRIG-specific semantics.

## Why This Matters

Later chapters will add:

- browser file objects
- worker jobs
- Wasm-backed operations
- progress updates

Those all become easier to reason about if the UI already obeys a clear action -> state -> render loop.

## Success Criteria

- interactions produce deterministic state changes
- render updates are targeted and understandable
- the team can trace a user click through the relevant modules

## Stopping-Point Notes

When pausing after this chapter, the next file to open is:

- `docs/implementation/04-service-boundary-and-file-intake.md`
