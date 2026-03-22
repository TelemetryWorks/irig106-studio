<!-- docs/PROJECT_STRUCTURE.md -->

# Project Structure

```text
irig106-studio/
|-- docs/
|   |-- architecture.md
|   |-- implementation-plan.md
|   |-- PROJECT_STRUCTURE.md
|   |-- ui-guidelines.md
|   |-- ui-prompt-for-initial-test.md
|   |-- implementation/
|   |   |-- README.md
|   |   |-- 01-foundations-and-rules.md
|   |   |-- 02-browser-shell.md
|   |   |-- 03-state-actions-and-rendering.md
|   |   |-- 04-service-boundary-and-file-intake.md
|   |   |-- 05-worker-model-and-message-flow.md
|   |   |-- 06-wasm-integration-and-external-core-pause.md
|   |   |-- 07-performance-copying-and-large-files.md
|   |   `-- 08-first-vertical-slices-and-breadcrumbs.md
|   `-- images/
|       `-- implementation/
|-- crates/
|   |-- irig106-server/   # optional future native/server/desktop reuse; may need rename
|   |   |-- src/
|   |   `-- Cargo.toml
|   `-- irig106-wasm/
|       |-- src/
|       `-- Cargo.toml
|-- app/
|   |-- src/
|   |   |-- index.html
|   |   |-- styles/
|   |   |   |-- tokens.css
|   |   |   |-- base.css
|   |   |   |-- layout.css
|   |   |   `-- components.css
|   |   `-- js/
|   |       |-- main.js
|   |       |-- app/
|   |       |   |-- bootstrap.js
|   |       |   |-- router.js
|   |       |   |-- state.js
|   |       |   |-- actions.js
|   |       |   `-- events.js
|   |       |-- services/
|   |       |   |-- wasm-engine.js
|   |       |   |-- storage.js
|   |       |   |-- worker-client.js
|   |       |   `-- api-client.js
|   |       |-- features/
|   |       |   |-- source-explorer/
|   |       |   |-- workspace/
|   |       |   |-- analysis/
|   |       |   |-- inspector/
|   |       |   `-- jobs/
|   |       `-- ui/
|   |           |-- render/
|   |           |-- controls/
|   |           `-- dialogs/
|   |-- workers/
|   |   `-- analysis-worker.js
|   |-- wasm/
|   |   `-- generated bindings or loader integration
|   `-- public/
|-- scripts/
|-- tests/
|   |-- first_test.rs
|   |-- second_test.rs
|   `-- fuzz_compat.rs
|-- benches/
|   |-- first_bench.rs
|   `-- second_bench.rs
|-- .github/
|   |-- workflows/
|   |   |-- ci.yml
|   |   |-- lint.yml
|   |   |-- fuzz.yml
|   |   `-- docs.yml
|   `-- ISSUE_TEMPLATE.md
|-- Cargo.toml
|-- README.md
`-- LICENSE
```
