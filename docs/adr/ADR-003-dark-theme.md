# ADR-003: Dark IDE Theme (Omniverse Aesthetic)

| Field         | Value                              |
|---------------|------------------------------------|
| Status        | **Accepted**                       |
| Date          | 2026-03-28                         |
| Decision by   | Joey                               |
| Traces to     | L1-APP-010                         |

## Context

IRIG106-Studio is a professional data analysis tool used in flight test
labs. The visual design must convey competence and reduce eye strain
during extended sessions. The reference application is NVIDIA Isaac Sim /
Omniverse, which uses a dark panel-based layout common to professional
workstations (Unreal Editor, Unity, DaVinci Resolve, VS Code).

## Decision

Adopt a dark-first design system with a three-tier surface hierarchy
and NVIDIA Omniverse-inspired green accent, defined entirely in CSS
custom properties in `src/styles/tokens.css`.

### Surface hierarchy

| Token           | Hex       | Usage                              |
|-----------------|-----------|------------------------------------|
| `--c-base`      | `#1a1a1e` | App background, toolbar            |
| `--c-surface`   | `#222226` | Panel backgrounds                  |
| `--c-raised`    | `#2a2a2f` | Active tabs, hover states, inputs  |

### Accent

| Token           | Hex       | Usage                              |
|-----------------|-----------|------------------------------------|
| `--c-accent`    | `#76b900` | Resize handles, active tab border  |
| `--c-accent-text`| `#8fd11a`| Brand name, time display           |

### Data type badges

Each IRIG 106 data type gets a distinct badge color with both a
foreground and a low-opacity background token (e.g. `--c-dt-1553` and
`--c-dt-1553-bg`). This allows instant visual identification of channel
types in the tree and packet table.

## Rationale

1. **Eye strain.** Flight test engineers may stare at waveform data for
   hours. A dark theme with high-contrast text on dark surfaces is the
   industry standard for this class of tool.

2. **Professional credibility.** A dark IDE theme signals "engineering
   tool" rather than "consumer app." This matters for adoption in
   aerospace organizations where tool trust is earned through
   appearance as much as function.

3. **Consistent with reference.** NVIDIA Isaac Sim, the explicit
   design reference, uses this exact pattern. Users of Omniverse,
   Unreal, or Unity will feel immediately at home.

4. **CSS variables only.** All colors are tokens, not hardcoded hex
   values in component code. This makes future theme customization
   (high-contrast mode, light theme) a single-file change.

## Consequences

- **No light theme initially.** A light theme is possible (swap
  token values) but is not planned for v0.1. The dark theme is the
  only supported mode.

- **Font choices.** Inter for UI text, JetBrains Mono for data.
  Both are freely available and widely installed. Fallback stacks
  are provided for systems without these fonts.

- **Scrollbar styling.** Custom scrollbar CSS is WebKit-only. Firefox
  and legacy browsers get system scrollbars, which is acceptable.
