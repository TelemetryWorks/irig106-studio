/**
 * ContextMenu — lightweight right-click menu.
 *
 * Usage:
 *   const menu = createContextMenu();
 *   element.addEventListener("contextmenu", (e) => {
 *     menu.show(e.clientX, e.clientY, [
 *       { label: "Copy hex", action: () => ... },
 *       { separator: true },
 *       { label: "Jump to offset", action: () => ... },
 *     ]);
 *   });
 *
 * Requirements traced:
 *   L2-UI-CTX-010  Context menus SHALL appear on right-click
 *   L2-UI-CTX-020  Context menus SHALL dismiss on click-outside or Escape
 */

export interface MenuAction {
  label: string;
  action: () => void;
  disabled?: boolean;
}

export interface MenuSeparator {
  separator: true;
}

export type MenuItem = MenuAction | MenuSeparator;

function isSeparator(item: MenuItem): item is MenuSeparator {
  return "separator" in item && item.separator === true;
}

export interface ContextMenuAPI {
  show(x: number, y: number, items: MenuItem[]): void;
  hide(): void;
}

export function createContextMenu(): ContextMenuAPI {
  const el = document.createElement("div");
  el.className = "ctx-menu";
  document.body.appendChild(el);

  let visible = false;

  function show(x: number, y: number, items: MenuItem[]) {
    el.innerHTML = items
      .map((item) => {
        if (isSeparator(item)) {
          return `<div class="ctx-menu__sep"></div>`;
        }
        const cls = item.disabled ? "ctx-menu__item ctx-menu__item--disabled" : "ctx-menu__item";
        return `<div class="${cls}" data-ctx-action>${escHtml(item.label)}</div>`;
      })
      .join("");

    // Bind click handlers
    let actionIndex = 0;
    el.querySelectorAll("[data-ctx-action]").forEach((node) => {
      // Find the corresponding non-separator item
      while (actionIndex < items.length && isSeparator(items[actionIndex])) actionIndex++;
      if (actionIndex >= items.length) return;

      const menuAction = items[actionIndex] as MenuAction;
      if (!menuAction.disabled) {
        node.addEventListener("click", () => {
          menuAction.action();
          hide();
        });
      }
      actionIndex++;
    });

    // Position — keep within viewport
    el.style.left = `${x}px`;
    el.style.top = `${y}px`;
    el.classList.add("ctx-menu--visible");
    visible = true;

    // Adjust if overflowing viewport
    requestAnimationFrame(() => {
      const rect = el.getBoundingClientRect();
      if (rect.right > window.innerWidth) {
        el.style.left = `${x - rect.width}px`;
      }
      if (rect.bottom > window.innerHeight) {
        el.style.top = `${y - rect.height}px`;
      }
    });

    // Dismiss listeners
    document.addEventListener("click", onClickOutside);
    document.addEventListener("contextmenu", onClickOutside);
    document.addEventListener("keydown", onEscape);
  }

  function hide() {
    el.classList.remove("ctx-menu--visible");
    visible = false;
    document.removeEventListener("click", onClickOutside);
    document.removeEventListener("contextmenu", onClickOutside);
    document.removeEventListener("keydown", onEscape);
  }

  function onClickOutside() {
    if (visible) hide();
  }

  function onEscape(e: KeyboardEvent) {
    if (e.key === "Escape") hide();
  }

  return { show, hide };
}

function escHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
