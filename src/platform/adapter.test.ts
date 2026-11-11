/**
 * Characterize the Tauri v2 single-file dialog contract before type cleanup.
 * Both string success and null cancellation also pass with the old adapter.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { TauriAdapter } from "@/platform/adapter";
import type { Ch10Summary } from "@/types/domain";

const { open, invoke } = vi.hoisted(() => ({
  open: vi.fn<typeof import("@tauri-apps/plugin-dialog").open>(),
  invoke: vi.fn<typeof import("@tauri-apps/api/core").invoke>(),
}));

vi.mock("@tauri-apps/plugin-dialog", () => ({ open }));
vi.mock("@tauri-apps/api/core", () => ({ invoke }));

describe("Tauri single-file dialog characterization", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("passes the selected string path unchanged to the existing command", async () => {
    const summary: Ch10Summary = {
      file: {
        filename: "flight.ch10",
        filepath: "/recordings/flight.ch10",
        fileSize: 24,
        packetCount: 1,
        durationSec: 0,
        standardVersion: "106-17",
      },
      dataSources: [],
      tmatsRaw: "",
    };
    open.mockResolvedValue("/recordings/flight.ch10");
    invoke.mockResolvedValue(summary);

    expect(await new TauriAdapter().openFile()).toBe(summary);
    expect(open).toHaveBeenCalledWith({
      title: "Open Ch10 File",
      filters: [{ name: "IRIG 106 Ch10", extensions: ["ch10", "c10"] }],
      multiple: false,
    });
    expect(invoke).toHaveBeenCalledExactlyOnceWith("open_ch10_file", {
      path: "/recordings/flight.ch10",
    });
  });

  it("returns null on cancellation without invoking the backend", async () => {
    open.mockResolvedValue(null);

    expect(await new TauriAdapter().openFile()).toBeNull();
    expect(invoke).not.toHaveBeenCalled();
  });
});
