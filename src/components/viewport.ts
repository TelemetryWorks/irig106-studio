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
  onHexSelect(cb: (offset: number) => void): void;
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
  let hexSelectCb: ((offset: number) => void) | null = null;
  let hexSelectedOffset = -1;
  // Stable demo data so hex view doesn't regenerate on re-render
  const hexData = new Uint8Array(512);
  for (let i = 0; i < hexData.length; i++) hexData[i] = (i * 7 + 13 + (i >> 3)) & 0xff;

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
    if (!summary) {
      renderWelcome();
      return;
    }
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

  function renderWelcome() {
    content.innerHTML = `
      <div class="viewport-welcome">
        <div class="viewport-welcome__icon">
          <svg width="56" height="56" viewBox="0 0 56 56" fill="none">
            <rect x="10" y="6" width="36" height="44" rx="4" stroke="var(--c-text-tertiary)" stroke-width="1.5" fill="none"/>
            <path d="M20 22h16M20 28h16M20 34h10" stroke="var(--c-text-tertiary)" stroke-width="1.2" stroke-linecap="round"/>
            <circle cx="40" cy="42" r="11" fill="var(--c-accent)" stroke="var(--c-surface)" stroke-width="2"/>
            <path d="M36.5 42h7M40 38.5v7" stroke="var(--c-surface)" stroke-width="2" stroke-linecap="round"/>
          </svg>
        </div>
        <div class="viewport-welcome__title">No file open</div>
        <div class="viewport-welcome__hint">
          Drop a <strong>.ch10</strong> file here or press
          <kbd class="viewport-welcome__kbd">${isMac() ? "⌘" : "Ctrl"}+O</kbd>
          to open
        </div>
        <div class="viewport-welcome__shortcuts">
          Press <kbd class="viewport-welcome__kbd">?</kbd> for keyboard shortcuts
        </div>
      </div>
    `;
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
    const totalBytes = hexData.length;
    const bytesPerRow = 16;
    const rows: string[] = [];

    for (let addr = 0; addr < totalBytes; addr += bytesPerRow) {
      const hexCells: string[] = [];
      const asciiCells: string[] = [];

      for (let i = 0; i < bytesPerRow; i++) {
        const offset = addr + i;
        if (offset >= totalBytes) break;
        const byte = hexData[offset];
        const sel = offset === hexSelectedOffset ? " hex-byte--selected" : "";
        hexCells.push(
          `<span class="hex-byte${sel}" data-hex-offset="${offset}">${byte.toString(16).padStart(2, "0")}</span>`
        );
        const ch = byte >= 0x20 && byte <= 0x7e ? String.fromCharCode(byte) : "·";
        asciiCells.push(
          `<span class="hex-ascii${sel}" data-ascii-offset="${offset}">${escHtml(ch)}</span>`
        );
      }

      // Insert a gap between byte 7 and 8 for readability
      const hexLeft = hexCells.slice(0, 8).join(" ");
      const hexRight = hexCells.slice(8).join(" ");

      rows.push(
        `<div class="hex-row">` +
        `<span class="hex-addr">${addr.toString(16).padStart(8, "0")}</span>` +
        `<span class="hex-cells">${hexLeft}  ${hexRight}</span>` +
        `<span class="hex-ascii-col">${asciiCells.join("")}</span>` +
        `</div>`
      );
    }

    content.innerHTML = `
      <div class="hex-view" id="hex-view" tabindex="0">
        ${rows.join("")}
      </div>
    `;

    const hexView = content.querySelector("#hex-view") as HTMLElement;

    // Click to select a byte
    hexView.addEventListener("click", (e) => {
      const target = e.target as HTMLElement;
      const hexOffset = target.dataset.hexOffset ?? target.dataset.asciiOffset;
      if (hexOffset != null) {
        selectHexByte(parseInt(hexOffset, 10));
      }
    });

    // Keyboard navigation
    hexView.addEventListener("keydown", (e) => {
      if (hexSelectedOffset < 0) return;

      let next: number;
      switch (e.key) {
        case "ArrowRight": next = Math.min(totalBytes - 1, hexSelectedOffset + 1); break;
        case "ArrowLeft":  next = Math.max(0, hexSelectedOffset - 1); break;
        case "ArrowDown":  next = Math.min(totalBytes - 1, hexSelectedOffset + bytesPerRow); break;
        case "ArrowUp":    next = Math.max(0, hexSelectedOffset - bytesPerRow); break;
        case "Home":       next = 0; break;
        case "End":        next = totalBytes - 1; break;
        default: return; // don't prevent default for other keys
      }

      e.preventDefault();
      selectHexByte(next);
    });

    // Focus hex view for keyboard nav
    hexView.focus();
  }

  function selectHexByte(offset: number) {
    hexSelectedOffset = offset;

    // Clear previous selection
    content.querySelectorAll(".hex-byte--selected, .hex-ascii--selected").forEach((el) => {
      el.classList.remove("hex-byte--selected", "hex-ascii--selected");
    });

    // Highlight new selection
    const hexEl = content.querySelector(`[data-hex-offset="${offset}"]`) as HTMLElement | null;
    const asciiEl = content.querySelector(`[data-ascii-offset="${offset}"]`) as HTMLElement | null;
    hexEl?.classList.add("hex-byte--selected");
    asciiEl?.classList.add("hex-ascii--selected");

    // Scroll into view if needed
    hexEl?.scrollIntoView({ block: "nearest" });

    // Notify callback
    hexSelectCb?.(offset);
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

    const highlighted = tmats
      .split("\n")
      .map((line) => highlightTmatsLine(line))
      .join("\n");

    content.innerHTML = `
      <div class="tmats-view">
        <div class="tmats-view__gutter" id="tmats-gutter"></div>
        <pre class="tmats-view__code">${highlighted}</pre>
      </div>
    `;

    // Fill line numbers
    const gutter = content.querySelector("#tmats-gutter") as HTMLElement;
    const lineCount = tmats.split("\n").length;
    const gutterLines: string[] = [];
    for (let i = 1; i <= lineCount; i++) {
      gutterLines.push(`<span>${i}</span>`);
    }
    gutter.innerHTML = gutterLines.join("\n");
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

  return {
    setSummary,
    setActiveTab,
    resize,
    onHexSelect(cb: (offset: number) => void) { hexSelectCb = cb; },
  };
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

function isMac(): boolean {
  return navigator.platform?.includes("Mac") ?? false;
}

/**
 * Syntax-highlight a single line of TMATS text.
 *
 * TMATS line format: GROUP-N\ATTR-N:VALUE;
 * Examples:
 *   R-1\DSI-1:Recorder_1;
 *   B-1\DLN-1:1553_BUS_A;
 *   G\PN:Flight Test 042;
 *
 * Group codes (R, B, G, D, P, T, M, S, C, H, V) get color-coded.
 */
function highlightTmatsLine(line: string): string {
  const trimmed = line.trim();

  // Empty line
  if (!trimmed) return "";

  // Comment lines
  if (trimmed.startsWith("//") || trimmed.startsWith("*")) {
    return `<span class="tmats-comment">${escHtml(line)}</span>`;
  }

  // Standard TMATS attribute line: GROUP-N\...:VALUE;
  const match = trimmed.match(/^([A-Z])([-\d]*)\\([^:]+):(.*)$/);
  if (match) {
    const groupLetter = match[1];
    const groupIndex = match[2];
    const attrPath = match[3];
    let value = match[4];

    // Strip trailing semicolon from value for separate styling
    let semi = "";
    if (value.endsWith(";")) {
      semi = ";";
      value = value.slice(0, -1);
    }

    const groupClass = tmatsGroupClass(groupLetter);

    return (
      `<span class="${groupClass}">${escHtml(groupLetter)}${escHtml(groupIndex)}</span>` +
      `<span class="tmats-sep">\\</span>` +
      `<span class="tmats-attr">${escHtml(attrPath)}</span>` +
      `<span class="tmats-sep">:</span>` +
      `<span class="tmats-value">${escHtml(value)}</span>` +
      `<span class="tmats-semi">${semi}</span>`
    );
  }

  // Fallback: unrecognized line
  return `<span class="tmats-plain">${escHtml(line)}</span>`;
}

/**
 * Map TMATS group letter to a CSS class for color coding.
 *
 * R = Recording (blue)
 * G = General (purple)
 * B = Bus (teal)
 * D = Data (green)
 * P = PCM (coral)
 * T = Time (amber)
 * M = Multiplexer (pink)
 * S = Spacecraft (discrete blue)
 */
function tmatsGroupClass(letter: string): string {
  const map: Record<string, string> = {
    R: "tmats-group--r",
    G: "tmats-group--g",
    B: "tmats-group--b",
    D: "tmats-group--d",
    P: "tmats-group--p",
    T: "tmats-group--t",
    M: "tmats-group--m",
    S: "tmats-group--s",
    C: "tmats-group--c",
    H: "tmats-group--h",
    V: "tmats-group--v",
  };
  return map[letter] || "tmats-group--default";
}
