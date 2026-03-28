/**
 * Toolbar — top bar with menus, transport controls, time display,
 * and theme toggle.
 *
 * Requirements traced:
 *   L2-NAV-040   Transport control buttons SHALL be displayed
 *   L2-NAV-050   IRIG time SHALL use DOY:HH:MM:SS.μμμμμμ format
 *   L2-THEME-010 System SHALL support dark and light themes
 */

import type { Theme } from "./theme-switcher";

export function createToolbar(container: HTMLElement): {
  setTime(formatted: string): void;
  setVersion(ver: string): void;
  setThemeIcon(theme: Theme): void;
  onOpen(cb: () => void): void;
  onThemeToggle(cb: () => void): void;
} {
  let openCb: (() => void) | null = null;
  let themeToggleCb: (() => void) | null = null;

  container.classList.add("toolbar", "no-select");
  container.setAttribute("role", "toolbar");
  container.setAttribute("aria-label", "Main toolbar");
  container.innerHTML = `
    <span class="toolbar__brand">IRIG106-Studio</span>
    <button class="toolbar__menu-item" data-action="open" aria-label="Open file (Ctrl+O)">File</button>
    <button class="toolbar__menu-item" aria-label="View options">View</button>
    <button class="toolbar__menu-item" aria-label="Tools">Tools</button>
    <span class="toolbar__sep" aria-hidden="true"></span>
    <div class="toolbar__transport" role="group" aria-label="Transport controls">
      <button class="toolbar__transport-btn" title="First packet (Home)" aria-label="First packet">⏮</button>
      <button class="toolbar__transport-btn" title="Step back (←)" aria-label="Step back">⏪</button>
      <button class="toolbar__transport-btn toolbar__transport-btn--play" title="Play (Space)" aria-label="Play or pause">▶</button>
      <button class="toolbar__transport-btn" title="Step forward (→)" aria-label="Step forward">⏩</button>
      <button class="toolbar__transport-btn" title="Last packet (End)" aria-label="Last packet">⏭</button>
    </div>
    <span class="toolbar__sep" aria-hidden="true"></span>
    <span class="toolbar__time" id="toolbar-time" role="status" aria-label="Current IRIG time">---:--:--:--.------</span>
    <span class="toolbar__spacer"></span>
    <button class="toolbar__theme-toggle" id="theme-toggle" title="Toggle theme (Ctrl+Shift+T)" aria-label="Toggle dark and light theme">
      <span id="theme-icon" aria-hidden="true">◐</span>
    </button>
    <span class="toolbar__sep" aria-hidden="true"></span>
    <span class="toolbar__version" id="toolbar-version" aria-label="IRIG standard version">---</span>
  `;

  const timeEl = container.querySelector("#toolbar-time") as HTMLElement;
  const versionEl = container.querySelector("#toolbar-version") as HTMLElement;
  const fileBtn = container.querySelector('[data-action="open"]') as HTMLElement;
  const themeBtn = container.querySelector("#theme-toggle") as HTMLElement;
  const themeIcon = container.querySelector("#theme-icon") as HTMLElement;

  fileBtn.addEventListener("click", () => openCb?.());
  themeBtn.addEventListener("click", () => themeToggleCb?.());

  return {
    setTime(formatted: string) {
      timeEl.textContent = formatted;
    },
    setVersion(ver: string) {
      versionEl.textContent = `IRIG ${ver} | Ch10`;
    },
    setThemeIcon(theme: Theme) {
      // ◐ = half moon (dark), ○ = circle (light)
      themeIcon.textContent = theme === "dark" ? "◐" : "○";
      themeBtn.title = `Switch to ${theme === "dark" ? "light" : "dark"} theme (Ctrl+Shift+T)`;
    },
    onOpen(cb: () => void) {
      openCb = cb;
    },
    onThemeToggle(cb: () => void) {
      themeToggleCb = cb;
    },
  };
}
