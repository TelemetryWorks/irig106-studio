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
} {
  container.classList.add("panel", "sidebar");

  container.innerHTML = `
    <div class="panel__header">
      <span class="panel__title">Channels</span>
      <span class="panel__action" title="Filter channels">⌕</span>
    </div>
    <div class="panel__body" id="channel-tree-body"></div>
    <div class="resize-handle resize-handle--col right"></div>
  `;

  const body = container.querySelector("#channel-tree-body") as HTMLElement;
  let activeChannelId: number | null = null;

  function render(summary: Ch10Summary) {
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
      html.push(renderDataSource(ds));
    }

    // TMATS entry
    html.push(`
      <div class="tree-indent">
        <div class="tree-item" data-action="tmats">
          <span class="tree-chevron">▸</span>
          TMATS (Ch 0)
        </div>
      </div>
    `);

    body.innerHTML = html.join("");
    bindEvents(summary);
  }

  function renderDataSource(ds: DataSource): string {
    const lines: string[] = [];

    lines.push(`
      <div class="tree-indent">
        <div class="tree-item tree-item--group">
          <span class="tree-chevron tree-chevron--open">▸</span>
          ${escHtml(ds.label)}
        </div>
    `);

    for (const ch of ds.channels) {
      const badge = dataTypeBadge(ch.dataType);
      const active = ch.channelId === activeChannelId ? " tree-item--active" : "";
      lines.push(`
        <div class="tree-indent">
          <div class="tree-item${active}" data-channel-id="${ch.channelId}">
            <span class="tree-icon" style="color:var(--c-dt-${badge.label.toLowerCase().replace(/\s/g, "")}, var(--c-info))">●</span>
            Ch ${ch.channelId}
            <span class="badge ${badge.css}">${badge.label}</span>
          </div>
        </div>
      `);
    }

    lines.push(`</div>`);
    return lines.join("");
  }

  function bindEvents(summary: Ch10Summary) {
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
  }

  function setActiveChannel(channelId: number) {
    activeChannelId = channelId;
    body.querySelectorAll("[data-channel-id]").forEach((el) => {
      const id = parseInt((el as HTMLElement).dataset.channelId!, 10);
      el.classList.toggle("tree-item--active", id === channelId);
    });
  }

  return {
    setSummary: render,
    setActiveChannel,
  };
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
