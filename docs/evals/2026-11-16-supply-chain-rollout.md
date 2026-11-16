# Supply-chain rollout — 2026-11-16

Scope: IRIG106-Studio workflows/docs and the assigned Dependabot configuration
under the owner's security program. Base GitHub main:
`434c57dd6b4d107bcd67ed4c2c70e03b4f8b0985`.
No application, manifest, lockfile, release, package publishing, credential,
repository setting or unpublished local TMATS documentation changes.

## Reviewed templates and preserved behavior

Scorecard and zizmor workflows are copied byte for byte from the
[reviewed irig106-types pilot at 2899b30](https://github.com/TelemetryWorks/irig106-types/tree/2899b30e338358eb2a52d12e036ff979bc25bcf5/.github/workflows).
The [Pelorus rollout evidence](https://github.com/TelemetryWorks/pelorus/blob/2be7c489e8695d271c6630b7c46347235726fd8c/docs/evals/2026-11-16-supply-chain-rollout.md)
supplies the rollout boundaries and validation precedent.

- Scorecard runs on main pushes and weekly, never PRs. Workflow permissions
  default to `contents: read`; only its analysis job grants
  `security-events: write` for SARIF and `id-token: write` for Scorecard results.
  Security-result publication is part of the exact pilot, not package publishing.
  The artifact is retained for five days. The README uses the exact pilot badge
  form with the repository changed to `TelemetryWorks/irig106-studio`.
- zizmor 1.32.0 audits the workflow directory on workflow-changing PRs to main.
  Default regular persona, online audits and failing audit mode
  (`advanced-security: false`) are retained. No extra SARIF permissions are added.
- Every workflow defaults to `contents: read`; every checkout disables credential
  persistence. All 15 direct action references have full verified SHAs and matching
  version comments. No `pull_request_target` event is present.
- Existing CI keeps its Frontend, Rust workspace (core + Tauri), and WASM jobs.
  Triggers, job names, runners, step ordering, Node 22, Rust stable selection,
  compiler components/targets, commands, test gates and cache paths/keys are
  unchanged. Its only changes are action pinning, checkout credential persistence
  and default read permissions. The existing v4 action refs are pinned to their
  current upstream targets rather than upgraded to the pilot's newer majors.
  Pinning the Rust action's `stable` branch snapshot does not pin or change the
  selected Rust compiler. Existing installer commands remain unchanged.
- Dependabot covers GitHub Actions at `/`, npm at `/` with the existing root
  package-lock, and every tracked Cargo manifest directory explicitly:
  `/`, `/src-tauri`, `/crates/irig106-studio-core`,
  `/crates/irig106-studio-wasm`, and `/crates/irig106-studio-core/fuzz`.
  Each ecosystem runs weekly, limits open PRs to five, groups minor/patch updates
  and uses the `chore(deps)` commit prefix. Major updates stay outside those
  groups. No dependency or lock records change in this rollout.

## Direct actions and upstream verification

`git ls-remote` resolved each upstream version to its commit, using peeled
annotated tags where necessary. The Rust action's upstream `stable` branch was
resolved on 2026-11-16. The Scorecard and zizmor input contracts were inspected
at their exact pinned commits, including the latter's default regular persona
and online audits.

| Repository | Version comment | Verified commit |
| --- | --- | --- |
| actions/checkout (existing CI) | v4.4.0 | `11d5960a326750d5838078e36cf38b85af677262` |
| actions/setup-node | v4.4.0 | `49933ea5288caeca8642d1e84afbd3f7d6820020` |
| actions/cache | v4.3.0 | `0057852bfaa89a56745cba8c7296529d2fc39830` |
| dtolnay/rust-toolchain | stable (2026-11-16) | `39008827e6b4319a349e9a42dfc90579dd25f1ca` |
| actions/checkout (pilot) | v7.0.1 | `3d3c42e5aac5ba805825da76410c181273ba90b1` |
| ossf/scorecard-action | v2.5.0 | `fa7117db83c52d787ae5a89f350999701505d78e` |
| actions/upload-artifact | v7.0.2 | `cf430e030ddbb5b0abf93d22962f4752f3646cd9` |
| github/codeql-action/upload-sarif | v4.39.3 | `33d7b85da1a04171e211befe2c739303b9a4c066` |
| zizmorcore/zizmor-action | v0.8.1 | `45d7276c9ca790aabd705e31ca99c6185c3e76dd` |

## Executed validation and limits

Executed on the restored x86_64 cloud host:

- actionlint 1.7.12 passes all three workflows with its default invocation.
  Optional shellcheck/pyflakes tools are not installed.
- zizmor 1.32.0 offline regular-persona audit of all workflows passes with zero
  reportable findings, including with `--no-ignores --no-config`. A default-mode
  attempt also selected offline mode because no audit token was supplied; it is
  not claimed as an online audit. Hosted zizmor retains online audits.
- The four findings omitted by the built-in regular persona are pedantic-only:
  two concurrency advisories and two Rust-setup superfluous-action advisories.
  No repository ignores, filters, inline suppressions or persona overrides were
  added, and existing CI behavior was not changed to satisfy pedantic advice.
- A separate strict-collection Dependabot audit parses the configuration but
  reports three `dependabot-cooldown` advisories, one per ecosystem. As in the
  reviewed rollout, the assigned policy has no cooldown. No suppression or new
  update policy was introduced; this supplemental audit is not claimed clean.
  The assigned hosted zizmor workflow audits workflows, exactly as in the pilot.
- Verified both template files' exact bytes, direct SHA/version pairs, read
  permission defaults, checkout inputs and absence of PR-target events. Parsed
  the old and hardened CI and proved equality after normalizing only the three
  hardening changes: action refs, credential persistence and default permissions.
- Parsed Dependabot policy and matched its Cargo directories to all five tracked
  manifests; verified npm's root package-lock, weekly schedules, limits, groups
  and prefixes. Checked unchanged source/manifests/locks and `git diff --check`.

These are executed static checks, not local application build/test claims.
Application dependencies and native caches were not provisioned for this
workflows/docs change. Ordinary hosted PR CI must evaluate the exact review
head. Scorecard runs only after merge or on its schedule: its first score,
OIDC issuance, SARIF upload and badge value are not validated by the PR.
No manual run, merge, package publication or settings write is performed here.
