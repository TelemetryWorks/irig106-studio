/**
 * IRIG106-Studio — Platform Abstraction Layer
 *
 * This is THE boundary between the UI and the backend.
 * The UI never imports @tauri-apps/api or wasm-bindgen directly.
 * Instead, it calls these functions, and the platform adapter routes
 * to the correct backend.
 *
 * Two adapters:
 *   - TauriAdapter:   desktop — calls Rust via Tauri IPC (#[tauri::command])
 *   - WasmAdapter:    browser — calls Rust via wasm-bindgen
 *   - MockAdapter:    dev/demo — returns synthetic data (used until backends exist)
 */

import type {
  Ch10Summary,
  PacketHeader,
  LogEntry,
} from "@/types/domain";

// ── Platform interface ──

export interface PlatformAdapter {
  readonly name: "tauri" | "wasm" | "mock";

  /**
   * Open a Ch10 file. On desktop this uses a native file dialog.
   * In browser this uses the File API.
   * Returns null if the user cancels.
   */
  openFile(): Promise<Ch10Summary | null>;

  /**
   * Read a range of packet headers starting at a given packet index.
   * Used for virtual-scrolling the packet list.
   */
  readPacketHeaders(startIndex: number, count: number): Promise<PacketHeader[]>;

  /**
   * Read raw bytes from a packet's data payload.
   * Used for the hex view.
   */
  readPacketData(fileOffset: number, length: number): Promise<Uint8Array>;

  /**
   * Subscribe to log messages from the backend.
   * Returns an unsubscribe function.
   */
  onLog(callback: (entry: LogEntry) => void): () => void;
}

// ── Platform detection ──

function isTauri(): boolean {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}

// ── Mock adapter (what we ship first) ──

class MockAdapter implements PlatformAdapter {
  readonly name = "mock" as const;

  private logListeners: Set<(entry: LogEntry) => void> = new Set();

  private emit(level: LogEntry["level"], message: string) {
    const now = new Date();
    const ts = [
      now.getHours().toString().padStart(2, "0"),
      now.getMinutes().toString().padStart(2, "0"),
      now.getSeconds().toString().padStart(2, "0"),
      ".",
      now.getMilliseconds().toString().padStart(3, "0"),
    ].join("");
    const entry: LogEntry = { timestamp: ts, level, message };
    this.logListeners.forEach((cb) => cb(entry));
  }

  async openFile(): Promise<Ch10Summary | null> {
    // Simulate a file open with synthetic data
    this.emit("info", "Opening flight_test_042.ch10 (2.4 GB)");

    await delay(120);
    this.emit("info", "TMATS parsed: 5 channels, 3 data sources");

    await delay(50);
    this.emit("info", "Time format: IRIG-B, epoch: 2024-03-15");

    await delay(80);
    this.emit("warn", "Ch2 packet 0x1A3F: CRC mismatch");

    await delay(200);
    this.emit("info", "Indexing complete: 1,247,832 packets");

    return MOCK_SUMMARY;
  }

  async readPacketHeaders(startIndex: number, count: number): Promise<PacketHeader[]> {
    const headers: PacketHeader[] = [];
    for (let i = 0; i < count; i++) {
      const idx = startIndex + i;
      headers.push({
        syncPattern: 0xeb25,
        channelId: (idx % 5) + 1,
        packetLength: 128 + (idx % 256),
        dataLength: 64 + (idx % 192),
        dataTypeVersion: 1,
        sequenceNumber: idx % 256,
        dataType: ([0x19, 0x19, 0x09, 0x11, 0x40] as number[])[idx % 5],
        rtc: BigInt(idx * 100_000),
        checksumValid: idx % 47 !== 0, // occasional invalid
        fileOffset: idx * 384,
      });
    }
    return headers;
  }

  async readPacketData(_fileOffset: number, length: number): Promise<Uint8Array> {
    const data = new Uint8Array(length);
    for (let i = 0; i < length; i++) {
      data[i] = Math.floor(Math.random() * 256);
    }
    return data;
  }

  onLog(callback: (entry: LogEntry) => void): () => void {
    this.logListeners.add(callback);
    return () => this.logListeners.delete(callback);
  }
}

// ── Tauri adapter (stub — filled in when backend crates are ready) ──

export class TauriAdapter implements PlatformAdapter {
  readonly name = "tauri" as const;

  async openFile(): Promise<Ch10Summary | null> {
    // Will use: const { open } = await import("@tauri-apps/plugin-dialog");
    // Then: const result = await invoke<Ch10Summary>("open_ch10_file", { path });
    throw new Error("Tauri backend not yet implemented — use mock adapter");
  }

  async readPacketHeaders(_startIndex: number, _count: number): Promise<PacketHeader[]> {
    // Will use: return invoke("read_packet_headers", { startIndex, count });
    throw new Error("Not implemented");
  }

  async readPacketData(_fileOffset: number, _length: number): Promise<Uint8Array> {
    // Will use: return invoke("read_packet_data", { fileOffset, length });
    throw new Error("Not implemented");
  }

  onLog(_callback: (entry: LogEntry) => void): () => void {
    // Will use: const unlisten = await listen<LogEntry>("log-entry", (event) => callback(event.payload));
    return () => {};
  }
}

// ── Factory ──

let _adapter: PlatformAdapter | null = null;

export function getPlatform(): PlatformAdapter {
  if (!_adapter) {
    if (isTauri()) {
      console.log("[platform] Detected Tauri — using native adapter (falling back to mock)");
      // Use mock until Tauri backend is implemented
      _adapter = new MockAdapter();
    } else {
      console.log("[platform] Browser mode — using mock adapter");
      _adapter = new MockAdapter();
    }
  }
  return _adapter;
}

// ── Helpers ──

function delay(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

// ── Synthetic test data ──

const MOCK_SUMMARY: Ch10Summary = {
  file: {
    filename: "flight_test_042.ch10",
    filepath: "/data/recordings/flight_test_042.ch10",
    fileSize: 2_400_000_000,
    packetCount: 1_247_832,
    durationSec: 2535,
    standardVersion: "106-17",
  },
  dataSources: [
    {
      id: "DS-1",
      label: "Recorder 1",
      channels: [
        { channelId: 1, dataType: 0x19, label: "1553 Bus A",        dataSourceId: "DS-1", packetCount: 248_192, dataRate: 1_200_000 },
        { channelId: 2, dataType: 0x19, label: "1553 Bus B",        dataSourceId: "DS-1", packetCount: 241_017, dataRate: 1_150_000 },
        { channelId: 3, dataType: 0x09, label: "PCM Stream 1",      dataSourceId: "DS-1", packetCount: 312_445, dataRate: 2_500_000 },
        { channelId: 4, dataType: 0x11, label: "IRIG Time",         dataSourceId: "DS-1", packetCount: 2_535,   dataRate: 1_000 },
        { channelId: 5, dataType: 0x40, label: "HUD Camera",        dataSourceId: "DS-1", packetCount: 76_140,  dataRate: 8_000_000 },
      ],
    },
    {
      id: "DS-2",
      label: "Recorder 2",
      channels: [
        { channelId: 6, dataType: 0x38, label: "ARINC 429 Bus 1",  dataSourceId: "DS-2", packetCount: 185_300, dataRate: 800_000 },
        { channelId: 7, dataType: 0x68, label: "Ethernet Ch 1",    dataSourceId: "DS-2", packetCount: 182_203, dataRate: 4_200_000 },
      ],
    },
  ],
  tmatsRaw: `R-1\\ID:Flight Test 042;
R-1\\NSS:2;
R-1\\DSI-1:Recorder_1;
R-1\\DSI-2:Recorder_2;
R-1\\TK1-1:Track_01;
R-1\\CHE-1:T;
B-1\\DLN-1:1553_BUS_A;`,
};
