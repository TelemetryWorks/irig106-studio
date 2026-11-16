# Combined Studio dependency update — 2026-11-16

Base: GitHub main `1d07d972042ba23b2c800e5bb45475700dc9f0d5`.
Combines the package/lockfile changes from Dependabot #19 (JavaScript) and #20
(Cargo), plus the required Rust/JavaScript alignment and capability review.
The bot PRs are superseded only after this maintainer PR merges.

## Owner decision and dependency alignment

The owner approved the desktop app's Rust minimum increase from the previously
resolved 1.88 requirement to **1.90** on 2026-11-16. See
[ADR-009](../adr/ADR-009-studio-rust-190.md). Only `src-tauri/Cargo.toml` gains
`rust-version = "1.90"`; the IRIG 106 library-crate 1.85 policy is unchanged.
The contributor guide now states the desktop prerequisite accurately. CI keeps
stable Rust; local verification also checks the exact 1.90.0 toolchain.

| Component | GitHub main | Combined candidate |
| --- | --- | --- |
| Rust Tauri | 2.11.1 | 2.12.5 |
| JS Tauri API / CLI | 2.10.1 | 2.12.4 |
| Rust / JS dialog | 2.6.0 / 2.6.0 | 2.8.4 / 2.8.4 |
| Rust fs | 2.5.0 | 2.7.1 |
| Rust tauri-build | 2.6.1 | 2.7.4 |
| Prettier | 3.8.1 | 3.10.1 |
| typescript-eslint | 8.57.2 | 8.72.2 |
| Vite | 6.4.5 | 6.4.6 |
| serde | 1.0.228 | 1.0.229 |
| serde_json | 1.0.149 | 1.0.154 |
| thiserror | 2.0.18 | 2.0.21 |
| memmap2 | 0.9.11 | 0.9.12 |
| WASM web-sys | 0.3.92 | 0.3.107 |

The two original PR diffs are applied together. The extra targeted Cargo
resolution moves dialog from #20's 2.7.0 to 2.8.4 (and rfd 0.16.0 to 0.17.2),
matching #19's JavaScript dialog. No Vite/TypeScript major update or application
release-version change is included.

The pre-update `npm run tauri -- info` reports the existing Rust Tauri
2.11.1 / JS API 2.10.1 mismatch. The candidate reports Rust Tauri 2.12.5 / API
2.12.4 and dialog 2.8.4 / 2.8.4 without a mismatch. Tauri requires matching
major/minor releases; patch versions can differ. The CI guard reads installed
versions from this command and rejects mismatches, missing required pairs, or
missing output. Its negative checks include the pre-existing core/API mismatch,
an independently updated dialog, an additional installed plugin pair, and an
explicit CLI mismatch diagnostic. Rust-only fs does not need a JS package.

## Filesystem least privilege and generated catalogs

Source inspection found no frontend `@tauri-apps/plugin-fs` import or filesystem
plugin IPC call. `TauriAdapter.openFile()` obtains a string from dialog `open`
and passes it to Studio's `open_ch10_file`; native `Ch10File::open` performs the
read. The existing success/cancel adapter tests characterize that path.

Therefore, the explicit minimum set of frontend fs-plugin permissions is
**empty**: remove `fs:default` without granting any replacement fs permission.
Keep the plugin registration/dependency used by the dialog stack and the
existing native commands. This removes unused app-directory read/create grants
from the webview. The custom native commands retain their existing behavior;
fs-plugin ACLs do not govern those commands.

This avoids inheriting fs 2.7.1's broader Linux default: fs 2.5.0 denied
`$APPLOCALDATA/**`, while 2.7.1 narrows that deny to nine webview paths
(`CacheStorage/**`, `cookies`, `hsts-storage.sqlite`, `serviceworkers/**`,
`WebKitCache/**`, `databases/**`, `localstorage/**`, `mediakeys/**`, `storage/**`).
The generated catalog still describes upstream defaults; those descriptions
are not application grants. Regenerated `capabilities.json` grants only
`core:default` and `dialog:default` to `main`. Upstream dialog defaults retain
open/save/message; no new dialog grant is added. Core default permission lists
are unchanged. New core catalog entries do not become explicit app grants.

`cargo build --workspace --locked` regenerated the ACL/capability catalogs and
desktop schema on Linux. To refresh the already tracked Windows schema without
claiming a Windows compilation, a temporary Rust helper used the built,
locked tauri-utils 2.10.2 and serde_json 1.0.154 libraries:

```rust
use std::collections::BTreeMap;
use tauri_utils::{acl::{manifest::Manifest, schema::generate_capability_schema}, platform::Target};
fn main() {
    let input = std::fs::read("gen/schemas/acl-manifests.json").unwrap();
    let acl: BTreeMap<String, Manifest> = serde_json::from_slice(&input).unwrap();
    generate_capability_schema(&acl, Target::Windows).unwrap();
}
```

The helper ran from `src-tauri`. The upstream generator uses `Target` to select
the output filename, with schema content generated from the same ACL catalog.
The resulting Windows schema is byte-identical to the regenerated Linux and
desktop schemas (`cmp` exit 0). ACL/capability/desktop hashes were unchanged by
the helper. No helper dependency or tool was added to the project.

A new native characterization test opens a real temporary selected-file path
through `open_ch10_file` and reads its indexed header using managed state in a
mock app with no fs plugin installed. The previous capability is not expected
to fail this characterization; it is evidence of the existing native path,
not a GUI or ACL-enforcement test. No desktop GUI smoke test is claimed.

## glib exposure and security audits

The [exception record](2026-11-16-security-remediation.md) contains the updated
450-crate source search and `cargo tree -i glib --locked` result. There were no
references outside glib's own source; Studio's Rust sources do not use glib.
glib 0.18.5 / RUSTSEC-2024-0429 remains under the owner-approved OPEN exception,
without dismissal. Repeat the search when dependencies or the GTK stack change.

`npm audit --json` reports zero vulnerabilities. The glib exception is a Cargo
issue, not an npm exception. Cargo audit 0.23.0 reports zero vulnerability
advisories, glib as its sole unsoundness warning, and two retained unmaintained
notices (pin-utils and proc-macro-error). RustSec database commit:
`02e2517f457a359fc6d3440ea4560c8ea188fee8`. No advisory/warning was suppressed.

## Executed checks

Native compilation used `CARGO_BUILD_JOBS=2 CARGO_PROFILE_DEV_DEBUG=0`.

- `npm ci`: successful; no new project dependency.
- `VITEST_MAX_WORKERS=2 npm run ci`: lint, formatting, both TypeScript projects,
  production build, and all **47 frontend tests** pass with the updated tools.
- `cargo +1.90.0 check --workspace --locked`: passes on the exact approved
  minimum. Resolved Cargo metadata contains no declared requirement above 1.90.
- `cargo build --workspace --locked`: passes on stable Rust 1.99.1.
- `cargo test --workspace --locked`: **6 desktop command tests, 61 core tests,
  and one doctest** pass (one new native characterization).
- `cargo clippy --workspace --locked -- -D warnings` and
  `cargo fmt --all -- --check`: pass.
- `node --test scripts/check-tauri-versions.test.mjs`: all four guard tests pass.
  The guard rejects captured pre-update main output (exit 1) and accepts actual
  candidate `npm run tauri -- info` output (exit 0), through a pipefail pipeline.
- `npm audit --json` and Cargo audit 0.23.0: results recorded above, with the
  unresolved glib warning retained.
- actionlint 1.7.12 and zizmor 1.32.0 offline regular-persona workflow checks:
  no findings. No suppression/configuration changes were made.
- `git diff --check`: passes.

The first local `npm run build:wasm` attempt compiled the Rust WASM artifact
but wasm-pack's downloaded wasm-bindgen 0.2.130 CLI failed to run because it
requires glibc 2.38, newer than this cloud host. The deliberate tooling repair
is to compile that exact locked CLI from source using
`cargo install wasm-bindgen-cli --version 0.2.130 --locked --jobs 2` into a
temporary tool directory, then rerun with its `bin` directory on `PATH`.
This does not modify project dependencies or the system glibc.

With `/tmp/studio-wasm-bindgen-0130/bin` and the existing wasm-pack 0.13.1 tool
directory prepended to `PATH`, both `CARGO_BUILD_JOBS=2 npm run build:wasm`
and `CARGO_BUILD_JOBS=2 npm run test:wasm` pass, including all **14 exported-entry
tests**. The WASM crate emits three unused-import/dead-code warnings; no warning
check was disabled. These are local checks; exact-head hosted CI is reported
separately in the PR.
