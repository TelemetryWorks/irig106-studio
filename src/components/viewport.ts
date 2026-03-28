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
  addPlottedChannel(channelId: number, label: string): void;
  removePlottedChannel(channelId: number): void;
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

  // ── Waveform state ──
  const WF_TOTAL_SEC = 2.0;
  const WF_SAMPLE_COUNT = 4000;

  /** A channel plotted on the waveform. */
  interface PlottedChannel {
    channelId: number;
    label: string;
    color: string;
    data: Float32Array;
  }

  /** Color palette for plotted channels (cycles if >8 channels). */
  const WF_COLORS = [
    "#3b8bdd", "#1d9e75", "#d4a026", "#e24b4a",
    "#b07cd8", "#d8856e", "#6eb8d8", "#7bc378",
  ];

  const plottedChannels: PlottedChannel[] = [];

  /** Generate stable demo waveform data for a given channel ID. */
  function generateDemoData(channelId: number): Float32Array {
    const data = new Float32Array(WF_SAMPLE_COUNT);
    // Use channelId as a seed for deterministic, unique waveforms
    const freq1 = 0.01 + (channelId * 0.007) % 0.04;
    const freq2 = 0.05 + (channelId * 0.013) % 0.08;
    const freq3 = 0.002 + (channelId * 0.003) % 0.01;
    const amp1 = 0.3 + (channelId % 5) * 0.1;
    const amp2 = 0.1 + (channelId % 3) * 0.08;
    const isDigital = channelId % 3 === 0;

    for (let i = 0; i < WF_SAMPLE_COUNT; i++) {
      if (isDigital) {
        const phase = i * freq2 + Math.sin(i * freq3) * 2;
        data[i] = Math.sign(Math.sin(phase)) * amp1
          + (((i * (channelId + 37)) % 100) / 500 - 0.1);
      } else {
        data[i] = Math.sin(i * freq1) * amp1
          + Math.sin(i * freq2) * amp2
          + (((i * (channelId + 13)) % 100) / 250 - 0.2) * 0.2;
      }
    }
    return data;
  }

  function addPlottedChannel(channelId: number, label: string) {
    // Don't add duplicates
    if (plottedChannels.some((p) => p.channelId === channelId)) return;

    const colorIdx = plottedChannels.length % WF_COLORS.length;
    plottedChannels.push({
      channelId,
      label,
      color: WF_COLORS[colorIdx],
      data: generateDemoData(channelId),
    });

    // Re-render if waveform tab is active
    if (activeTab === "waveform") renderWaveform();
  }

  function removePlottedChannel(channelId: number) {
    const idx = plottedChannels.findIndex((p) => p.channelId === channelId);
    if (idx < 0) return;
    plottedChannels.splice(idx, 1);
    if (activeTab === "waveform") renderWaveform();
  }

  let wfZoom = 1.0;
  let wfPanNorm = 0.5;
  const WF_ZOOM_MIN = 1.0;
  const WF_ZOOM_MAX = 32.0;
  const WF_BASE_TIME = 14 * 3600 + 23 * 60 + 44;

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
    // Build dynamic legend
    const legendItems = plottedChannels.map((pc) =>
      `<span class="waveform__legend-item" data-remove-ch="${pc.channelId}" title="Click to remove">` +
      `<span class="waveform__legend-swatch" style="background:${pc.color}"></span>` +
      `Ch${pc.channelId} ${escHtml(pc.label)}` +
      `<span class="waveform__legend-x">✕</span>` +
      `</span>`
    ).join("");

    const emptyHint = plottedChannels.length === 0
      ? `<span class="waveform__drop-hint">Drag channels here to plot</span>`
      : "";

    content.innerHTML = `
      <div class="waveform" id="wf-drop-zone">
        <canvas id="waveform-canvas" class="waveform__canvas"></canvas>
        ${plottedChannels.length === 0 ? `
          <div class="waveform__empty">
            <div style="color:var(--c-text-tertiary);font-size:12px;margin-bottom:4px">No channels plotted</div>
            <div style="color:var(--c-text-disabled);font-size:11px">Drag a channel from the sidebar onto this area</div>
          </div>
        ` : ""}
        <div class="waveform__timescale" id="wf-timescale"></div>
        <div class="waveform__legend">
          ${legendItems}${emptyHint}
          <span class="waveform__zoom-hint">Scroll to zoom · drag to pan</span>
        </div>
      </div>
    `;

    const canvas = content.querySelector("#waveform-canvas") as HTMLCanvasElement;
    const dropZone = content.querySelector("#wf-drop-zone") as HTMLElement;
    if (!canvas || !dropZone) return;

    // ── Drop zone for channels ──
    let dropCounter = 0;

    dropZone.addEventListener("dragenter", (e) => {
      e.preventDefault();
      dropCounter++;
      if (dropCounter === 1) dropZone.classList.add("waveform--drag-over");
    });

    dropZone.addEventListener("dragover", (e) => {
      e.preventDefault();
      if (e.dataTransfer) e.dataTransfer.dropEffect = "copy";
    });

    dropZone.addEventListener("dragleave", () => {
      dropCounter--;
      if (dropCounter <= 0) {
        dropCounter = 0;
        dropZone.classList.remove("waveform--drag-over");
      }
    });

    dropZone.addEventListener("drop", (e) => {
      e.preventDefault();
      dropCounter = 0;
      dropZone.classList.remove("waveform--drag-over");

      const data = e.dataTransfer?.getData("application/x-irig106-channel");
      if (!data) return;
      try {
        const ch = JSON.parse(data);
        if (ch && typeof ch.channelId === "number") {
          addPlottedChannel(ch.channelId, ch.label || `Ch ${ch.channelId}`);
        }
      } catch { /* ignore bad data */ }
    });

    // ── Legend click-to-remove ──
    content.querySelectorAll("[data-remove-ch]").forEach((el) => {
      el.addEventListener("click", () => {
        const chId = parseInt((el as HTMLElement).dataset.removeCh!, 10);
        removePlottedChannel(chId);
      });
    });

    // ── Zoom/pan handlers ──
    let isPanning = false;
    let panStartX = 0;
    let panStartNorm = 0;

    canvas.addEventListener("wheel", (e) => {
      e.preventDefault();
      const zoomFactor = e.deltaY < 0 ? 1.15 : 1 / 1.15;
      const oldZoom = wfZoom;
      wfZoom = Math.max(WF_ZOOM_MIN, Math.min(WF_ZOOM_MAX, wfZoom * zoomFactor));

      const rect = canvas.getBoundingClientRect();
      const mouseNormX = (e.clientX - rect.left) / rect.width;
      const visibleFrac = 1 / wfZoom;
      const oldLeft = wfPanNorm - (1 / oldZoom) / 2;
      const mouseDataNorm = oldLeft + mouseNormX * (1 / oldZoom);
      wfPanNorm = mouseDataNorm - mouseNormX * visibleFrac + visibleFrac / 2;

      clampPan();
      drawWaveform(canvas);
    }, { passive: false });

    canvas.addEventListener("mousedown", (e) => {
      if (wfZoom <= WF_ZOOM_MIN) return;
      isPanning = true;
      panStartX = e.clientX;
      panStartNorm = wfPanNorm;
      canvas.style.cursor = "grabbing";
    });

    document.addEventListener("mousemove", (e) => {
      if (!isPanning) return;
      const rect = canvas.getBoundingClientRect();
      const dx = e.clientX - panStartX;
      const dataDx = -(dx / rect.width) * (1 / wfZoom);
      wfPanNorm = panStartNorm + dataDx;
      clampPan();
      drawWaveform(canvas);
    });

    document.addEventListener("mouseup", () => {
      if (isPanning) {
        isPanning = false;
        canvas.style.cursor = wfZoom > WF_ZOOM_MIN ? "grab" : "default";
      }
    });

    canvas.style.cursor = wfZoom > WF_ZOOM_MIN ? "grab" : "default";
    requestAnimationFrame(() => drawWaveform(canvas));
  }

  function clampPan() {
    const halfVisible = (1 / wfZoom) / 2;
    wfPanNorm = Math.max(halfVisible, Math.min(1 - halfVisible, wfPanNorm));
    // At zoom=1, snap to 0.5
    if (wfZoom <= WF_ZOOM_MIN) wfPanNorm = 0.5;
  }

  /** Compute the visible data window as [startFrac, endFrac] in 0..1 */
  function visibleWindow(): [number, number] {
    const halfVisible = (1 / wfZoom) / 2;
    return [wfPanNorm - halfVisible, wfPanNorm + halfVisible];
  }

  function updateTimescale() {
    const el = content.querySelector("#wf-timescale");
    if (!el) return;
    const [startFrac, endFrac] = visibleWindow();
    const labels: string[] = [];
    const count = 5;
    for (let i = 0; i < count; i++) {
      const frac = startFrac + (endFrac - startFrac) * (i / (count - 1));
      const sec = WF_BASE_TIME + frac * WF_TOTAL_SEC;
      labels.push(`<span>${formatTimeSec(sec)}</span>`);
    }
    el.innerHTML = labels.join("");
  }

  function drawWaveform(canvas: HTMLCanvasElement) {
    const parent = canvas.parentElement!;
    const rect = parent.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    const cw = rect.width;
    const ch = rect.height - 46; // timescale + legend
    canvas.width = cw * dpr;
    canvas.height = ch * dpr;
    canvas.style.width = `${cw}px`;
    canvas.style.height = `${ch}px`;

    const ctx = canvas.getContext("2d")!;
    ctx.scale(dpr, dpr);

    // Theme colors
    const cs = getComputedStyle(document.documentElement);
    const cv = (name: string, fb: string) => cs.getPropertyValue(name).trim() || fb;
    const bgColor = cv("--c-surface", "#222226");
    const gridH = cv("--c-waveform-grid", "rgba(255,255,255,0.05)");
    const gridV = cv("--c-waveform-grid-v", "rgba(255,255,255,0.04)");
    const cPlay = cv("--c-playhead", "#e24b4a");

    // Background
    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, cw, ch);

    // Grid — horizontal
    ctx.strokeStyle = gridH;
    ctx.lineWidth = 0.5;
    for (let y = ch / 4; y < ch; y += ch / 4) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(cw, y); ctx.stroke();
    }
    // Grid — vertical dashed
    ctx.strokeStyle = gridV;
    ctx.setLineDash([2, 4]);
    for (let x = cw / 5; x < cw; x += cw / 5) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, ch); ctx.stroke();
    }
    ctx.setLineDash([]);

    // Visible data window
    const [startFrac, endFrac] = visibleWindow();
    const startSample = Math.floor(startFrac * WF_SAMPLE_COUNT);
    const endSample = Math.ceil(endFrac * WF_SAMPLE_COUNT);
    const visibleSamples = endSample - startSample;

    const mid = ch / 2;
    const amp = ch * 0.35;

    // Draw each plotted channel
    for (let ci = 0; ci < plottedChannels.length; ci++) {
      const pc = plottedChannels[ci];
      ctx.strokeStyle = pc.color;
      ctx.lineWidth = ci === 0 ? 1.5 : 1;
      ctx.globalAlpha = ci === 0 ? 1.0 : 0.75;
      ctx.beginPath();
      for (let px = 0; px < cw; px++) {
        const sampleIdx = startSample + (px / cw) * visibleSamples;
        const idx = Math.min(WF_SAMPLE_COUNT - 1, Math.max(0, Math.round(sampleIdx)));
        const y = mid - pc.data[idx] * amp;
        if (px === 0) ctx.moveTo(px, y); else ctx.lineTo(px, y);
      }
      ctx.stroke();
    }
    ctx.globalAlpha = 1.0;

    // Playhead at center of visible window
    const phX = cw * 0.5;
    ctx.strokeStyle = cPlay;
    ctx.lineWidth = 1;
    ctx.globalAlpha = 0.8;
    ctx.beginPath(); ctx.moveTo(phX, 0); ctx.lineTo(phX, ch); ctx.stroke();
    ctx.fillStyle = cPlay;
    ctx.beginPath(); ctx.moveTo(phX - 4, 0); ctx.lineTo(phX + 4, 0); ctx.lineTo(phX, 7); ctx.closePath(); ctx.fill();
    ctx.globalAlpha = 1.0;

    // Zoom indicator (top-right)
    if (wfZoom > WF_ZOOM_MIN) {
      const zoomText = `${Math.round(wfZoom)}x`;
      ctx.font = "10px " + cv("--font-mono", "monospace");
      ctx.fillStyle = cv("--c-text-tertiary", "#6b6a62");
      ctx.textAlign = "right";
      ctx.fillText(zoomText, cw - 8, 14);
      ctx.textAlign = "start";
    }

    // Update timescale
    updateTimescale();

    // Update cursor
    canvas.style.cursor = wfZoom > WF_ZOOM_MIN ? "grab" : "default";
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
      if (canvas) drawWaveform(canvas);
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
    addPlottedChannel,
    removePlottedChannel,
  };
}

// ── Helpers ──

function escHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/** Format seconds-of-day to HH:MM:SS.mmm */
function formatTimeSec(sec: number): string {
  const h = Math.floor(sec / 3600) % 24;
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${s.toFixed(3).padStart(6, "0")}`;
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
