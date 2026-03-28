# Architecture Decision Records

| ADR   | Title                                 | Status   | Date       |
|-------|---------------------------------------|----------|------------|
| [001](ADR-001-tauri-v2.md)             | Tauri v2 for desktop deployment       | Accepted | 2026-03-28 |
| [002](ADR-002-platform-abstraction.md) | Platform abstraction layer            | Accepted | 2026-03-28 |
| [003](ADR-003-dark-theme.md)           | Dark IDE theme (Omniverse aesthetic)  | Accepted | 2026-03-28 |
| [004](ADR-004-vanilla-typescript.md)   | Vanilla TypeScript components         | Accepted | 2026-03-28 |
| [005](ADR-005-keyboard-shortcuts.md)   | Centralized keyboard shortcut system  | Accepted | 2026-03-28 |
| [006](ADR-006-domain-types.md)         | Domain type system as UI–backend contract | Accepted | 2026-03-28 |

## Template for new ADRs

```markdown
# ADR-NNN: Title

| Field         | Value                              |
|---------------|------------------------------------|
| Status        | **Proposed** / **Accepted** / **Superseded by ADR-XXX** |
| Date          | YYYY-MM-DD                         |
| Decision by   | Name                               |
| Traces to     | L1-XXX-NNN, L2-YYY-NNN            |

## Context
What is the problem or situation that requires a decision?

## Alternatives Considered
What options were evaluated?

## Decision
What was decided?

## Rationale
Why was this option chosen over the alternatives?

## Consequences
What are the trade-offs, risks, and follow-up actions?
```
