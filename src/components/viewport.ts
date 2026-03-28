/**
 * Viewport — center panel with tabbed views:
 *   - Waveform: signal visualization (Canvas2D)
 *   - Hex: hex dump of raw packet data
 *   - Packets: packet list (virtual scroll)
 *   - TMATS: raw TMATS text display
 *
 * The waveform is drawn on a <canvas> for performance.
 * Other views are HTML-based.
 */

import type { Ch10Summary, ViewportTab } from "@/types/domain";

export function createViewport(container: HTMLElement): {
  setSummary(summary: Ch10Summary): void;
  setActiveTab(tab: ViewportTab): void;
  resize(): void;
} {
  container.classList.add("panel", "viewport");

  const tabs: ViewportTab[] = ["waveform", "hex", "packets", "tmats"];

  container.innerHTML = `
    <div class="tab-bar" id="viewport-tabs">
      ${tabs.map((t) => `
        <span class="tab-bar__tab${t === "waveform" ? " tab-bar__tab--active" : ""}" data-tab="${t}">
          ${tabLabel(t)}
        </span>
      `).join("")}
    </div>
    <div id="viewport-content" style="flex:1;display:flex;flex-direction:column;min-height:0;overflow:hidden"></div>
  `;

  const tabBar = container.querySelector("#viewport-tabs") as HTMLElement;
  const content = container.querySelector("#viewport-content") as HTMLElement;
  let activeTab: ViewportTab = "waveform";
  let summary: Ch10Summary | null = null;

  // Tab click handling
  tabBar.addEventListener("click", (e) => {
    const tabEl = (e.target as HTMLElement).closest("[data-tab]") as HTMLElement | null;
    if (!tabEl) return;
    setActiveTab(tabEl.dataset.tab as ViewportTab);
  });

  function setActiveTab(tab: ViewportTab) {
    activeTab = tab;
    tabBar.querySelectorAll(".tab-bar__tab").forEach((el) => {
      el.classList.toggle("tab-bar__tab--active", (el as HTMLElement).dataset.tab === tab);
    });
    renderContent();
  }

  function renderContent() {
    switch (activeTab) {
      case "waveform":
        renderWaveform();
        break;
      case "hex":
        renderHex();
        break;
      case "packets":
        renderPackets();
        break;
      case "tmats":
        renderTmats();
        break;
    }
  }

  function renderWaveform() {
    content.innerHTML = `
      <div class="waveform">
        <canvas id="waveform-canvas" class="waveform__canvas"></canvas>
        <div class="waveform__timescale">
          <span>14:23:44.000</span>
          <span>14:23:44.500</span>
          <span>14:23:45.000</span>
          <span>14:23:45.500</span>
          <span>14:23:46.000</span>
        </div>
        <div class="waveform__legend">
          <span><span class="waveform__legend-swatch" style="background:#3b8bdd"></span>Ch1 1553 Bus A</span>
          <span><span class="waveform__legend-swatch" style="background:#1d9e75"></span>Ch3 PCM</span>
        </div>
      </div>
    `;

    requestAnimationFrame(() => {
      const canvas = content.querySelector("#waveform-canvas") as HTMLCanvasElement;
      if (canvas) drawDemoWaveform(canvas);
    });
  }

  function renderHex() {
    const lines: string[] = [];
    for (let addr = 0; addr < 256; addr += 16) {
      const hex: string[] = [];
      const ascii: string[] = [];
      for (let i = 0; i < 16; i++) {
        const byte = Math.floor(Math.random() * 256);
        hex.push(byte.toString(16).padStart(2, "0"));
        ascii.push(byte >= 0x20 && byte <= 0x7e ? String.fromCharCode(byte) : "·");
      }
      lines.push(
        `<span style="color:var(--c-text-tertiary)">${addr.toString(16).padStart(8, "0")}</span>  ${hex.slice(0, 8).join(" ")}  ${hex.slice(8).join(" ")}  <span style="color:var(--c-accent-text)">${ascii.join("")}</span>`
      );
    }

    content.innerHTML = `
      <div style="flex:1;overflow:auto;padding:8px;font-family:var(--font-mono);font-size:11px;line-height:1.6;white-space:pre;color:var(--c-text-secondary)">
${lines.join("\n")}
      </div>
    `;
  }

  function renderPackets() {
    const headerRow = `<tr style="position:sticky;top:0;background:var(--c-raised);z-index:1">
      <th style="text-align:left;padding:4px 8px;color:var(--c-text-tertiary);font-weight:500">Index</th>
      <th style="text-align:left;padding:4px 8px;color:var(--c-text-tertiary);font-weight:500">Offset</th>
      <th style="text-align:left;padding:4px 8px;color:var(--c-text-tertiary);font-weight:500">Ch</th>
      <th style="text-align:left;padding:4px 8px;color:var(--c-text-tertiary);font-weight:500">Type</th>
      <th style="text-align:right;padding:4px 8px;color:var(--c-text-tertiary);font-weight:500">Length</th>
      <th style="text-align:left;padding:4px 8px;color:var(--c-text-tertiary);font-weight:500">Seq</th>
      <th style="text-align:left;padding:4px 8px;color:var(--c-text-tertiary);font-weight:500">CRC</th>
    </tr>`;

    const rows: string[] = [];
    const types = ["1553", "1553", "PCM", "Time", "Video"];
    const badges = ["badge--1553", "badge--1553", "badge--pcm", "badge--time", "badge--video"];

    for (let i = 0; i < 100; i++) {
      const t = i % 5;
      const crcOk = i % 47 !== 0;
      rows.push(`<tr style="border-bottom:1px solid var(--c-border-subtle);cursor:pointer" onmouseover="this.style.background='var(--c-raised)'" onmouseout="this.style.background='transparent'">
        <td style="padding:2px 8px;font-family:var(--font-mono);font-size:10px;color:var(--c-text-tertiary)">${i}</td>
        <td style="padding:2px 8px;font-family:var(--font-mono);font-size:10px">0x${(i * 384).toString(16).toUpperCase().padStart(6, "0")}</td>
        <td style="padding:2px 8px;font-size:11px">${(t + 1)}</td>
        <td style="padding:2px 8px"><span class="badge ${badges[t]}">${types[t]}</span></td>
        <td style="padding:2px 8px;text-align:right;font-family:var(--font-mono);font-size:10px">${64 + (i % 192)}</td>
        <td style="padding:2px 8px;font-family:var(--font-mono);font-size:10px">${i % 256}</td>
        <td style="padding:2px 8px;font-size:10px;color:${crcOk ? "var(--c-success)" : "var(--c-danger)"}">${crcOk ? "✓" : "✗"}</td>
      </tr>`);
    }

    content.innerHTML = `
      <div style="flex:1;overflow:auto">
        <table style="width:100%;border-collapse:collapse;font-size:11px">
          ${headerRow}
          ${rows.join("")}
        </table>
      </div>
    `;
  }

  function renderTmats() {
    const tmats = summary?.tmatsRaw || "No TMATS data available.\nOpen a Ch10 file to view TMATS.";

    content.innerHTML = `
      <div style="flex:1;overflow:auto;padding:8px;font-family:var(--font-mono);font-size:11px;line-height:1.6;white-space:pre-wrap;color:var(--c-text-secondary)">
${escHtml(tmats)}
      </div>
    `;
  }

  function resize() {
    if (activeTab === "waveform") {
      const canvas = content.querySelector("#waveform-canvas") as HTMLCanvasElement;
      if (canvas) drawDemoWaveform(canvas);
    }
  }

  function setSummary(s: Ch10Summary) {
    summary = s;
    renderContent();
  }

  // Initial render
  renderContent();

  return { setSummary, setActiveTab, resize };
}

// ── Waveform drawing ──

function drawDemoWaveform(canvas: HTMLCanvasElement) {
  const rect = canvas.parentElement!.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;
  canvas.width = rect.width * dpr;
  canvas.height = (rect.height - 40) * dpr;
  canvas.style.width = `${rect.width}px`;
  canvas.style.height = `${rect.height - 40}px`;

  const ctx = canvas.getContext("2d")!;
  ctx.scale(dpr, dpr);
  const w = rect.width;
  const h = rect.height - 40;

  // Read theme-aware colors from CSS variables
  const cs = getComputedStyle(document.documentElement);
  const cv = (name: string, fallback: string) => cs.getPropertyValue(name).trim() || fallback;

  const bgColor    = cv("--c-surface",        "#222226");
  const gridColor  = cv("--c-waveform-grid",   "rgba(255,255,255,0.05)");
  const gridColorV = cv("--c-waveform-grid-v", "rgba(255,255,255,0.04)");
  const c1553      = cv("--c-waveform-1553",   "#3b8bdd");
  const cPcm       = cv("--c-waveform-pcm",    "#1d9e75");
  const cPlayhead  = cv("--c-playhead",         "#e24b4a");

  // Background
  ctx.fillStyle = bgColor;
  ctx.fillRect(0, 0, w, h);

  // Grid — horizontal
  ctx.strokeStyle = gridColor;
  ctx.lineWidth = 0.5;
  for (let y = 0; y < h; y += h / 4) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(w, y);
    ctx.stroke();
  }
  // Grid — vertical (dashed)
  ctx.strokeStyle = gridColorV;
  ctx.setLineDash([2, 4]);
  for (let x = 0; x < w; x += w / 5) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, h);
    ctx.stroke();
  }
  ctx.setLineDash([]);

  // 1553 digital waveform
  ctx.strokeStyle = c1553;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  const mid = h / 2;
  const amp = h * 0.3;
  let x = 0;
  ctx.moveTo(x, mid);
  while (x < w) {
    const high = Math.random() > 0.5;
    const pulseWidth = 8 + Math.random() * 12;
    ctx.lineTo(x, mid);
    ctx.lineTo(x, high ? mid - amp : mid + amp);
    x += pulseWidth;
    ctx.lineTo(x, high ? mid - amp : mid + amp);
    ctx.lineTo(x, mid);
    x += 2 + Math.random() * 4;
  }
  ctx.stroke();

  // PCM analog overlay
  ctx.strokeStyle = cPcm;
  ctx.lineWidth = 1;
  ctx.globalAlpha = 0.6;
  ctx.beginPath();
  for (let px = 0; px < w; px += 2) {
    const y = mid + Math.sin(px * 0.03) * amp * 0.4 + (Math.random() - 0.5) * 20;
    if (px === 0) ctx.moveTo(px, y);
    else ctx.lineTo(px, y);
  }
  ctx.stroke();
  ctx.globalAlpha = 1.0;

  // Playhead
  const phX = w * 0.5;
  ctx.strokeStyle = cPlayhead;
  ctx.lineWidth = 1;
  ctx.globalAlpha = 0.8;
  ctx.beginPath();
  ctx.moveTo(phX, 0);
  ctx.lineTo(phX, h);
  ctx.stroke();

  // Playhead triangle
  ctx.fillStyle = cPlayhead;
  ctx.beginPath();
  ctx.moveTo(phX - 4, 0);
  ctx.lineTo(phX + 4, 0);
  ctx.lineTo(phX, 7);
  ctx.closePath();
  ctx.fill();
  ctx.globalAlpha = 1.0;
}

function escHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function tabLabel(tab: ViewportTab): string {
  const labels: Record<ViewportTab, string> = {
    waveform: "Waveform",
    hex: "Hex",
    packets: "Packets",
    tmats: "TMATS",
  };
  return labels[tab];
}
