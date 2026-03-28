/**
 * StatusBar — bottom strip showing file stats and connection status.
 */

import type { Ch10FileInfo } from "@/types/domain";

export function createStatusBar(container: HTMLElement): {
  setFileInfo(info: Ch10FileInfo): void;
  setStatus(status: "ready" | "loading" | "error", message?: string): void;
} {
  container.classList.add("statusbar", "no-select");

  container.innerHTML = `
    <span id="status-indicator"><span class="statusbar__dot" id="status-dot"></span><span id="status-text">Ready</span></span>
    <span id="status-packets">—</span>
    <span id="status-duration">—</span>
    <span id="status-filesize">—</span>
    <span class="statusbar__spacer"></span>
    <span id="status-version">—</span>
  `;

  const dotEl = container.querySelector("#status-dot") as HTMLElement;
  const textEl = container.querySelector("#status-text") as HTMLElement;
  const packetsEl = container.querySelector("#status-packets") as HTMLElement;
  const durationEl = container.querySelector("#status-duration") as HTMLElement;
  const fileSizeEl = container.querySelector("#status-filesize") as HTMLElement;
  const versionEl = container.querySelector("#status-version") as HTMLElement;

  function setFileInfo(info: Ch10FileInfo) {
    packetsEl.textContent = `Packets: ${info.packetCount.toLocaleString()}`;
    durationEl.textContent = `Duration: ${formatDuration(info.durationSec)}`;
    fileSizeEl.textContent = `File: ${formatBytes(info.fileSize)}`;
    versionEl.textContent = `IRIG ${info.standardVersion} | Ch10`;
  }

  function setStatus(status: "ready" | "loading" | "error", message?: string) {
    const colors: Record<string, string> = {
      ready: "var(--c-success)",
      loading: "var(--c-warning)",
      error: "var(--c-danger)",
    };
    dotEl.style.background = colors[status];
    textEl.textContent = message || capitalize(status);
  }

  return { setFileInfo, setStatus };
}

function formatDuration(totalSec: number): string {
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = Math.floor(totalSec % 60);
  return [h, m, s].map((n) => String(n).padStart(2, "0")).join(":");
}

function formatBytes(bytes: number): string {
  if (bytes >= 1e9) return `${(bytes / 1e9).toFixed(1)} GB`;
  if (bytes >= 1e6) return `${(bytes / 1e6).toFixed(1)} MB`;
  if (bytes >= 1e3) return `${(bytes / 1e3).toFixed(1)} KB`;
  return `${bytes} B`;
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
