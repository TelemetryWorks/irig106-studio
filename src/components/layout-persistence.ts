/**
 * Layout Persistence — saves and restores panel sizes and collapsed
 * states to localStorage.
 *
 * Requirements traced:
 *   L2-LAYOUT-080  Panel sizes SHALL persist across sessions
 */

const STORAGE_KEY = "irig106-studio-layout";

export interface LayoutState {
  sidebarWidth: number | null;
  propsWidth: number | null;
  bottomHeight: number | null;
  sidebarCollapsed: boolean;
  propsCollapsed: boolean;
  bottomCollapsed: boolean;
}

const DEFAULTS: LayoutState = {
  sidebarWidth: null,
  propsWidth: null,
  bottomHeight: null,
  sidebarCollapsed: false,
  propsCollapsed: false,
  bottomCollapsed: false,
};

export function loadLayout(): LayoutState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULTS };
    return { ...DEFAULTS, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULTS };
  }
}

export function saveLayout(state: LayoutState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // localStorage may be full or unavailable
  }
}
