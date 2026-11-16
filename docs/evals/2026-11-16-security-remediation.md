# Security remediation evidence — 2026-11-16

Base GitHub main: `9b6817fc3a154492e030603e7501d35092a2051e`.
The owner requested remediation of the 30 open Dependabot alerts captured with
`gh api repos/TelemetryWorks/irig106-studio/dependabot/alerts?state=open`.

## Result and unresolved boundary

The candidate lockfiles fix or remove **29 of those 30 alerts**. Alert **#1,
glib**, remains unresolved: this is not an all-clear or a claim that all 30 can
close. No alert was dismissed or suppressed. GitHub's default-branch alert state
will not change until merge and dependency-graph re-evaluation.

`cargo update -p glib --precise 0.20.0` fails because GTK 0.18.2 requires
`glib = "^0.18"`. Tauri 2.11.1 requires GTK 0.18; the latest published stable
Tauri 2.12.5 also requires GTK 0.18. There is no published glib 0.18.6. The locked
glib 0.18.5 source still contains the immutable out-pointer described by
[GHSA-wrw7-89jp-8q8g](https://github.com/advisories/GHSA-wrw7-89jp-8q8g).
The advisory's patched line starts at 0.20.0.

Resolving this remaining alert requires an upstream-compatible GTK/glib release
or a separately reviewed migration/backport decision. The candidate does not
remove Linux/desktop functionality, forge dependency versions, introduce an
unreviewed fork, or dismiss the advisory to make the count zero.

## Owner-approved open glib exception — 2026-11-16

The owner approved merging the 29 remediations while leaving Dependabot
**alert #1 OPEN, without dismissal**. This is an explicit deferral of the
remaining alert, not a claim that all 30 alerts are fixed. A read-only GitHub API
check on 2026-11-16 confirmed that alert #1 is still open.

[RUSTSEC-2024-0429](https://rustsec.org/advisories/RUSTSEC-2024-0429.html) /
[GHSA-wrw7-89jp-8q8g](https://github.com/advisories/GHSA-wrw7-89jp-8q8g)
affects glib versions `>=0.15, <0.20`; the patched line starts at `0.20`.
The affected implementation is `glib::VariantStrIter::impl_get`, reachable
only through `Variant::array_iter_str()`.
The unsound iterator functions are `VariantStrIter::{next, nth, last, next_back,
nth_back}`, reached through `Variant::array_iter_str()`.

Studio's own tracked source was searched at
`c9027bcb35d797ac64873da63cbacbcba25c244f` with:

```bash
git grep -n -E 'array_iter_str|VariantStrIter' -- src src-tauri/src crates
```

The command returned no matches (exit 1): no direct call to `array_iter_str` or
reference to `VariantStrIter` was found in Studio's own code. This source
inspection does not establish that transitive dependency calls are unreachable
or that the locked glib version is safe.

The reviewer's broader exposure finding at `c9027bc` was a source search of
all **445 crates**: no caller of `Variant::array_iter_str()` was found outside
glib's own definition/tests. Studio's Rust code does not use glib. This records
the reviewer's inspection, not a newly executed dependency-wide search by this
maintainer. It describes the inspected source at that revision, not a permanent
guarantee of unreachability or a resolution of the advisory.

Upstream status, coordinator-verified on 2026-11-16:

- GTK `0.19.0`, released 2026-09-08, depends on glib `^0.22`.
- Tauri maintainers confirmed they are upgrading in
  [tauri#16264](https://github.com/tauri-apps/tauri/issues/16264), closed as a
  duplicate on 2026-10-12 with a maintainer comment.
- [webkit2gtk-rs#166](https://github.com/tauri-apps/webkit2gtk-rs/pull/166)
  tracks glib `0.22` / GTK `0.19` and remains open.
- [tao#1332](https://github.com/tauri-apps/tao/pull/1332) tracks GTK `0.19`
  and remains open.

No new upstream report is needed: maintainers already track this upgrade.
Repeat the source exposure search whenever the **GTK stack or dependencies
change**. Re-check this exception on **every Tauri, tao, wry, or webkit2gtk
upgrade** with `cargo tree -i glib`. Inspect the resolved glib versions and
reverse dependency chain against the advisory and upstream upgrade status.
Keep alert #1 open
until the actual dependency tree reaches a patched version and the relevant
checks pass; do not dismiss it to clear the alert count.

## Each captured alert versus candidate versions

Every installed/locked copy of each named package was checked against that
alert's vulnerable range. `removed` means the package no longer occurs in the
root Cargo lockfile, not that the alert was dismissed.

| Alert | Package | Before | Candidate version(s) | Result |
| --- | --- | --- | --- | --- |
| [#1](https://github.com/TelemetryWorks/irig106-studio/security/dependabot/1) | `glib` | 0.18.5 | 0.18.5 | BLOCKED |
| [#2](https://github.com/TelemetryWorks/irig106-studio/security/dependabot/2) | `rand` | 0.7.3, 0.8.5 | removed | removed |
| [#3](https://github.com/TelemetryWorks/irig106-studio/security/dependabot/3) | `tauri` | 2.10.3 | 2.11.1 | fixed |
| [#4](https://github.com/TelemetryWorks/irig106-studio/security/dependabot/4) | `serde_with` | 3.18.0 | 3.21.0 | fixed |
| [#5](https://github.com/TelemetryWorks/irig106-studio/security/dependabot/5) | `vite` | 6.4.1 | 6.4.5 | fixed |
| [#6](https://github.com/TelemetryWorks/irig106-studio/security/dependabot/6) | `vite` | 6.4.1 | 6.4.5 | fixed |
| [#7](https://github.com/TelemetryWorks/irig106-studio/security/dependabot/7) | `postcss` | 8.5.8 | 8.5.23 | fixed |
| [#10](https://github.com/TelemetryWorks/irig106-studio/security/dependabot/10) | `ws` | 8.20.0 | 8.21.0 | fixed |
| [#11](https://github.com/TelemetryWorks/irig106-studio/security/dependabot/11) | `vite` | 6.4.1 | 6.4.5 | fixed |
| [#12](https://github.com/TelemetryWorks/irig106-studio/security/dependabot/12) | `vite` | 6.4.1 | 6.4.5 | fixed |
| [#13](https://github.com/TelemetryWorks/irig106-studio/security/dependabot/13) | `brace-expansion` | 5.0.5 | 5.0.12 | fixed |
| [#14](https://github.com/TelemetryWorks/irig106-studio/security/dependabot/14) | `postcss` | 8.5.8 | 8.5.23 | fixed |
| [#15](https://github.com/TelemetryWorks/irig106-studio/security/dependabot/15) | `postcss` | 8.5.8 | 8.5.23 | fixed |
| [#18](https://github.com/TelemetryWorks/irig106-studio/security/dependabot/18) | `postcss` | 8.5.8 | 8.5.23 | fixed |
| [#21](https://github.com/TelemetryWorks/irig106-studio/security/dependabot/21) | `nanoid` | 3.3.11 | 3.3.18 | fixed |
| [#22](https://github.com/TelemetryWorks/irig106-studio/security/dependabot/22) | `@humanfs/node` | 0.16.7 | 0.16.8 | fixed |
| [#23](https://github.com/TelemetryWorks/irig106-studio/security/dependabot/23) | `@vitest/mocker` | 4.1.2 | 4.1.12 | fixed |
| [#24](https://github.com/TelemetryWorks/irig106-studio/security/dependabot/24) | `vitest` | 4.1.2 | 4.1.12 | fixed |
| [#27](https://github.com/TelemetryWorks/irig106-studio/security/dependabot/27) | `brace-expansion` | 5.0.5 | 5.0.12 | fixed |
| [#28](https://github.com/TelemetryWorks/irig106-studio/security/dependabot/28) | `source-map-js` | 1.2.1 | 1.2.2 | fixed |
| [#29](https://github.com/TelemetryWorks/irig106-studio/security/dependabot/29) | `vite` | 6.4.1 | 6.4.5 | fixed |
| [#30](https://github.com/TelemetryWorks/irig106-studio/security/dependabot/30) | `vite` | 6.4.1 | 6.4.5 | fixed |
| [#31](https://github.com/TelemetryWorks/irig106-studio/security/dependabot/31) | `vite` | 6.4.1 | 6.4.5 | fixed |
| [#32](https://github.com/TelemetryWorks/irig106-studio/security/dependabot/32) | `vite` | 6.4.1 | 6.4.5 | fixed |
| [#33](https://github.com/TelemetryWorks/irig106-studio/security/dependabot/33) | `vite` | 6.4.1 | 6.4.5 | fixed |
| [#34](https://github.com/TelemetryWorks/irig106-studio/security/dependabot/34) | `@vitest/mocker` | 4.1.2 | 4.1.12 | fixed |
| [#35](https://github.com/TelemetryWorks/irig106-studio/security/dependabot/35) | `happy-dom` | 20.8.9 | 21.0.4 | fixed |
| [#36](https://github.com/TelemetryWorks/irig106-studio/security/dependabot/36) | `happy-dom` | 20.8.9 | 21.0.4 | fixed |
| [#37](https://github.com/TelemetryWorks/irig106-studio/security/dependabot/37) | `happy-dom` | 20.8.9 | 21.0.4 | fixed |
| [#38](https://github.com/TelemetryWorks/irig106-studio/security/dependabot/38) | `minimatch` | 10.2.4 | 11.0.5 | fixed |

## Version choices and compatibility

- Vite stays on 6.4.x; TypeScript remains 5.9.3. No Vite 8 or TypeScript 7.
  Vite 6.4.4 would meet the captured alert floors but introduces the separate
  [query-deny bypass](https://github.com/advisories/GHSA-8g5g-mxqh-grgj), so 6.4.5
  is selected. Nanoid 3.3.18 additionally fixes the
  [zero-size generator issue](https://github.com/advisories/GHSA-2v37-7h3g-55p8).
  The final live npm audit reports zero vulnerabilities. A further RustSec sweep
  found two quick-xml DoS advisories (RUSTSEC-2026-0194 and RUSTSEC-2026-0195)
  outside the captured GitHub list. Plist 1.10.0 is the first compatible plist
  release depending on quick-xml 0.41; quick-xml is locked at its patched 0.41.0
  floor. RustSec now reports zero vulnerability advisories, while retaining its
  explicit glib unsoundness and unmaintained dependency warnings. That result
  does not resolve or dismiss the glib alert above. The same sweep found
  patchable unsoundness advisories in anyhow (RUSTSEC-2026-0190), memmap2
  (RUSTSEC-2026-0186), and Tokio (RUSTSEC-2026-0386). Their first compatible
  fixed versions are locked at 1.0.103, 0.9.11, and 1.51.6 respectively.
  The core memmap2 floor and standalone WASM lock also require 0.9.11; the
  standalone fuzz lock already uses fixed 0.9.12. Glib is the sole remaining
  unsoundness warning. Existing unmaintained notices are retained, not suppressed.
- Happy-dom 21.0.4 is the necessary direct major to cover all three captured
  happy-dom advisories. Vitest/mocker stay on major 4 at 4.1.12. PostCSS,
  source-map-js, ws, brace-expansion and humanfs use patched compatible versions.
- ESLint 10.15.0 is the first ESLint 10 release requesting patched minimatch 11.
  Current typescript-eslint 8 still requests vulnerable minimatch 10, including
  its latest 8.72.2 release. A narrow override of only
  `@typescript-eslint/typescript-estree > minimatch` to 11.0.5 avoids upgrading
  the TypeScript compiler/parser major. Glob-based project-aware ESLint over the
  actual source tree passes with this override. No lint/typecheck rules or
  compiler strictness/include/exclude settings were weakened.
- Tauri itself is 2.11.1, the first version fixing the captured origin-confusion
  alert. Its build/macros/codegen/runtime components use the minimum 2.6.1/
  2.11.1 dependency floors and tauri-utils 2.9.1. Updating tauri-plugin to 2.6.0
  and tauri-plugin-fs to 2.5.0 removes the old HTML-parser feature chain and both
  vulnerable rand versions, rather than overriding incompatible rand APIs.
  Serde_with/macros are 3.21.0. All remain in their current published major lines.
- Tauri's generated permission/schema catalogs were regenerated with these
  dependency versions. Capability configuration is unchanged. Upstream default
  catalogs add the multiple-windows/activity/scene information commands and the
  combined tray-icon/template setter; the separate tray setters were already
  available. No new filesystem or network default permission was added.

## Executed checks and limits

- Clean `npm ci`; source and Node/Vite compiler checks; lint; formatting;
  production Vite build; 47 frontend tests (44 existing plus three security
  cases), all pass. Glob/project-aware ESLint also passes.
- The cookie-domain check uses reserved `.test` hosts and no network requests:
  both look-alike-host cases fail against isolated happy-dom 20.8.9 and pass
  against 21.0.4. The legitimate subdomain case passes in both. The committed
  regression cases exercise the same behavior through the public Window API.
- `cargo test --workspace --locked` passes the native command tests (5), core
  tests (61), and doctest (1), with two build workers and reduced debug metadata.
  Rust formatting and warning-denying Clippy also pass. All 14 exported WASM
  pagination tests pass; the standalone WASM lock changes only memmap2 to 0.9.11. Exact-head hosted CI is
  recorded in the PR; local native tests are not a desktop GUI smoke test.
- This is dependency remediation and a [dated owner policy](../security/dependabot-policy.md),
  not an architecture migration or publishing/settings change. Local-only TMATS
  documentation is outside the checkout and was not imported or edited.
