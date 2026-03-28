/**
 * IRIG106-Studio — Core Domain Types
 *
 * These types define the contract between the UI layer and the backend.
 * The backend could be WASM (browser) or Tauri IPC (desktop).
 * Nothing in this file should import platform-specific code.
 */

// ── IRIG 106 Data Types ──

/** Chapter 10 data type identifiers */
export enum DataType {
  Computer0     = 0x00,
  Computer1     = 0x01,
  Time          = 0x11,
  Mil1553_FmtA  = 0x19,
  Mil1553_FmtB  = 0x1A,
  Analog        = 0x21,
  Discrete      = 0x29,
  Message       = 0x30,
  Arinc429      = 0x38,
  Video_FmtA    = 0x40,
  Video_FmtB    = 0x41,
  Image_FmtA    = 0x48,
  Uart          = 0x50,
  Ieee1394      = 0x58,
  ParallelDC    = 0x60,
  Ethernet_FmtA = 0x68,
  Ethernet_FmtB = 0x69,
  Tspi          = 0x70,
  Can           = 0x78,
  FibreCh       = 0x79,
  Pcm_FmtA      = 0x09,
  Pcm_FmtB      = 0x0A,
}

/** Human-readable badge label for a data type */
export function dataTypeBadge(dt: DataType): { label: string; css: string } {
  switch (dt) {
    case DataType.Mil1553_FmtA:
    case DataType.Mil1553_FmtB:
      return { label: "1553", css: "badge--1553" };
    case DataType.Pcm_FmtA:
    case DataType.Pcm_FmtB:
      return { label: "PCM", css: "badge--pcm" };
    case DataType.Time:
      return { label: "Time", css: "badge--time" };
    case DataType.Video_FmtA:
    case DataType.Video_FmtB:
      return { label: "Video", css: "badge--video" };
    case DataType.Arinc429:
      return { label: "ARINC", css: "badge--arinc" };
    case DataType.Analog:
      return { label: "Analog", css: "badge--analog" };
    case DataType.Discrete:
      return { label: "Discrete", css: "badge--discrete" };
    case DataType.Message:
      return { label: "Message", css: "badge--message" };
    case DataType.Uart:
      return { label: "UART", css: "badge--uart" };
    case DataType.Ethernet_FmtA:
    case DataType.Ethernet_FmtB:
      return { label: "Ethernet", css: "badge--ethernet" };
    default:
      return { label: `0x${dt.toString(16).padStart(2, "0")}`, css: "badge--message" };
  }
}

// ── File & Channel Model ──

export interface Ch10FileInfo {
  filename: string;
  filepath: string;
  fileSize: number;
  /** Total number of packets in the file */
  packetCount: number;
  /** Recording duration in seconds */
  durationSec: number;
  /** IRIG 106 standard version (e.g. "106-17") */
  standardVersion: string;
}

export interface Channel {
  channelId: number;
  dataType: DataType;
  /** Human label from TMATS, or synthesized */
  label: string;
  /** Data source ID from TMATS (R-x\DSI) */
  dataSourceId: string;
  packetCount: number;
  /** Average data rate in bytes/sec */
  dataRate: number;
}

export interface DataSource {
  id: string;
  label: string;
  channels: Channel[];
}

export interface Ch10Summary {
  file: Ch10FileInfo;
  dataSources: DataSource[];
  /** Raw TMATS text (channel 0) */
  tmatsRaw: string;
}

// ── Packet-level ──

export interface PacketHeader {
  syncPattern: number;
  channelId: number;
  packetLength: number;
  dataLength: number;
  dataTypeVersion: number;
  sequenceNumber: number;
  dataType: DataType;
  /** Relative time counter (48-bit) */
  rtc: bigint;
  /** Packet checksum validity */
  checksumValid: boolean;
  /** File offset in bytes */
  fileOffset: number;
}

// ── Time ──

export interface IrigTime {
  /** Day of year (1-based) */
  dayOfYear: number;
  hours: number;
  minutes: number;
  seconds: number;
  /** Fractional seconds (microsecond precision) */
  microseconds: number;
}

export function formatIrigTime(t: IrigTime): string {
  const doy = String(t.dayOfYear).padStart(3, "0");
  const hh = String(t.hours).padStart(2, "0");
  const mm = String(t.minutes).padStart(2, "0");
  const ss = String(t.seconds).padStart(2, "0");
  const us = String(t.microseconds).padStart(6, "0");
  return `${doy}:${hh}:${mm}:${ss}.${us}`;
}

// ── Console / Logging ──

export type LogLevel = "info" | "warn" | "error";

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
}

// ── Viewport state ──

export type ViewportTab = "waveform" | "hex" | "packets" | "tmats";
export type BottomTab = "console" | "statistics" | "time-correlation" | "errors";
