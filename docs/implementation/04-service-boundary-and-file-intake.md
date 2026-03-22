<!-- docs/implementation/04-service-boundary-and-file-intake.md -->

# Chapter 4: Service Boundary And File Intake

## Purpose

Create the application service boundary and prove the browser-approved local file intake model.

This chapter is where the project makes an important separation:

- browser APIs grant access to files
- service modules adapt those browser objects into app operations
- domain code interprets bytes later

## Must Track Back To UI Guidelines

This chapter primarily follows:

- `JavaScript owns browser concerns`
- `Wasm Integration Rules`
- `Preparing for Heavy Compute`
- `Browser Responsiveness Rules`

## Repo Paths

- `app/src/js/services/worker-client.js`
- `app/src/js/services/wasm-engine.js`
- `app/src/js/services/storage.js`
- `app/src/js/services/api-client.js`
- `app/src/js/app/actions.js`
- feature modules that trigger file-load behavior

## What To Build

Define service-facing operations such as:

- `loadFile`
- `runAnalysis`
- `decodeChannel`
- `exportSelection`

At this stage, some operations may be stubs.

Also implement:

- file input and/or drag-and-drop
- metadata display for the selected file
- clear errors for cancel, unsupported flow, or invalid content

## Browser File Access Rule

Do not design around native path access in the browser.

Use the mental model:

1. the user grants access through a browser-approved interaction
2. the app receives a `File`, `Blob`, or file handle
3. the app passes that object or its bytes into the next layer
4. later, Wasm interprets the bytes

## Recommended Generic Demo

Build a demo where the user selects any local file and the app shows:

- file name
- size
- content type when available
- simple preview metadata

This can be implemented with plain browser APIs and should not depend on IRIG-specific parsing.

## Why This Matters

This chapter prevents a future mistake where the team starts thinking of Wasm as if it were a native application opening file paths directly.

In the browser:

- permissions originate in browser APIs
- the browser sandbox still governs access
- Wasm receives data after access is granted

## Success Criteria

- UI interactions call service operations instead of low-level browser logic everywhere
- local file intake works through browser-mediated flows
- the team can explain the separation between permission and parsing

## Stopping-Point Notes

When pausing after this chapter, the next file to open is:

- `docs/implementation/05-worker-model-and-message-flow.md`
