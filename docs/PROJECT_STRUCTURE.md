<!-- docs/PROJECT_STRUCTURE.md -->

# Project Structure

```shell
irig106-studio/
├─ docs/
│  ├─ ui-guidelines.md
│  ├─ architecture.md
│  └─ implementation-plan.md
├─ crates/
│  ├─ irig106-server/   # optional future native/server/desktop reuse (May need to rename)
│  │  ├─ src/
│  │  └─ Cargo.toml
│  └─ irig106-wasm/
│     ├─ src/
│     └─ Cargo.toml
├─ app/
│  ├─ src/
│  │  ├─ index.html
│  │  ├─ styles/
│  │  │  ├─ tokens.css
│  │  │  ├─ base.css
│  │  │  ├─ layout.css
│  │  │  └─ components.css
│  │  ├─ js/
│  │  │  ├─ main.js
│  │  │  ├─ app/
│  │  │  │  ├─ bootstrap.js
│  │  │  │  ├─ router.js
│  │  │  │  ├─ state.js
│  │  │  │  ├─ actions.js
│  │  │  │  └─ events.js
│  │  │  ├─ services/
│  │  │  │  ├─ wasm-engine.js
│  │  │  │  ├─ storage.js
│  │  │  │  ├─ worker-client.js
│  │  │  │  └─ api-client.js
│  │  │  ├─ features/
│  │  │  │  ├─ source-explorer/
│  │  │  │  ├─ workspace/
│  │  │  │  ├─ analysis/
│  │  │  │  ├─ inspector/
│  │  │  │  └─ jobs/
│  │  │  └─ ui/
│  │  │     ├─ render/
│  │  │     ├─ controls/
│  │  │     └─ dialogs/
│  ├─ workers/
│  │  └─ analysis-worker.js
│  ├─ wasm/
│  │  └─ generated bindings or loader integration # This may already be covered elsewhere in the structure
│  └─ public/
├─ scripts/
├── tests/
│   ├── first_test.rs
│   ├── second_test.rs
│   └── fuzz_compat.rs
├── benches/
│   ├── first_bench.rs
│   └── second_bench.rs
├── .github/
│   ├── workflows/
│   │   ├── ci.yml
│   │   ├── lint.yml
│   │   ├── fuzz.yml
│   │   ├── docs.yml
│   └── ISSUE_TEMPLATE.md
├─ Cargo.toml
├─ README.md
└─ LICENSE
```
