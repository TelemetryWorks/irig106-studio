/**
 * Shortcuts Overlay — Modal showing all keyboard shortcuts.
 *
 * Triggered by pressing "?" or F1. Dismissed by Escape, clicking
 * outside, or pressing "?" again.
 *
 * Requirements traced:
 *   L2-UI-KEYS-040  Shortcut help overlay SHALL be togglable via "?"
 *   L2-UI-HELP-010  Overlay SHALL group shortcuts by category
 *   L2-UI-HELP-020  Overlay SHALL display platform-correct modifiers
 *   L2-UI-HELP-030  Overlay SHALL be dismissible via Escape or click-outside
 */

import { getGroupedShortcuts, formatShortcut } from "./keyboard-shortcuts";

// ── State ──

let overlayEl: HTMLElement | null = null;
let isVisible = false;

// ── Public API ──

export function toggleShortcutsOverlay(): void {
  if (isVisible) {
    hideShortcutsOverlay();
  } else {
    showShortcutsOverlay();
  }
}

export function showShortcutsOverlay(): void {
  if (isVisible) return;
  isVisible = true;

  if (!overlayEl) {
    overlayEl = createOverlayElement();
    document.body.appendChild(overlayEl);
  }

  // Force reflow before adding visible class for transition
  void overlayEl.offsetHeight;
  overlayEl.classList.add("shortcuts-overlay--visible");

  // Dismiss on Escape
  document.addEventListener("keydown", onEscape);
}

export function hideShortcutsOverlay(): void {
  if (!isVisible) return;
  isVisible = false;

  overlayEl?.classList.remove("shortcuts-overlay--visible");
  document.removeEventListener("keydown", onEscape);
}

// ── Event handlers ──

function onEscape(e: KeyboardEvent) {
  if (e.key === "Escape") {
    e.preventDefault();
    hideShortcutsOverlay();
  }
}

// ── DOM construction ──

function createOverlayElement(): HTMLElement {
  const el = document.createElement("div");
  el.className = "shortcuts-overlay";

  const groups = getGroupedShortcuts();
  const categoryLabels: Record<string, string> = {
    file: "File",
    transport: "Transport",
    view: "Viewport tabs",
    navigation: "Navigation",
    app: "Application",
  };

  // Category display order
  const categoryOrder = ["file", "transport", "view", "navigation", "app"];

  let sectionsHtml = "";
  for (const cat of categoryOrder) {
    const shortcuts = groups.get(cat);
    if (!shortcuts || shortcuts.length === 0) continue;

    const rows = shortcuts
      .map(
        (s) => `
      <div class="shortcuts-overlay__row">
        <span class="shortcuts-overlay__label">${escHtml(s.label)}</span>
        <kbd class="shortcuts-overlay__kbd">${escHtml(formatShortcut(s))}</kbd>
      </div>
    `
      )
      .join("");

    sectionsHtml += `
      <div class="shortcuts-overlay__section">
        <div class="shortcuts-overlay__section-title">${categoryLabels[cat] ?? cat}</div>
        ${rows}
      </div>
    `;
  }

  el.innerHTML = `
    <div class="shortcuts-overlay__backdrop" data-dismiss></div>
    <div class="shortcuts-overlay__dialog">
      <div class="shortcuts-overlay__header">
        <span class="shortcuts-overlay__title">Keyboard shortcuts</span>
        <button class="shortcuts-overlay__close" data-dismiss title="Close">✕</button>
      </div>
      <div class="shortcuts-overlay__body">
        ${sectionsHtml}
      </div>
    </div>
  `;

  // Click-outside and close button dismiss
  el.addEventListener("click", (e) => {
    if ((e.target as HTMLElement).hasAttribute("data-dismiss")) {
      hideShortcutsOverlay();
    }
  });

  return el;
}

function escHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
