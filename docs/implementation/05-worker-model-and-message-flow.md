<!-- docs/implementation/05-worker-model-and-message-flow.md -->

# Chapter 5: Worker Model And Message Flow

## Purpose

Add the worker boundary before introducing real heavy logic.

This chapter is about execution context, not domain specificity.

## Must Track Back To UI Guidelines

This chapter primarily follows:

- `Preparing for Heavy Compute`
- `Browser Responsiveness Rules`
- `Application Boundaries`

## Repo Paths

- `app/workers/analysis-worker.js`
- `app/src/js/services/worker-client.js`
- `app/src/js/app/actions.js`
- `app/src/js/features/jobs/`

## What To Build

Create:

- one worker entry point
- one worker client adapter
- one message protocol for:
  - request
  - progress
  - success
  - failure
  - cancellation when feasible

The UI should dispatch actions to service calls, and the worker client should handle the actual worker communication.

## Key Worker Rules

- workers are separate browser execution contexts
- workers do not render UI or manipulate the DOM
- workers communicate through messages
- worker entry files should stay visibly separate from normal UI modules

## Recommended Generic Demo

Build a synthetic analysis demo:

1. user clicks `Run Demo Analysis`
2. main thread sends a message to `analysis-worker.js`
3. worker waits, computes something simple, or simulates chunked progress
4. worker reports progress
5. worker returns a result
6. jobs/status UI updates accordingly

This demo should prove message flow, busy state, and completion handling without needing real IRIG logic.

## Why This Matters

This chapter proves how long-running work will leave the main UI responsive.

It also prepares the team for the fact that a worker is not just another feature file. It is a separate runtime context with different capabilities and rules.

## Success Criteria

- the UI stays responsive while the worker runs
- request and result shapes are explicit
- progress and failure states are visible

## Stopping-Point Notes

When pausing after this chapter, the next file to open is:

- `docs/implementation/06-wasm-integration-and-external-core-pause.md`
