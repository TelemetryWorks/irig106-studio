# ADR-005: Centralized Keyboard Shortcut System

| Field         | Value                              |
|---------------|------------------------------------|
| Status        | **Accepted**                       |
| Date          | 2026-03-28                         |
| Decision by   | Joey                               |
| Traces to     | L1-APP-020, L2-UI-KEYS-010 thru -110 |

## Context

Flight test engineers need keyboard-driven workflows. The application
must support shortcuts for file operations, transport controls, tab
switching, and channel navigation. The system must be discoverable
(help overlay), safe (no interference with text inputs), and
cross-platform (Cmd vs Ctrl).

## Decision

Implement a centralized declarative keymap in `keyboard-shortcuts.ts`.
All shortcuts are defined as data (an array of `Shortcut` objects) and
matched against `KeyboardEvent` in a single listener. A string-based
action identifier is dispatched to a callback in `main.ts`, which routes
it to the appropriate component method.

### Architecture

```
KeyboardEvent
    │
    ▼
initKeyboardShortcuts()          ← single document-level listener
    │  matches against KEYMAP[]
    ▼
handler(action: string)          ← callback in main.ts
    │  switch on action
    ▼
component.method()               ← e.g. viewport.setActiveTab("hex")
```

### Keymap (v0.1.0)

| Action               | Shortcut        | Category    |
|----------------------|-----------------|-------------|
| file.open            | Ctrl/⌘+O       | File        |
| transport.play       | Space           | Transport   |
| transport.first      | Home            | Transport   |
| transport.last       | End             | Transport   |
| transport.back       | ←               | Transport   |
| transport.forward    | →               | Transport   |
| view.waveform        | Alt+1           | View        |
| view.hex             | Alt+2           | View        |
| view.packets         | Alt+3           | View        |
| view.tmats           | Alt+4           | View        |
| bottom.console       | Alt+Shift+1     | Navigation  |
| bottom.statistics    | Alt+Shift+2     | Navigation  |
| bottom.timecorr      | Alt+Shift+3     | Navigation  |
| bottom.errors        | Alt+Shift+4     | Navigation  |
| nav.channel.up       | Alt+↑           | Navigation  |
| nav.channel.down     | Alt+↓           | Navigation  |
| app.shortcuts        | ? or F1         | App         |

## Rationale

1. **Declarative keymap.** All shortcuts are visible in one array.
   Adding a new shortcut is a one-line addition to `KEYMAP[]` plus a
   handler case in `main.ts`. No per-component event binding.

2. **Input safety.** The listener checks `e.target.tagName` and
   `isContentEditable` before matching. This prevents shortcuts from
   firing when the user is typing in a future search field or TMATS
   editor.

3. **Cross-platform modifiers.** `navigator.platform` detects macOS
   and maps `s.mod` to `metaKey` (⌘) vs `ctrlKey`. The help overlay
   displays the correct symbols per platform.

4. **Help overlay as documentation.** The "?" shortcut opens a modal
   that is auto-generated from the same `KEYMAP[]` array. The
   documentation can never drift from the implementation.

5. **No third-party library.** Hotkey libraries (Mousetrap, tinykeys)
   add dependency weight for a problem that takes ~80 lines of vanilla
   TypeScript. The matching logic is simple and fully owned.

## Consequences

- **Shortcut conflicts with browser.** Some shortcuts (e.g. Ctrl+O)
  overlap with browser defaults. `e.preventDefault()` suppresses the
  browser action. In Tauri mode, browser shortcuts are not relevant.

- **No chords or sequences.** The system supports single keystrokes
  with modifiers but not multi-key sequences (e.g. "g then g" for
  Vim-style navigation). This is acceptable for the current scope.

- **Alt key on Windows.** Alt+number is used for viewport tabs. On
  Windows, Alt alone activates the menu bar in some contexts. Tauri's
  webview does not have a native menu bar, so this is not an issue.
