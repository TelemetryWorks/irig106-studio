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
| cargo-audit 0.23.0 | `4f01c74ed84b2dffd0b1d37012a62cdf2a92c96e25bdf8eec7fcc0d4d3eb7811` |

Sources: pinned [action](https://github.com/taiki-e/install-action/blob/ab49d3c64680143e184118bed66a46419fc15519/action.yml),
[wasm-pack manifest](https://github.com/taiki-e/install-action/blob/ab49d3c64680143e184118bed66a46419fc15519/manifests/wasm-pack.json),
and [cargo-deny manifest](https://github.com/taiki-e/install-action/blob/ab49d3c64680143e184118bed66a46419fc15519/manifests/cargo-deny.json).
The supplemental [cargo-audit manifest](https://github.com/taiki-e/install-action/blob/ab49d3c64680143e184118bed66a46419fc15519/manifests/cargo-audit.json)
uses the same pinned installer and no-source-fallback policy.

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

The first working cargo-deny run demonstrated that locked optional chrono
0.4.44 is pruned from its active feature graph. Therefore the job also scans
both complete lockfiles with prebuilt cargo-audit 0.23.0 and `--deny warnings`.
This covers inactive lockfile entries (including chrono RUSTSEC-2026-0543)
without adding runtime features or dependencies. Audit warnings remain visible
and fail the new non-required job; no ignore is added in either auditor.

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

Hosted findings and cold/warm timings are reported in
[PR #22](https://github.com/TelemetryWorks/irig106-studio/pull/22), including
exact run IDs and the final reviewed head. The first audit invocation exposed
an incorrect CLI option placement (`--config` belongs before `check` in
cargo-deny 0.20.2); the follow-up fixes that invocation without changing policy
or ignoring any finding. All heavy validation runs in GitHub Actions.


## Cold cache evidence

[CI run 44266919514](https://github.com/TelemetryWorks/irig106-studio/actions/runs/44266919514)
at `374cba364a0c52d4007d2467fb51271a1ce38e0f` confirmed new-key cache misses
and successful saves for both jobs.

| Job | Elapsed job time | Cargo cache |
| --- | --- | --- |
| WASM build | 53 s | miss; exact key saved |
| Rust workspace (core + tauri) | 317 s | miss; exact key saved |

The follow-up changes only audit argument placement and this evidence; no
Rust/WASM compiled inputs or existing checks change. The PR records warm-cache
timings from that final head. Job totals include setup, package/network time,
and cache transfers, so they are observations, not guaranteed speedups.


## Warm cache evidence

[CI run 44268036727](https://github.com/TelemetryWorks/irig106-studio/actions/runs/44268036727)
at `d402d10acabc2ae63dea9eda8b6c47125f46bc8f` restored both exact primary
Cargo cache keys. All three required jobs passed. Timings from job timestamps:

| Job | Cold | Warm | Change |
| --- | --- | --- | --- |
| Rust workspace (core + tauri) | 317 s | 125 s | 192 s lower (61%) |
| WASM build | 53 s | 27 s | 26 s lower (49%) |

After the cold required jobs passed and saved their caches, the obsolete cold
run's MSRV job was cancelled during slow Ubuntu package downloads to avoid
obsolete duplicate work. This does not count as an MSRV pass; only final-head
MSRV completion is validation. No successful check was manually rerun. The
follow-up fixes audit coverage; CI on its final head is reported in the PR.

## Every cargo-deny finding from the first working audit

Snapshot: run 44268036727, job 134677342409. The JSON diagnostics below cover
all errors and warnings (accepted-license help messages are not findings).
Workspace summary: advisories 3 errors; licenses 32 errors and 2 warnings;
bans 1 error and 41 duplicate-version warnings; sources no findings.
WASM summary: licenses 1 error; bans 1 error; advisories/sources no findings.
The job deliberately fails. Production npm audit reports zero vulnerabilities.

| Manifest | Severity | Code | Package(s) | Detail |
| --- | --- | --- | --- | --- |
| workspace | error | rejected | `alloc-no-stdlib@3.0.0` | BSD-3-Clause |
| workspace | error | rejected | `alloc-stdlib@0.3.0` | BSD-3-Clause |
| workspace | error | rejected | `brotli@9.1.3` | BSD-3-Clause AND MIT |
| workspace | error | rejected | `cssparser@0.37.0` | MPL-2.0 |
| workspace | error | rejected | `cssparser@0.38.0` | MPL-2.0 |
| workspace | error | rejected | `cssparser-macros@0.7.1` | MPL-2.0 |
| workspace | error | rejected | `dtoa-short@0.3.5` | MPL-2.0 |
| workspace | error | rejected | `foldhash@0.2.0` | Zlib |
| workspace | error | rejected | `icu_collections@2.1.1` | Unicode-3.0 |
| workspace | error | rejected | `icu_locale_core@2.1.1` | Unicode-3.0 |
| workspace | error | rejected | `icu_normalizer@2.1.1` | Unicode-3.0 |
| workspace | error | rejected | `icu_normalizer_data@2.1.1` | Unicode-3.0 |
| workspace | error | rejected | `icu_properties@2.1.2` | Unicode-3.0 |
| workspace | error | rejected | `icu_properties_data@2.1.2` | Unicode-3.0 |
| workspace | error | rejected | `icu_provider@2.1.1` | Unicode-3.0 |
| workspace | warning | no-license-field | `irig106-studio@0.1.0` | license expression was not specified in manifest for crate 'irig106-studio = 0.1.0' |
| workspace | warning | unlicensed | `irig106-studio@0.1.0` | a valid license expression could not be retrieved for the crate |
| workspace | error | unlicensed | `irig106-studio@0.1.0` | irig106-studio = 0.1.0 is unlicensed |
| workspace | error | rejected | `litemap@0.8.1` | Unicode-3.0 |
| workspace | error | rejected | `option-ext@0.2.0` | MPL-2.0 |
| workspace | error | rejected | `potential_utf@0.1.4` | Unicode-3.0 |
| workspace | error | rejected | `selectors@0.38.0` | MPL-2.0 |
| workspace | error | rejected | `selectors@0.41.0` | MPL-2.0 |
| workspace | error | rejected | `target-lexicon@0.12.16` | Apache-2.0 WITH LLVM-exception |
| workspace | error | rejected | `tinystr@0.8.2` | Unicode-3.0 |
| workspace | error | rejected | `unicode-ident@1.0.24` | (MIT OR Apache-2.0) AND Unicode-3.0 |
| workspace | error | rejected | `writeable@0.6.2` | Unicode-3.0 |
| workspace | error | rejected | `yoke@0.8.1` | Unicode-3.0 |
| workspace | warning | duplicate | `base64@0.21.7`, `base64@0.22.1`, `base64@0.23.1` | found 3 duplicate entries for crate 'base64' |
| workspace | error | rejected | `yoke-derive@0.8.1` | Unicode-3.0 |
| workspace | warning | duplicate | `bit-set@0.8.0`, `bit-set@0.11.1` | found 2 duplicate entries for crate 'bit-set' |
| workspace | error | rejected | `zerofrom@0.1.6` | Unicode-3.0 |
| workspace | error | rejected | `zerofrom-derive@0.1.6` | Unicode-3.0 |
| workspace | warning | duplicate | `bit-vec@0.8.0`, `bit-vec@0.10.2` | found 2 duplicate entries for crate 'bit-vec' |
| workspace | error | rejected | `zerotrie@0.2.3` | Unicode-3.0 |
| workspace | error | rejected | `zerovec@0.11.5` | Unicode-3.0 |
| workspace | warning | duplicate | `bitflags@1.3.2`, `bitflags@2.11.0` | found 2 duplicate entries for crate 'bitflags' |
| workspace | error | rejected | `zerovec-derive@0.11.2` | Unicode-3.0 |
| workspace | warning | duplicate | `cssparser@0.37.0`, `cssparser@0.38.0` | found 2 duplicate entries for crate 'cssparser' |
| workspace | warning | duplicate | `dom_query@0.28.0`, `dom_query@0.29.0` | found 2 duplicate entries for crate 'dom_query' |
| workspace | warning | duplicate | `getrandom@0.2.17`, `getrandom@0.3.4`, `getrandom@0.4.2` | found 3 duplicate entries for crate 'getrandom' |
| workspace | warning | duplicate | `hashbrown@0.12.3`, `hashbrown@0.16.1` | found 2 duplicate entries for crate 'hashbrown' |
| workspace | warning | duplicate | `heck@0.4.1`, `heck@0.5.0` | found 2 duplicate entries for crate 'heck' |
| workspace | warning | duplicate | `html5ever@0.39.0`, `html5ever@0.40.1` | found 2 duplicate entries for crate 'html5ever' |
| workspace | warning | duplicate | `indexmap@1.9.3`, `indexmap@2.13.0` | found 2 duplicate entries for crate 'indexmap' |
| workspace | error | wildcard | `irig106-studio@0.1.0` | Internal core path dependency has no version requirement |
| workspace | warning | duplicate | `markup5ever@0.39.0`, `markup5ever@0.40.0` | found 2 duplicate entries for crate 'markup5ever' |
| workspace | warning | duplicate | `phf@0.13.1`, `phf@0.14.0` | found 2 duplicate entries for crate 'phf' |
| workspace | warning | duplicate | `phf_codegen@0.13.1`, `phf_codegen@0.14.0` | found 2 duplicate entries for crate 'phf_codegen' |
| workspace | warning | duplicate | `phf_generator@0.13.1`, `phf_generator@0.14.0` | found 2 duplicate entries for crate 'phf_generator' |
| workspace | warning | duplicate | `phf_macros@0.13.1`, `phf_macros@0.14.0` | found 2 duplicate entries for crate 'phf_macros' |
| workspace | warning | duplicate | `phf_shared@0.13.1`, `phf_shared@0.14.0` | found 2 duplicate entries for crate 'phf_shared' |
| workspace | warning | duplicate | `proc-macro-crate@1.3.1`, `proc-macro-crate@2.0.2`, `proc-macro-crate@3.5.0` | found 3 duplicate entries for crate 'proc-macro-crate' |
| workspace | warning | duplicate | `r-efi@5.3.0`, `r-efi@6.0.0` | found 2 duplicate entries for crate 'r-efi' |
| workspace | warning | duplicate | `selectors@0.38.0`, `selectors@0.41.0` | found 2 duplicate entries for crate 'selectors' |
| workspace | warning | duplicate | `serde_spanned@0.6.9`, `serde_spanned@1.1.3` | found 2 duplicate entries for crate 'serde_spanned' |
| workspace | warning | duplicate | `servo_arc@0.4.3`, `servo_arc@0.5.0` | found 2 duplicate entries for crate 'servo_arc' |
| workspace | warning | duplicate | `string_cache@0.9.0`, `string_cache@0.11.0` | found 2 duplicate entries for crate 'string_cache' |
| workspace | warning | duplicate | `string_cache_codegen@0.6.1`, `string_cache_codegen@0.11.2` | found 2 duplicate entries for crate 'string_cache_codegen' |
| workspace | warning | duplicate | `syn@1.0.109`, `syn@2.0.117`, `syn@3.0.10` | found 3 duplicate entries for crate 'syn' |
| workspace | warning | duplicate | `thiserror@1.0.69`, `thiserror@2.0.21` | found 2 duplicate entries for crate 'thiserror' |
| workspace | warning | duplicate | `thiserror-impl@1.0.69`, `thiserror-impl@2.0.21` | found 2 duplicate entries for crate 'thiserror-impl' |
| workspace | warning | duplicate | `toml@0.8.2`, `toml@0.9.12+spec-1.1.0`, `toml@1.2.1+spec-1.1.0` | found 3 duplicate entries for crate 'toml' |
| workspace | warning | duplicate | `toml_datetime@0.6.3`, `toml_datetime@0.7.5+spec-1.1.0`, `toml_datetime@1.1.3+spec-1.1.0` | found 3 duplicate entries for crate 'toml_datetime' |
| workspace | warning | duplicate | `toml_edit@0.19.15`, `toml_edit@0.20.2`, `toml_edit@0.25.8+spec-1.1.0` | found 3 duplicate entries for crate 'toml_edit' |
| workspace | warning | duplicate | `web_atoms@0.2.3`, `web_atoms@0.3.0` | found 2 duplicate entries for crate 'web_atoms' |
| workspace | warning | duplicate | `windows-sys@0.45.0`, `windows-sys@0.59.0`, `windows-sys@0.61.2` | found 3 duplicate entries for crate 'windows-sys' |
| workspace | warning | duplicate | `windows-targets@0.42.2`, `windows-targets@0.52.6` | found 2 duplicate entries for crate 'windows-targets' |
| workspace | warning | duplicate | `windows_aarch64_gnullvm@0.42.2`, `windows_aarch64_gnullvm@0.52.6` | found 2 duplicate entries for crate 'windows_aarch64_gnullvm' |
| workspace | warning | duplicate | `windows_aarch64_msvc@0.42.2`, `windows_aarch64_msvc@0.52.6` | found 2 duplicate entries for crate 'windows_aarch64_msvc' |
| workspace | warning | duplicate | `windows_i686_gnu@0.42.2`, `windows_i686_gnu@0.52.6` | found 2 duplicate entries for crate 'windows_i686_gnu' |
| workspace | warning | duplicate | `windows_i686_msvc@0.42.2`, `windows_i686_msvc@0.52.6` | found 2 duplicate entries for crate 'windows_i686_msvc' |
| workspace | warning | duplicate | `windows_x86_64_gnu@0.42.2`, `windows_x86_64_gnu@0.52.6` | found 2 duplicate entries for crate 'windows_x86_64_gnu' |
| workspace | warning | duplicate | `windows_x86_64_gnullvm@0.42.2`, `windows_x86_64_gnullvm@0.52.6` | found 2 duplicate entries for crate 'windows_x86_64_gnullvm' |
| workspace | warning | duplicate | `windows_x86_64_msvc@0.42.2`, `windows_x86_64_msvc@0.52.6` | found 2 duplicate entries for crate 'windows_x86_64_msvc' |
| workspace | warning | duplicate | `winnow@0.5.40`, `winnow@0.7.15`, `winnow@1.0.0` | found 3 duplicate entries for crate 'winnow' |
| workspace | error | unsound | `glib@0.18.5` | ID: RUSTSEC-2024-0429 |
| workspace | error | unmaintained | `pin-utils@0.1.0` | ID: RUSTSEC-2026-0441 |
| workspace | error | unmaintained | `proc-macro-error@1.0.4` | ID: RUSTSEC-2024-0370 |
| wasm | error | rejected | `unicode-ident@1.0.24` | (MIT OR Apache-2.0) AND Unicode-3.0 |
| wasm | error | wildcard | `irig106-studio-wasm@0.1.0` | Internal core path dependency has no version requirement |

Chrono 0.4.44 is locked via serde_with but absent from cargo-deny's active
feature graph. RUSTSEC-2026-0543 is therefore covered by the additional complete
lockfile audit. Final lockfile findings are reported with exact CI logs in the PR.

## Owner approval proposals — not applied

No ignore is present in `deny.toml`, and no cargo-audit ignore config is added.
The following are exact proposed cargo-deny entries for owner consideration,
not permission to dismiss a GitHub alert or to claim any advisory is fixed:

```toml
# PROPOSAL ONLY: add inside [advisories] only after explicit owner approval.
ignore = [
  { id = "RUSTSEC-2024-0429", reason = "Temporary Tauri GTK 0.18 / glib 0.18.5 dependency; alert #1 stays OPEN. Upstream upgrade tracked at https://github.com/tauri-apps/tauri/issues/16264 ; re-check every GTK/Tauri dependency change." },
  { id = "RUSTSEC-2026-0543", reason = "Locked chrono 0.4.44 is transitive via serde_with; no patched version for this unmaintained advisory. Track https://github.com/chronotope/chrono/issues/1768 and re-check every serde_with update." },
  { id = "RUSTSEC-2026-0441", reason = "Transitive pin-utils 0.1.0 via hyper; upstream repository archived, no safe upgrade. Track https://github.com/rust-lang/team/pull/2787 ; remove or replace through upstream dependency updates." },
  { id = "RUSTSEC-2024-0370", reason = "Transitive proc-macro-error 1.0.4 via glib-macros/gtk3-macros; no maintained safe release. Track https://gitlab.com/CreepySkeleton/proc-macro-error/-/issues/20 and re-check GTK macro upgrades." },
]
```

Any approved exception must be reconciled with both auditors. cargo-audit uses
string IDs (rather than cargo-deny's reason objects); an equivalent proposed
`.cargo/audit.toml` section would be:

```toml
# PROPOSAL ONLY, not a file added by this PR.
[advisories]
ignore = ["RUSTSEC-2024-0429", "RUSTSEC-2026-0543", "RUSTSEC-2026-0441", "RUSTSEC-2024-0370"]
```

Keep the reasons and review triggers above as the owner-approved record if
exceptions are accepted. No new upstream report is needed for glib; its existing
[exception record](2026-11-16-security-remediation.md) and open alert remain.

Other decisions needed before the new job can pass:

- Review the five additional SPDX terms surfaced by the minimal allow-list:
  `BSD-3-Clause`, `MPL-2.0`, `Zlib`, `Unicode-3.0`, and
  `Apache-2.0 WITH LLVM-exception`. No license allow-list expansion or license
  exception has been silently added.
- Confirm the desktop package's license metadata. Its manifest lacks a license
  field, while the repository's `LICENSE` contains Apache-2.0. Do not ignore an
  unlicensed-package finding in place of confirming and declaring the license.
- Decide whether the two internal core path dependencies should specify their
  existing package version (`version = "0.1.0"`) or receive an explicitly
  approved path-only wildcard policy. Neither change is applied here.
- Retain duplicate-version warnings for upstream review; no skip-tree or
  duplicate ignore is proposed. These warnings do not independently fail the job.
