/**
 * Tests for src/types/domain.ts
 *
 * Covers:
 *   - formatIrigTime() formatting
 *   - dataTypeBadge() mapping for all known types
 *   - DataType enum values match IRIG 106 spec
 */

import { describe, it, expect } from "vitest";
import {
  formatIrigTime,
  dataTypeBadge,
  DataType,
} from "@/types/domain";
import type { IrigTime } from "@/types/domain";

describe("formatIrigTime", () => {
  it("formats a typical time value with zero-padding", () => {
    const t: IrigTime = {
      dayOfYear: 74,
      hours: 14,
      minutes: 23,
      seconds: 45,
      microseconds: 123456,
    };
    expect(formatIrigTime(t)).toBe("074:14:23:45.123456");
  });

  it("zero-pads day of year to 3 digits", () => {
    const t: IrigTime = {
      dayOfYear: 1,
      hours: 0,
      minutes: 0,
      seconds: 0,
      microseconds: 0,
    };
    expect(formatIrigTime(t)).toBe("001:00:00:00.000000");
  });

  it("zero-pads microseconds to 6 digits", () => {
    const t: IrigTime = {
      dayOfYear: 365,
      hours: 23,
      minutes: 59,
      seconds: 59,
      microseconds: 42,
    };
    expect(formatIrigTime(t)).toBe("365:23:59:59.000042");
  });

  it("handles maximum valid values", () => {
    const t: IrigTime = {
      dayOfYear: 366,
      hours: 23,
      minutes: 59,
      seconds: 59,
      microseconds: 999999,
    };
    expect(formatIrigTime(t)).toBe("366:23:59:59.999999");
  });

  it("handles all zeros", () => {
    const t: IrigTime = {
      dayOfYear: 0,
      hours: 0,
      minutes: 0,
      seconds: 0,
      microseconds: 0,
    };
    expect(formatIrigTime(t)).toBe("000:00:00:00.000000");
  });
});

describe("dataTypeBadge", () => {
  it("returns 1553 badge for MIL-STD-1553 Format A", () => {
    const badge = dataTypeBadge(DataType.Mil1553FmtA);
    expect(badge.label).toBe("1553");
    expect(badge.css).toBe("badge--1553");
  });

  it("returns 1553 badge for MIL-STD-1553 Format B", () => {
    const badge = dataTypeBadge(DataType.Mil1553FmtB);
    expect(badge.label).toBe("1553");
  });

  it("returns PCM badge for PCM Format A", () => {
    const badge = dataTypeBadge(DataType.PcmFmtA);
    expect(badge.label).toBe("PCM");
    expect(badge.css).toBe("badge--pcm");
  });

  it("returns Time badge", () => {
    const badge = dataTypeBadge(DataType.Time);
    expect(badge.label).toBe("Time");
    expect(badge.css).toBe("badge--time");
  });

  it("returns Video badge for Video Format A", () => {
    const badge = dataTypeBadge(DataType.VideoFmtA);
    expect(badge.label).toBe("Video");
    expect(badge.css).toBe("badge--video");
  });

  it("returns ARINC badge", () => {
    const badge = dataTypeBadge(DataType.Arinc429);
    expect(badge.label).toBe("ARINC");
    expect(badge.css).toBe("badge--arinc");
  });

  it("returns Ethernet badge for Ethernet Format A", () => {
    const badge = dataTypeBadge(DataType.EthernetFmtA);
    expect(badge.label).toBe("Ethernet");
    expect(badge.css).toBe("badge--ethernet");
  });

  it("returns hex label for unknown data type", () => {
    const badge = dataTypeBadge(0xff as DataType);
    expect(badge.label).toBe("0xff");
    expect(badge.css).toBe("badge--message");
  });

  it("returns hex label with zero-padded value", () => {
    const badge = dataTypeBadge(0x03 as DataType);
    expect(badge.label).toBe("0x03");
  });
});

describe("DataType enum values", () => {
  it("matches IRIG 106 spec hex codes", () => {
    // Spot-check critical values from IRIG 106-17 Table 10-6
    expect(DataType.Computer0).toBe(0x00);
    expect(DataType.PcmFmtA).toBe(0x09);
    expect(DataType.Time).toBe(0x11);
    expect(DataType.Mil1553FmtA).toBe(0x19);
    expect(DataType.Analog).toBe(0x21);
    expect(DataType.Discrete).toBe(0x29);
    expect(DataType.Arinc429).toBe(0x38);
    expect(DataType.VideoFmtA).toBe(0x40);
    expect(DataType.Uart).toBe(0x50);
    expect(DataType.EthernetFmtA).toBe(0x68);
    expect(DataType.Tspi).toBe(0x70);
    expect(DataType.Can).toBe(0x78);
  });
});
