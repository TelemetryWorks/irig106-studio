/**
 * Keyboard Shortcuts — Centralized keymap and action dispatch.
 *
 * Design:
 *   - All shortcuts are registered in a single declarative map
 *   - Actions are string identifiers dispatched to a callback
 *   - Modifier detection is cross-platform (Cmd on macOS, Ctrl elsewhere)
 *   - Shortcuts are disabled when focus is in an input/textarea
 *
 * Requirements traced:
 *   L2-UI-KEYS-010  Keyboard shortcut system SHALL be centralized
 *   L2-UI-KEYS-020  Shortcuts SHALL NOT fire when typing in inputs
 *   L2-UI-KEYS-030  System SHALL support Cmd/Ctrl modifier abstraction
 *   L2-UI-KEYS-040  Shortcut help overlay SHALL be togglable via "?"
 */

// ── Types ──

export interface Shortcut {
  /** Unique action identifier (e.g. "file.open", "transport.play") */
  action: string;
  /** Human-readable label for the help overlay */
  label: string;
  /** Category for grouping in the help overlay */
  category: "file" | "transport" | "navigation" | "view" | "app";
  /** Key code (KeyboardEvent.key) */
  key: string;
  /** Require Ctrl (or Cmd on macOS) */
  mod?: boolean;
  /** Require Shift */
  shift?: boolean;
  /** Require Alt/Option */
  alt?: boolean;
}

export type ShortcutHandler = (action: string) => void;

// ── Keymap ──

export const KEYMAP: Shortcut[] = [
  // File
  { action: "file.open",          label: "Open file",             category: "file",       key: "o",         mod: true },

  // Transport
  { action: "transport.play",     label: "Play / Pause",          category: "transport",  key: " " },
  { action: "transport.first",    label: "Jump to first packet",  category: "transport",  key: "Home" },
  { action: "transport.last",     label: "Jump to last packet",   category: "transport",  key: "End" },
  { action: "transport.back",     label: "Step backward",         category: "transport",  key: "ArrowLeft" },
  { action: "transport.forward",  label: "Step forward",          category: "transport",  key: "ArrowRight" },

  // Navigation — viewport tabs
  { action: "view.waveform",      label: "Waveform tab",          category: "view",       key: "1",         alt: true },
  { action: "view.hex",           label: "Hex tab",               category: "view",       key: "2",         alt: true },
  { action: "view.packets",       label: "Packets tab",           category: "view",       key: "3",         alt: true },
  { action: "view.tmats",         label: "TMATS tab",             category: "view",       key: "4",         alt: true },

  // Navigation — bottom panel tabs
  { action: "bottom.console",     label: "Console tab",           category: "navigation", key: "1",         alt: true, shift: true },
  { action: "bottom.statistics",  label: "Statistics tab",        category: "navigation", key: "2",         alt: true, shift: true },
  { action: "bottom.timecorr",    label: "Time correlation tab",  category: "navigation", key: "3",         alt: true, shift: true },
  { action: "bottom.errors",      label: "Errors tab",            category: "navigation", key: "4",         alt: true, shift: true },

  // Navigation — channels
  { action: "nav.channel.up",     label: "Previous channel",      category: "navigation", key: "ArrowUp",   alt: true },
  { action: "nav.channel.down",   label: "Next channel",          category: "navigation", key: "ArrowDown", alt: true },
  { action: "nav.filter",         label: "Filter channels",       category: "navigation", key: "/" },

  // App
  { action: "app.shortcuts",      label: "Show keyboard shortcuts",category: "app",       key: "?" },
  { action: "app.shortcuts",      label: "Show keyboard shortcuts",category: "app",       key: "F1" },
  { action: "app.theme",          label: "Toggle theme",           category: "app",       key: "t",         mod: true, shift: true },
];

// ── Binding ──

/**
 * Initialize the keyboard shortcut system.
 *
 * @param handler — called with the action string when a shortcut fires
 * @returns cleanup function to remove the listener
 */
export function initKeyboardShortcuts(handler: ShortcutHandler): () => void {
  const isMac = navigator.platform?.includes("Mac") ?? false;

  function onKeyDown(e: KeyboardEvent) {
    // Don't intercept when typing in inputs
    const tag = (e.target as HTMLElement)?.tagName;
    if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
    if ((e.target as HTMLElement)?.isContentEditable) return;

    for (const shortcut of KEYMAP) {
      if (!matchesShortcut(e, shortcut, isMac)) continue;

      e.preventDefault();
      e.stopPropagation();
      handler(shortcut.action);
      return;
    }
  }

  document.addEventListener("keydown", onKeyDown);
  return () => document.removeEventListener("keydown", onKeyDown);
}

// ── Matching ──

function matchesShortcut(e: KeyboardEvent, s: Shortcut, isMac: boolean): boolean {
  // Key match (case-insensitive for letters)
  if (e.key !== s.key && e.key.toLowerCase() !== s.key.toLowerCase()) return false;

  // Modifier: Cmd on Mac, Ctrl elsewhere
  const modPressed = isMac ? e.metaKey : e.ctrlKey;
  if (s.mod && !modPressed) return false;
  if (!s.mod && modPressed) return false;

  // Shift
  if (s.shift && !e.shiftKey) return false;
  if (!s.shift && e.shiftKey && s.key !== "?") return false; // allow ? which needs shift

  // Alt
  if (s.alt && !e.altKey) return false;
  if (!s.alt && e.altKey) return false;

  return true;
}

// ── Display helpers ──

/** Format a shortcut for display in the help overlay */
export function formatShortcut(s: Shortcut): string {
  const isMac = navigator.platform?.includes("Mac") ?? false;
  const parts: string[] = [];

  if (s.mod)   parts.push(isMac ? "⌘" : "Ctrl");
  if (s.alt)   parts.push(isMac ? "⌥" : "Alt");
  if (s.shift) parts.push("⇧");

  // Pretty-print key names
  const keyLabel: Record<string, string> = {
    " ": "Space",
    "ArrowLeft": "←",
    "ArrowRight": "→",
    "ArrowUp": "↑",
    "ArrowDown": "↓",
    "Home": "Home",
    "End": "End",
    "F1": "F1",
    "?": "?",
  };

  parts.push(keyLabel[s.key] ?? s.key.toUpperCase());
  return parts.join(isMac ? "" : "+");
}

/**
 * Get unique shortcuts grouped by category for the help overlay.
 * Deduplicates by action (e.g. "?" and "F1" both map to app.shortcuts).
 */
export function getGroupedShortcuts(): Map<string, Shortcut[]> {
  const groups = new Map<string, Shortcut[]>();
  const seen = new Set<string>();

  for (const s of KEYMAP) {
    if (seen.has(s.action)) continue;
    seen.add(s.action);

    const list = groups.get(s.category) ?? [];
    list.push(s);
    groups.set(s.category, list);
  }

  return groups;
}
