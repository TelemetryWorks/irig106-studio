# ADR-009: Rust 1.90 minimum for the Studio desktop app

| Field | Value |
| --- | --- |
| Status | **Accepted** |
| Date | 2026-11-16 |
| Decision by | Owner |

## Context

The combined Dependabot #19/#20 update needs matching Rust and JavaScript Tauri
releases. JavaScript dialog 2.8.4 requires the Rust dialog 2.8.x line. Published
Rust dialog 2.8.0/2.8.4 require Tauri ^2.12 and Rust 1.90; Tauri 2.12 also
requires Rust 1.90. Studio's previous resolved dependencies already required
Rust 1.88 (serde_with 3.21.0 and time 0.3.47), despite the contributor guide's
stale Rust 1.77 prerequisite.

## Decision

The owner approved raising **the Studio desktop app** minimum to Rust 1.90.
Declare `rust-version = "1.90"` on the `src-tauri` application package and
correct the contributor prerequisite. Align Tauri at Rust 2.12.x / JavaScript
2.12.x and dialog at 2.8.4 on both sides. CI continues using stable Rust.

The IRIG 106 library-crate Rust 1.85 policy is unchanged. Do not propagate the
desktop package's Rust 1.90 declaration into the core, WASM, or other library
crates as part of this update.

## Alternatives Considered

Holding the dependency pair at the previous releases would avoid this minimum
increase but would defer the approved combined update. Updating only one side
would retain or introduce a Rust/JavaScript mismatch.

## Consequences

Studio desktop contributors using Rust 1.88/1.89 must upgrade to at least 1.90.
The Tauri update does not fix the separately documented glib exception. A CI
guard checks installed Rust/JavaScript release alignment through `tauri info`.
