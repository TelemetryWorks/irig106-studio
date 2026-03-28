/**
 * Tests for src/components/keyboard-shortcuts.ts
 *
 * Covers:
 *   - KEYMAP completeness
 *   - formatShortcut() display strings
 *   - getGroupedShortcuts() deduplication and grouping
 */

import { describe, it, expect } from "vitest";
import {
  KEYMAP,
  formatShortcut,
  getGroupedShortcuts,
} from "@/components/keyboard-shortcuts";
import type { Shortcut } from "@/components/keyboard-shortcuts";

describe("KEYMAP", () => {
  it("contains at least 15 shortcuts", () => {
    expect(KEYMAP.length).toBeGreaterThanOrEqual(15);
  });

  it("has unique action+key combinations (no exact duplicates)", () => {
    const seen = new Set<string>();
    for (const s of KEYMAP) {
      const key = `${s.action}|${s.key}|${s.mod}|${s.shift}|${s.alt}`;
      expect(seen.has(key), `Duplicate shortcut: ${key}`).toBe(false);
      seen.add(key);
    }
  });

  it("includes file.open with mod key", () => {
    const open = KEYMAP.find((s) => s.action === "file.open");
    expect(open).toBeDefined();
    expect(open!.mod).toBe(true);
    expect(open!.key).toBe("o");
  });

  it("includes transport.play on Space", () => {
    const play = KEYMAP.find((s) => s.action === "transport.play");
    expect(play).toBeDefined();
    expect(play!.key).toBe(" ");
  });

  it("includes theme toggle", () => {
    const theme = KEYMAP.find((s) => s.action === "app.theme");
    expect(theme).toBeDefined();
    expect(theme!.mod).toBe(true);
    expect(theme!.shift).toBe(true);
  });

  it("all shortcuts have required fields", () => {
    for (const s of KEYMAP) {
      expect(s.action).toBeTruthy();
      expect(s.label).toBeTruthy();
      expect(s.category).toBeTruthy();
      expect(s.key).toBeDefined();
    }
  });

  it("all categories are valid", () => {
    const validCategories = new Set(["file", "transport", "navigation", "view", "app"]);
    for (const s of KEYMAP) {
      expect(
        validCategories.has(s.category),
        `Invalid category "${s.category}" on action "${s.action}"`
      ).toBe(true);
    }
  });
});

describe("formatShortcut", () => {
  it("formats a simple key with no modifiers", () => {
    const s: Shortcut = { action: "test", label: "Test", category: "app", key: " " };
    const result = formatShortcut(s);
    expect(result).toContain("Space");
  });

  it("formats Ctrl+O (non-Mac)", () => {
    // formatShortcut reads navigator.platform which in happy-dom is empty
    // so it defaults to non-Mac behavior (Ctrl)
    const s: Shortcut = { action: "test", label: "Test", category: "file", key: "o", mod: true };
    const result = formatShortcut(s);
    expect(result).toContain("Ctrl");
    expect(result).toContain("O");
  });

  it("formats Alt+Shift+1", () => {
    const s: Shortcut = { action: "test", label: "Test", category: "nav", key: "1", alt: true, shift: true };
    const result = formatShortcut(s);
    expect(result).toContain("Alt");
    expect(result).toContain("1");
  });

  it("formats arrow keys with symbols", () => {
    const s: Shortcut = { action: "test", label: "Test", category: "nav", key: "ArrowLeft" };
    expect(formatShortcut(s)).toContain("←");
  });

  it("formats Home key", () => {
    const s: Shortcut = { action: "test", label: "Test", category: "nav", key: "Home" };
    expect(formatShortcut(s)).toContain("Home");
  });
});

describe("getGroupedShortcuts", () => {
  it("returns a Map with expected categories", () => {
    const groups = getGroupedShortcuts();
    expect(groups.has("file")).toBe(true);
    expect(groups.has("transport")).toBe(true);
    expect(groups.has("app")).toBe(true);
  });

  it("deduplicates shortcuts with the same action", () => {
    const groups = getGroupedShortcuts();
    // app.shortcuts has two entries (? and F1) but should appear once
    const appShortcuts = groups.get("app") || [];
    const shortcutActions = appShortcuts.filter((s) => s.action === "app.shortcuts");
    expect(shortcutActions.length).toBe(1);
  });

  it("all groups have at least one shortcut", () => {
    const groups = getGroupedShortcuts();
    for (const [category, shortcuts] of groups) {
      expect(
        shortcuts.length,
        `Category "${category}" is empty`
      ).toBeGreaterThan(0);
    }
  });
});
