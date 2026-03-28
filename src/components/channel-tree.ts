/**
 * ChannelTree — left sidebar showing the Ch10 file's channel hierarchy.
 *
 * Structure:
 *   file.ch10
 *     └─ Data Source 1
 *         ├─ Ch 1 [1553]
 *         ├─ Ch 2 [PCM]
 *         └─ ...
 *     └─ TMATS (Ch 0)
 *
 * The ⌕ icon toggles a filter input that matches against channel
 * label, channel ID, and data type badge text.
 *
 * Requirements traced:
 *   L2-NAV-010   Three-level hierarchy
 *   L2-NAV-020   Channel nodes show ID and data type badge
 *   L2-NAV-030   Click highlights and updates properties
 *   L2-FILTER-010 Channel tree SHALL support text filtering
 */

import type { Ch10Summary, Channel, DataSource } from "@/types/domain";
import { dataTypeBadge } from "@/types/domain";

export interface ChannelTreeCallbacks {
  onChannelSelect(channel: Channel): void;
}

export function createChannelTree(
  container: HTMLElement,
  callbacks: ChannelTreeCallbacks
): {
  setSummary(summary: Ch10Summary): void;
  setActiveChannel(channelId: number): void;
  toggleFilter(): void;
} {
  container.classList.add("panel", "sidebar");

  container.innerHTML = `
    <div class="panel__header">
      <span class="panel__title">Channels</span>
      <span class="panel__action" id="filter-toggle" title="Filter channels (/)">⌕</span>
    </div>
    <div class="tree-filter" id="tree-filter" style="display:none">
      <input
        type="text"
        class="tree-filter__input"
        id="tree-filter-input"
        placeholder="Filter channels..."
        autocomplete="off"
        spellcheck="false"
      />
    </div>
    <div class="panel__body" id="channel-tree-body">
      <div style="padding:16px 8px;color:var(--c-text-tertiary);font-size:11px;text-align:center;line-height:1.6">
        No file loaded<br>
        <span style="font-size:10px">Open a Ch10 file to browse channels</span>
      </div>
    </div>
    <div class="resize-handle resize-handle--col right"></div>
  `;

  const body = container.querySelector("#channel-tree-body") as HTMLElement;
  const filterBar = container.querySelector("#tree-filter") as HTMLElement;
  const filterInput = container.querySelector("#tree-filter-input") as HTMLInputElement;
  const filterToggle = container.querySelector("#filter-toggle") as HTMLElement;

  let activeChannelId: number | null = null;
  let currentSummary: Ch10Summary | null = null;
  let filterVisible = false;
  let filterText = "";

  // ── Filter toggle ──
  filterToggle.addEventListener("click", () => toggleFilter());

  filterInput.addEventListener("input", () => {
    filterText = filterInput.value.toLowerCase().trim();
    if (currentSummary) renderTree(currentSummary);
  });

  filterInput.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      filterInput.value = "";
      filterText = "";
      if (currentSummary) renderTree(currentSummary);
      toggleFilter();
    }
  });

  function toggleFilter() {
    filterVisible = !filterVisible;
    filterBar.style.display = filterVisible ? "block" : "none";
    if (filterVisible) {
      filterInput.focus();
    } else {
      filterInput.value = "";
      filterText = "";
      if (currentSummary) renderTree(currentSummary);
    }
  }

  // ── Rendering ──

  function renderTree(summary: Ch10Summary) {
    const html: string[] = [];

    // File root
    html.push(`
      <div class="tree-item tree-item--group">
        <span class="tree-chevron tree-chevron--open">▸</span>
        ${escHtml(summary.file.filename)}
      </div>
    `);

    // Data sources
    for (const ds of summary.dataSources) {
      const dsHtml = renderDataSource(ds);
      if (dsHtml) html.push(dsHtml);
    }

    // TMATS entry (always visible unless filtering)
    if (!filterText || "tmats".includes(filterText)) {
      html.push(`
        <div class="tree-indent">
          <div class="tree-item" data-action="tmats">
            <span class="tree-chevron">▸</span>
            TMATS (Ch 0)
          </div>
        </div>
      `);
    }

    body.innerHTML = html.join("");
    bindClickEvents(summary);
  }

  function renderDataSource(ds: DataSource): string | null {
    // Filter channels
    const visibleChannels = ds.channels.filter((ch) => matchesFilter(ch));

    // Hide entire data source if no channels match
    if (filterText && visibleChannels.length === 0) return null;

    const lines: string[] = [];

    lines.push(`
      <div class="tree-indent">
        <div class="tree-item tree-item--group">
          <span class="tree-chevron tree-chevron--open">▸</span>
          ${escHtml(ds.label)}
        </div>
    `);

    const channelsToRender = filterText ? visibleChannels : ds.channels;

    for (const ch of channelsToRender) {
      const badge = dataTypeBadge(ch.dataType);
      const active = ch.channelId === activeChannelId ? " tree-item--active" : "";
      lines.push(`
        <div class="tree-indent">
          <div class="tree-item${active}" data-channel-id="${ch.channelId}" draggable="true">
            <span class="tree-icon" style="color:var(--c-dt-${badge.label.toLowerCase().replace(/\s/g, "")}, var(--c-info))">●</span>
            Ch ${ch.channelId}
            <span class="badge ${badge.css}">${badge.label}</span>
            <span class="tree-label">${escHtml(ch.label)}</span>
          </div>
        </div>
      `);
    }

    lines.push(`</div>`);
    return lines.join("");
  }

  function matchesFilter(ch: Channel): boolean {
    if (!filterText) return true;

    const badge = dataTypeBadge(ch.dataType);
    const searchable = [
      `ch ${ch.channelId}`,
      `ch${ch.channelId}`,
      ch.label,
      badge.label,
      ch.dataSourceId,
      `0x${ch.channelId.toString(16)}`,
    ]
      .join(" ")
      .toLowerCase();

    return searchable.includes(filterText);
  }

  // ── Events ──

  function bindClickEvents(summary: Ch10Summary) {
    body.addEventListener("click", (e) => {
      const item = (e.target as HTMLElement).closest("[data-channel-id]") as HTMLElement | null;
      if (!item) return;

      const id = parseInt(item.dataset.channelId!, 10);
      const ch = findChannel(summary, id);
      if (ch) {
        setActiveChannel(id);
        callbacks.onChannelSelect(ch);
      }
    });

    // Drag channels to the waveform
    body.addEventListener("dragstart", (e) => {
      const item = (e.target as HTMLElement).closest("[data-channel-id]") as HTMLElement | null;
      if (!item || !e.dataTransfer) return;

      const id = parseInt(item.dataset.channelId!, 10);
      const ch = findChannel(summary, id);
      if (!ch) return;

      e.dataTransfer.effectAllowed = "copy";
      e.dataTransfer.setData("application/x-irig106-channel", JSON.stringify(ch));
      item.classList.add("tree-item--dragging");
    });

    body.addEventListener("dragend", (e) => {
      const item = (e.target as HTMLElement).closest("[data-channel-id]");
      item?.classList.remove("tree-item--dragging");
    });
  }

  function setActiveChannel(channelId: number) {
    activeChannelId = channelId;
    body.querySelectorAll("[data-channel-id]").forEach((el) => {
      const id = parseInt((el as HTMLElement).dataset.channelId!, 10);
      el.classList.toggle("tree-item--active", id === channelId);
    });
  }

  // ── Public API ──

  function setSummary(summary: Ch10Summary) {
    currentSummary = summary;
    renderTree(summary);
  }

  return { setSummary, setActiveChannel, toggleFilter };
}

// ── Helpers ──

function findChannel(summary: Ch10Summary, channelId: number): Channel | undefined {
  for (const ds of summary.dataSources) {
    const ch = ds.channels.find((c) => c.channelId === channelId);
    if (ch) return ch;
  }
  return undefined;
}

function escHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
