<!-- docs/implementation/README.md -->

# Implementation Workbook

This folder contains the chapter-by-chapter implementation workbook for `irig106-studio`.

Read these documents in order. Each chapter should:

- build on the previous chapter
- end in a working state
- teach one architectural boundary at a time
- refer back to `docs/ui-guidelines.md` when introducing a new abstraction
- leave notes for where to resume later

## Reading Order

1. `01-foundations-and-rules.md`
2. `02-browser-shell.md`
3. `03-state-actions-and-rendering.md`
4. `04-service-boundary-and-file-intake.md`
5. `05-worker-model-and-message-flow.md`
6. `06-wasm-integration-and-external-core-pause.md`
7. `07-performance-copying-and-large-files.md`
8. `08-first-vertical-slices-and-breadcrumbs.md`

## How To Use This Workbook

For each chapter:

1. read the purpose and why it exists
2. review the repo paths involved
3. implement the smallest working slice
4. complete the suggested generic demo
5. record the stopping-point notes

## Resume Rule

If work pauses:

1. open this file
2. open the last completed chapter
3. verify its demo still works
4. continue with the next incomplete chapter
