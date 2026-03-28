/**
 * IRIG106-Studio — Main Entry Point
 *
 * Assembles the Isaac Sim-style panel layout and wires
 * all components to the platform adapter.
 *
 * Layout:
 *   ┌──────────────── toolbar ──────────────────┐
 *   ├──────────┬─────────────────┬──────────────┤
 *   │ sidebar  │  center-col     │  props-panel │
 *   │ (chans)  │  ┌───────────┐  │              │
 *   │          │  │ viewport  │  │              │
 *   │          │  ├───────────┤  │              │
 *   │          │  │ bottom    │  │              │
 *   │          │  └───────────┘  │              │
 *   ├──────────┴─────────────────┴──────────────┤
 *   └──────────────── statusbar ────────────────┘
 *
 * Requirements traced:
 *   L1-APP-010  Application SHALL display a docked panel layout
 *   L1-APP-020  Application SHALL support keyboard-driven navigation
 *   L1-APP-030  Application SHALL accept files via drag-and-drop
 *   L1-APP-040  Application SHALL separate UI from backend logic
 */

import { getPlatform } from "@/platform/adapter";
import { createToolbar } from "@/components/toolbar";
import { createChannelTree } from "@/components/channel-tree";
import { createViewport } from "@/components/viewport";
import { createBottomPanel } from "@/components/bottom-panel";
import { createPropertiesPanel } from "@/components/properties-panel";
import { createStatusBar } from "@/components/statusbar";
import { initKeyboardShortcuts } from "@/components/keyboard-shortcuts";
import { initDragDrop } from "@/components/drag-drop";
import { toggleShortcutsOverlay } from "@/components/shortcuts-overlay";
import { initTheme, toggleTheme } from "@/components/theme-switcher";
import { loadLayout, saveLayout } from "@/components/layout-persistence";
import { createContextMenu } from "@/components/context-menu";
import type { LayoutState } from "@/components/layout-persistence";
import { formatIrigTime } from "@/types/domain";
import type { Ch10Summary, Channel, ViewportTab, BottomTab } from "@/types/domain";

// ── Bootstrap ──

function main() {
  const app = document.getElementById("app")!;
  const platform = getPlatform();

  // ── Build DOM skeleton ──
  const toolbarEl   = el("div");
  const sidebarEl   = el("div");
  const centerColEl = el("div", "center-col");
  const viewportEl  = el("div");
  const bottomEl    = el("div");
  const propsEl     = el("div");
  const mainEl      = el("div", "main");
  const statusBarEl = el("div");

  centerColEl.appendChild(viewportEl);
  centerColEl.appendChild(bottomEl);
  mainEl.appendChild(sidebarEl);
  mainEl.appendChild(centerColEl);
  mainEl.appendChild(propsEl);

  app.appendChild(toolbarEl);
  app.appendChild(mainEl);
  app.appendChild(statusBarEl);

  // ── Create components ──
  const toolbar   = createToolbar(toolbarEl);
  const tree      = createChannelTree(sidebarEl, {
    onChannelSelect: handleChannelSelect,
  });
  const viewport  = createViewport(viewportEl);
  const bottom    = createBottomPanel(bottomEl);
  const props     = createPropertiesPanel(propsEl);
  const statusbar = createStatusBar(statusBarEl);

  // ── Application state ──
  let currentSummary: Ch10Summary | null = null;
  let _selectedChannel: Channel | null = null;
  let selectedChannelIndex = 0;

  // ── Theme initialization ──
  const initialTheme = initTheme();
  toolbar.setThemeIcon(initialTheme);

  // ── Hex view → status bar wiring ──
  viewport.onHexSelect((offset) => {
    statusbar.setCursorOffset(offset);
  });

  // ── Packet table → platform adapter wiring ──
  viewport.setPacketFetcher((start, count) => platform.readPacketHeaders(start, count));

  function doToggleTheme() {
    const newTheme = toggleTheme();
    toolbar.setThemeIcon(newTheme);
    // Redraw waveform with new theme colors
    viewport.resize();
    bottom.addLog({ timestamp: now(), level: "info", message: `Switched to ${newTheme} theme` });
  }

  toolbar.onThemeToggle(doToggleTheme);

  // ────────────────────────────────────────────
  // File loading — single path for all triggers
  // (toolbar, drag-drop, auto-open)
  // ────────────────────────────────────────────

  /**
   * Load a Ch10 summary into all components.
   * This is the ONE function that pushes data to the UI.
   * It does not care where the summary came from.
   *
   * Requirements traced:
   *   L2-LOAD-010  File load SHALL populate all panels
   *   L2-LOAD-020  File load SHALL auto-select the first channel
   *   L2-LOAD-030  File load SHALL update the status bar
   */
  function loadSummary(summary: Ch10Summary) {
    currentSummary = summary;

    tree.setSummary(summary);
    viewport.setSummary(summary);
    statusbar.setFileInfo(summary.file);
    toolbar.setVersion(summary.file.standardVersion);
    toolbar.setTime(formatIrigTime({
      dayOfYear: 74,
      hours: 14,
      minutes: 23,
      seconds: 45,
      microseconds: 123456,
    }));
    statusbar.setStatus("ready");

    // Auto-select first channel
    const channels = allChannels(summary);
    const firstChannel = channels[0];
    if (firstChannel) {
      selectedChannelIndex = 0;
      tree.setActiveChannel(firstChannel.channelId);
      handleChannelSelect(firstChannel);
    }

    // Auto-plot first two channels on the waveform
    for (const ch of channels.slice(0, 2)) {
      viewport.addPlottedChannel(ch.channelId, ch.label);
    }
  }

  /** Open a file via the platform adapter (toolbar or Ctrl+O). */
  async function openFile() {
    statusbar.setStatus("loading", "Opening file...");
    try {
      const summary = await platform.openFile();
      if (!summary) {
        statusbar.setStatus("ready");
        return;
      }
      loadSummary(summary);
    } catch (err) {
      statusbar.setStatus("error", `Failed: ${err}`);
      console.error("[main] openFile failed:", err);
    }
  }

  // ────────────────────────────────────────────
  // Channel selection
  // ────────────────────────────────────────────

  function handleChannelSelect(channel: Channel) {
    _selectedChannel = channel;
    props.setChannel(channel);

    // Update the selected index for up/down navigation
    if (currentSummary) {
      const channels = allChannels(currentSummary);
      const idx = channels.findIndex((c) => c.channelId === channel.channelId);
      if (idx >= 0) selectedChannelIndex = idx;
    }

    // Show packet at cursor
    platform.readPacketHeaders(0, 1).then((headers) => {
      if (headers.length > 0) {
        props.setPacket(headers[0]);
      }
    });
  }

  /** Navigate to the previous or next channel in the tree. */
  function navigateChannel(direction: -1 | 1) {
    if (!currentSummary) return;
    const channels = allChannels(currentSummary);
    if (channels.length === 0) return;

    selectedChannelIndex = Math.max(
      0,
      Math.min(channels.length - 1, selectedChannelIndex + direction)
    );
    const ch = channels[selectedChannelIndex];
    tree.setActiveChannel(ch.channelId);
    handleChannelSelect(ch);
  }

  // ────────────────────────────────────────────
  // Toolbar wiring
  // ────────────────────────────────────────────

  toolbar.onOpen(openFile);

  // ────────────────────────────────────────────
  // Keyboard shortcuts
  // (L1-APP-020)
  // ────────────────────────────────────────────

  const viewportTabMap: Record<string, ViewportTab> = {
    "view.waveform": "waveform",
    "view.hex":      "hex",
    "view.packets":  "packets",
    "view.tmats":    "tmats",
  };

  const bottomTabMap: Record<string, BottomTab> = {
    "bottom.console":    "console",
    "bottom.statistics": "statistics",
    "bottom.timecorr":   "time-correlation",
    "bottom.errors":     "errors",
  };

  initKeyboardShortcuts((action) => {
    // File
    if (action === "file.open") {
      openFile();
      return;
    }

    // Transport
    if (action === "transport.play") {
      bottom.addLog({ timestamp: now(), level: "info", message: "Play/Pause toggled (no playback engine yet)" });
      return;
    }
    if (action === "transport.first") {
      toolbar.setTime(formatIrigTime({ dayOfYear: 74, hours: 14, minutes: 23, seconds: 44, microseconds: 0 }));
      bottom.addLog({ timestamp: now(), level: "info", message: "Jumped to first packet" });
      return;
    }
    if (action === "transport.last") {
      toolbar.setTime(formatIrigTime({ dayOfYear: 74, hours: 15, minutes: 5, seconds: 59, microseconds: 999999 }));
      bottom.addLog({ timestamp: now(), level: "info", message: "Jumped to last packet" });
      return;
    }
    if (action === "transport.back" || action === "transport.forward") {
      bottom.addLog({ timestamp: now(), level: "info", message: `Step ${action === "transport.back" ? "backward" : "forward"}` });
      return;
    }

    // Viewport tabs
    if (action in viewportTabMap) {
      viewport.setActiveTab(viewportTabMap[action]);
      return;
    }

    // Bottom panel tabs
    if (action in bottomTabMap) {
      bottom.setActiveTab(bottomTabMap[action]);
      return;
    }

    // Channel navigation
    if (action === "nav.channel.up") {
      navigateChannel(-1);
      return;
    }
    if (action === "nav.channel.down") {
      navigateChannel(1);
      return;
    }
    if (action === "nav.filter") {
      tree.toggleFilter();
      return;
    }

    // Help overlay
    if (action === "app.shortcuts") {
      toggleShortcutsOverlay();
      return;
    }

    // Theme toggle
    if (action === "app.theme") {
      doToggleTheme();
      return;
    }
  });

  // ────────────────────────────────────────────
  // Drag-and-drop file open
  // (L1-APP-030)
  // ────────────────────────────────────────────

  initDragDrop(app, {
    onFileDrop(file: File) {
      bottom.addLog({
        timestamp: now(),
        level: "info",
        message: `Dropped file: ${file.name} (${formatBytes(file.size)})`,
      });
      // In browser mode: read ArrayBuffer → WASM
      // In Tauri mode: get file path from drop event
      // For now: trigger mock open flow
      openFile();
    },
  });

  // ────────────────────────────────────────────
  // Backend log subscription
  // ────────────────────────────────────────────

  platform.onLog((entry) => {
    bottom.addLog(entry);
  });

  // ────────────────────────────────────────────
  // Window resize
  // ────────────────────────────────────────────

  let resizeTimer: number;
  window.addEventListener("resize", () => {
    clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(() => viewport.resize(), 100);
  });

  // ────────────────────────────────────────────
  // Panel resize (drag handles) + layout persistence
  // ────────────────────────────────────────────

  const savedLayout = loadLayout();

  // Restore saved sizes before initializing resize handles
  if (savedLayout.sidebarWidth) applySize(sidebarEl, "col", savedLayout.sidebarWidth);
  if (savedLayout.propsWidth) applySize(propsEl, "col", savedLayout.propsWidth);
  if (savedLayout.bottomHeight) applySize(bottomEl, "row", savedLayout.bottomHeight);

  initPanelResize(sidebarEl, "col", "right");
  initPanelResize(propsEl, "col", "left");
  initPanelResize(bottomEl, "row", "top");

  // Restore collapsed states after resize handles are initialized
  if (savedLayout.sidebarCollapsed) collapsePanel(sidebarEl, "col");
  if (savedLayout.propsCollapsed) collapsePanel(propsEl, "col");
  if (savedLayout.bottomCollapsed) collapsePanel(bottomEl, "row");

  // Debounced save — fires after any resize or collapse
  let saveTimer: number;
  function scheduleLayoutSave() {
    clearTimeout(saveTimer);
    saveTimer = window.setTimeout(() => {
      const state: LayoutState = {
        sidebarWidth: sidebarEl.offsetWidth || null,
        propsWidth: propsEl.offsetWidth || null,
        bottomHeight: bottomEl.offsetHeight || null,
        sidebarCollapsed: panelStates.get(sidebarEl)?.collapsed ?? false,
        propsCollapsed: panelStates.get(propsEl)?.collapsed ?? false,
        bottomCollapsed: panelStates.get(bottomEl)?.collapsed ?? false,
      };
      saveLayout(state);
    }, 300);
  }

  // Listen for layout changes (fired by resize handlers)
  window.addEventListener("layout-changed", scheduleLayoutSave);

  // ────────────────────────────────────────────
  // Context menus
  // ────────────────────────────────────────────

  const ctxMenu = createContextMenu();

  // Channel tree context menu
  sidebarEl.addEventListener("contextmenu", (e) => {
    const target = (e.target as HTMLElement).closest("[data-channel-id]") as HTMLElement | null;
    if (!target) return;
    e.preventDefault();

    const chId = parseInt(target.dataset.channelId!, 10);
    const ch = currentSummary
      ? allChannels(currentSummary).find((c) => c.channelId === chId)
      : null;

    ctxMenu.show(e.clientX, e.clientY, [
      {
        label: `Copy channel ID (${chId})`,
        action: () => navigator.clipboard?.writeText(String(chId)),
      },
      {
        label: `Copy label: ${ch?.label ?? "—"}`,
        action: () => navigator.clipboard?.writeText(ch?.label ?? ""),
        disabled: !ch,
      },
      { separator: true },
      {
        label: "Show in packets view",
        action: () => {
          viewport.setActiveTab("packets");
          bottom.addLog({ timestamp: now(), level: "info", message: `Filter packets to Ch ${chId} (not yet implemented)` });
        },
      },
      {
        label: "Show in waveform",
        action: () => {
          viewport.addPlottedChannel(chId, ch?.label ?? `Ch ${chId}`);
          viewport.setActiveTab("waveform");
        },
      },
    ]);
  });

  // Viewport packet table context menu
  viewportEl.addEventListener("contextmenu", (e) => {
    const row = (e.target as HTMLElement).closest("tr") as HTMLElement | null;
    if (!row || !row.parentElement || row.parentElement.tagName === "THEAD") return;
    // Only in packets tab
    const activeTabEl = viewportEl.querySelector(".tab-bar__tab--active") as HTMLElement | null;
    if (activeTabEl?.dataset.tab !== "packets") return;
    e.preventDefault();

    const cells = row.querySelectorAll("td");
    const offsetText = cells[1]?.textContent?.trim() ?? "";
    const indexText = cells[0]?.textContent?.trim() ?? "";

    ctxMenu.show(e.clientX, e.clientY, [
      {
        label: `Copy offset (${offsetText})`,
        action: () => navigator.clipboard?.writeText(offsetText),
      },
      {
        label: `Copy packet index (${indexText})`,
        action: () => navigator.clipboard?.writeText(indexText),
      },
      { separator: true },
      {
        label: "View in hex",
        action: () => {
          viewport.setActiveTab("hex");
          bottom.addLog({ timestamp: now(), level: "info", message: `Jump to ${offsetText} in hex view (not yet implemented)` });
        },
      },
    ]);
  });

  // ────────────────────────────────────────────
  // Startup
  // ────────────────────────────────────────────

  bottom.addLog({ timestamp: now(), level: "info", message: "IRIG106-Studio v0.1.0 ready" });
  bottom.addLog({ timestamp: now(), level: "info", message: "Drop a .ch10 file or press Ctrl+O to begin" });

  console.log(`[IRIG106-Studio] Platform: ${platform.name}`);
  console.log(`[IRIG106-Studio] Press ? for keyboard shortcuts`);
}

// ── Panel resize logic ──

/** Tracks collapse state for a panel. */
interface PanelState {
  collapsed: boolean;
  /** Size before collapse, so we can restore. */
  preCollapseSize: number;
}

const panelStates = new Map<HTMLElement, PanelState>();

function initPanelResize(
  panelEl: HTMLElement,
  axis: "col" | "row",
  side: "left" | "right" | "top"
) {
  const handle = panelEl.querySelector(`.resize-handle--${axis}.${side}`) as HTMLElement | null;
  if (!handle) return;

  const defaultSize = axis === "col" ? panelEl.offsetWidth : panelEl.offsetHeight;
  panelStates.set(panelEl, { collapsed: false, preCollapseSize: defaultSize });

  let startPos = 0;
  let startSize = 0;

  function onMouseDown(e: MouseEvent) {
    e.preventDefault();
    const state = panelStates.get(panelEl)!;
    if (state.collapsed) return; // don't allow drag when collapsed

    startPos = axis === "col" ? e.clientX : e.clientY;
    startSize = axis === "col" ? panelEl.offsetWidth : panelEl.offsetHeight;
    handle!.classList.add("resize-handle--active");
    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
    document.body.style.cursor = axis === "col" ? "col-resize" : "row-resize";
    document.body.style.userSelect = "none";
  }

  function onMouseMove(e: MouseEvent) {
    const currentPos = axis === "col" ? e.clientX : e.clientY;
    const delta = currentPos - startPos;
    let newSize: number;

    if (side === "right") {
      newSize = startSize + delta;
    } else if (side === "left") {
      newSize = startSize - delta;
    } else {
      newSize = startSize - delta;
    }

    const min = axis === "col" ? 140 : 60;
    const max = axis === "col" ? 400 : 500;
    newSize = Math.max(min, Math.min(max, newSize));

    applySize(panelEl, axis, newSize);
    panelStates.get(panelEl)!.preCollapseSize = newSize;
    window.dispatchEvent(new Event("resize"));
  }

  function onMouseUp() {
    handle!.classList.remove("resize-handle--active");
    document.removeEventListener("mousemove", onMouseMove);
    document.removeEventListener("mouseup", onMouseUp);
    document.body.style.cursor = "";
    document.body.style.userSelect = "";
    window.dispatchEvent(new Event("layout-changed"));
  }

  // Double-click to collapse/expand
  handle.addEventListener("dblclick", (e) => {
    e.preventDefault();
    const state = panelStates.get(panelEl)!;

    if (state.collapsed) {
      // Expand: restore pre-collapse size
      applySize(panelEl, axis, state.preCollapseSize);
      panelEl.classList.remove("panel--collapsed");
      state.collapsed = false;
    } else {
      // Collapse: save current size, shrink to 0
      state.preCollapseSize = axis === "col" ? panelEl.offsetWidth : panelEl.offsetHeight;
      applySize(panelEl, axis, 0);
      panelEl.classList.add("panel--collapsed");
      state.collapsed = true;
    }

    window.dispatchEvent(new Event("resize"));
    window.dispatchEvent(new Event("layout-changed"));
  });

  handle.addEventListener("mousedown", onMouseDown);
}

/** Collapse a panel programmatically (used for restoring saved state). */
function collapsePanel(panelEl: HTMLElement, axis: "col" | "row") {
  const state = panelStates.get(panelEl);
  if (!state || state.collapsed) return;

  state.preCollapseSize = axis === "col" ? panelEl.offsetWidth : panelEl.offsetHeight;
  applySize(panelEl, axis, 0);
  panelEl.classList.add("panel--collapsed");
  state.collapsed = true;
}

function applySize(el: HTMLElement, axis: "col" | "row", size: number) {
  if (axis === "col") {
    el.style.width = `${size}px`;
    el.style.minWidth = `${size}px`;
  } else {
    el.style.height = `${size}px`;
    el.style.minHeight = `${size}px`;
  }
}

// ── Helpers ──

function el(tag: string, className?: string): HTMLElement {
  const e = document.createElement(tag);
  if (className) e.className = className;
  return e;
}

/** Flatten all channels from all data sources into a single ordered list. */
function allChannels(summary: Ch10Summary): Channel[] {
  return summary.dataSources.flatMap((ds) => ds.channels);
}

function now(): string {
  const d = new Date();
  return [
    d.getHours().toString().padStart(2, "0"),
    ":",
    d.getMinutes().toString().padStart(2, "0"),
    ":",
    d.getSeconds().toString().padStart(2, "0"),
    ".",
    d.getMilliseconds().toString().padStart(3, "0"),
  ].join("");
}

function formatBytes(bytes: number): string {
  if (bytes >= 1e9) return `${(bytes / 1e9).toFixed(1)} GB`;
  if (bytes >= 1e6) return `${(bytes / 1e6).toFixed(1)} MB`;
  if (bytes >= 1e3) return `${(bytes / 1e3).toFixed(1)} KB`;
  return `${bytes} B`;
}

// ── Go ──
main();
