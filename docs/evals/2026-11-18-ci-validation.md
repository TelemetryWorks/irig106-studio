# Studio CI validation and compute budget — 2026-11-18

Base: GitHub main `b131d21afaee5412073de5089c0e8fdfd6de9b85`.

## Scope and preserved checks

The three existing required job names and their checks are unchanged:

- **Frontend (lint, test, build)**: lint, format, both typechecks, build, tests.
- **Rust workspace (core + tauri)**: Tauri Rust/JS alignment and its regression
  tests, fmt, Clippy, workspace build and tests.
- **WASM build**: production wasm-pack build and exported-entry tests.

No settings, rulesets, required-check configuration, secrets, workflow
permissions, project dependencies, application code, or MSRV declarations are
changed. New jobs are additional checks, not newly required checks. Native,
WASM, MSRV, and audit jobs retain two Cargo workers.

Workspace and WASM cache keys now include OS, architecture, actual rustc release
and commit, and the appropriate lockfile hash. Restore prefixes retain compiler
identity while allowing dependency reuse across lockfile changes. MSRV uses a
separate compiler/lockfile cache namespace. The new key namespaces make the
first run cold. WASM restoration precedes tool installation.

## Verified prebuilt tooling

`taiki-e/install-action` v2.90.5 resolves to
`ab49d3c64680143e184118bed66a46419fc15519` (verified upstream tag). Both uses
explicitly set checksum verification and `fallback: none`, so neither can fall
back to a source build. The pinned installer's manifests include:

| Tool | Linux x86_64 musl archive SHA-256 |
| --- | --- |
| wasm-pack 0.13.1 | `c539d91ccab2591a7e975bcf82c82e1911b03335c80aa83d67ad25ed2ad06539` |
| cargo-deny 0.20.2 | `9f12ed4c49936e09b48bf862b595cde2fe64fcbd9d74dfacac6131ca824c8d5f` |

Sources: pinned [action](https://github.com/taiki-e/install-action/blob/ab49d3c64680143e184118bed66a46419fc15519/action.yml),
[wasm-pack manifest](https://github.com/taiki-e/install-action/blob/ab49d3c64680143e184118bed66a46419fc15519/manifests/wasm-pack.json),
and [cargo-deny manifest](https://github.com/taiki-e/install-action/blob/ab49d3c64680143e184118bed66a46419fc15519/manifests/cargo-deny.json).

## Additional validation

**Desktop MSRV (Rust 1.90)** verifies that the app still declares 1.90, installs
that compiler and Tauri system dependencies, and runs
`cargo check --locked --package irig106-studio`. This covers the only currently
declared workspace MSRV and its core dependency. It does not compile locally in
Cloudroom or change the approved minimum.

The core and WASM crates should eventually declare their supported minimums
explicitly, with corresponding minimum-version CI before making that promise.
The owner's IRIG 106 library Rust 1.85 policy remains unchanged; do not inherit
desktop Rust 1.90 into those crates. The internal, unpublished fuzz harness uses
nightly cargo-fuzz and is not given a stable MSRV promise here. The optional
nightly fuzz check is omitted to avoid unrelated compute.

**Dependency and security validation** runs all four cargo-deny categories
(advisories, licenses, bans, sources) on both the workspace and standalone WASM
manifest. `unsound = "all"` and `unmaintained = "all"` include transitive
findings. No advisory ignore, graph exclusion, or skipped category is added.
The initial license allow-list matches core/WASM's declared MIT/Apache-2.0;
other license findings are surfaced for owner review, not silently accepted.
Duplicate versions warn, wildcard requirements fail, and unknown registry/git
sources fail. Later audits still execute after earlier findings, without
converting failure to success or `continue-on-error`.

The same job runs `npm audit --omit=dev --audit-level=high` against the lockfile
without installing/building the frontend again. All current npm dependencies
are development dependencies, so this audit's production-only scope does not
replace full development-tree security review. Existing glib alert #1 stays
OPEN; ignore proposals must be approved separately by the owner.

## Local validation

Only workflow/configuration inspection, TOML parsing, `git diff --check`,
actionlint 1.7.12, and zizmor 1.32.0 regular/offline checks ran locally. The two
linters were downloaded as checksum-verified prebuilt ARM64 binaries. No local
workspace, Tauri, WASM, MSRV, or development-tool compilation was performed.

Hosted findings and cold/warm timings will be recorded after the PR runs.
