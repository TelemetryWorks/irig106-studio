/**
 * PropertiesPanel — right sidebar showing details about the selected
 * channel and the packet under the cursor.
 */

import type { Channel, PacketHeader } from "@/types/domain";
import { dataTypeBadge } from "@/types/domain";

export function createPropertiesPanel(container: HTMLElement): {
  setChannel(channel: Channel): void;
  setPacket(packet: PacketHeader | null): void;
  clear(): void;
} {
  container.classList.add("panel", "props-panel");

  container.innerHTML = `
    <div class="resize-handle resize-handle--col left"></div>
    <div class="panel__header">
      <span class="panel__title">Properties</span>
    </div>
    <div class="panel__body" id="props-body">
      <div style="padding:16px;color:var(--c-text-tertiary);font-size:11px;text-align:center">
        Open a file to view properties
      </div>
    </div>
  `;

  const body = container.querySelector("#props-body") as HTMLElement;

  function setChannel(ch: Channel) {
    const badge = dataTypeBadge(ch.dataType);
    const rate = formatDataRate(ch.dataRate);

    let html = `
      <div class="prop-section">
        <div class="prop-section__title">Selected channel</div>
        <div class="prop-row">
          <span class="prop-row__label">Channel ID</span>
          <span class="prop-row__value">0x${ch.channelId.toString(16).padStart(2, "0")}</span>
        </div>
        <div class="prop-row">
          <span class="prop-row__label">Label</span>
          <span class="prop-row__value">${escHtml(ch.label)}</span>
        </div>
        <div class="prop-row">
          <span class="prop-row__label">Data type</span>
          <span class="prop-row__value"><span class="badge ${badge.css}">${badge.label}</span></span>
        </div>
        <div class="prop-row">
          <span class="prop-row__label">Data source</span>
          <span class="prop-row__value">${escHtml(ch.dataSourceId)}</span>
        </div>
        <div class="prop-row">
          <span class="prop-row__label">Packet count</span>
          <span class="prop-row__value">${ch.packetCount.toLocaleString()}</span>
        </div>
        <div class="prop-row">
          <span class="prop-row__label">Data rate</span>
          <span class="prop-row__value">${rate}</span>
        </div>
      </div>
    `;

    // Packet section (placeholder until cursor moves)
    html += `<div id="props-packet-section"></div>`;

    body.innerHTML = html;
  }

  function setPacket(pkt: PacketHeader | null) {
    const section = body.querySelector("#props-packet-section");
    if (!section) return;

    if (!pkt) {
      section.innerHTML = "";
      return;
    }

    section.innerHTML = `
      <div class="prop-section">
        <div class="prop-section__title">Packet at cursor</div>
        <div class="prop-row">
          <span class="prop-row__label">Offset</span>
          <span class="prop-row__value">0x${pkt.fileOffset.toString(16).toUpperCase()}</span>
        </div>
        <div class="prop-row">
          <span class="prop-row__label">Sync</span>
          <span class="prop-row__value">0x${pkt.syncPattern.toString(16).toUpperCase()}</span>
        </div>
        <div class="prop-row">
          <span class="prop-row__label">Seq #</span>
          <span class="prop-row__value">${pkt.sequenceNumber}</span>
        </div>
        <div class="prop-row">
          <span class="prop-row__label">Data length</span>
          <span class="prop-row__value">${pkt.dataLength} bytes</span>
        </div>
        <div class="prop-row">
          <span class="prop-row__label">Packet length</span>
          <span class="prop-row__value">${pkt.packetLength} bytes</span>
        </div>
        <div class="prop-row">
          <span class="prop-row__label">RTC</span>
          <span class="prop-row__value">0x${pkt.rtc.toString(16).toUpperCase().padStart(12, "0")}</span>
        </div>
        <div class="prop-row">
          <span class="prop-row__label">Checksum</span>
          <span class="prop-row__value ${pkt.checksumValid ? "prop-row__value--valid" : "prop-row__value--invalid"}">
            ${pkt.checksumValid ? "Valid" : "INVALID"}
          </span>
        </div>
      </div>
    `;
  }

  function clear() {
    body.innerHTML = `
      <div style="padding:16px;color:var(--c-text-tertiary);font-size:11px;text-align:center">
        Open a file to view properties
      </div>
    `;
  }

  return { setChannel, setPacket, clear };
}

// ── Helpers ──

function formatDataRate(bytesPerSec: number): string {
  if (bytesPerSec >= 1_000_000) return `${(bytesPerSec / 1_000_000).toFixed(1)} MB/s`;
  if (bytesPerSec >= 1_000) return `${(bytesPerSec / 1_000).toFixed(1)} KB/s`;
  return `${bytesPerSec} B/s`;
}

function escHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
