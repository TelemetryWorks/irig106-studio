/**
 * Theme Switcher — toggles between dark and light themes.
 *
 * Applies [data-theme="dark"|"light"] to <html>.
 * Persists preference in localStorage.
 * Exposes a simple toggle/get API consumed by the toolbar.
 *
 * Requirements traced:
 *   L2-THEME-010  System SHALL support dark and light themes
 *   L2-THEME-020  Theme selection SHALL persist across sessions
 *   L2-THEME-030  Theme switch SHALL not require page reload
 */

export type Theme = "dark" | "light";

const STORAGE_KEY = "irig106-studio-theme";

let currentTheme: Theme;

/** Initialize theme from localStorage or default to dark. */
export function initTheme(): Theme {
  const stored = localStorage.getItem(STORAGE_KEY) as Theme | null;
  currentTheme = stored === "light" ? "light" : "dark";
  applyTheme(currentTheme);
  return currentTheme;
}

/** Toggle between dark and light. Returns the new theme. */
export function toggleTheme(): Theme {
  currentTheme = currentTheme === "dark" ? "light" : "dark";
  applyTheme(currentTheme);
  localStorage.setItem(STORAGE_KEY, currentTheme);
  return currentTheme;
}

/** Get current theme without changing it. */
export function getTheme(): Theme {
  return currentTheme;
}

/** Set a specific theme. */
export function setTheme(theme: Theme): void {
  currentTheme = theme;
  applyTheme(currentTheme);
  localStorage.setItem(STORAGE_KEY, currentTheme);
}

function applyTheme(theme: Theme): void {
  document.documentElement.setAttribute("data-theme", theme);
}
