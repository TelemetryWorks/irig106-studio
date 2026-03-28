/**
 * Tests for src/components/theme-switcher.ts
 *
 * Covers:
 *   - initTheme() default behavior
 *   - toggleTheme() state transitions
 *   - setTheme() explicit setting
 *   - localStorage persistence
 *   - DOM attribute application
 */

import { describe, it, expect, beforeEach } from "vitest";
import { initTheme, toggleTheme, getTheme, setTheme } from "@/components/theme-switcher";

describe("theme-switcher", () => {
  beforeEach(() => {
    // Clear localStorage and reset DOM attribute
    localStorage.clear();
    document.documentElement.removeAttribute("data-theme");
  });

  describe("initTheme", () => {
    it("defaults to dark when no localStorage value exists", () => {
      const theme = initTheme();
      expect(theme).toBe("dark");
    });

    it("applies data-theme attribute to documentElement", () => {
      initTheme();
      expect(document.documentElement.getAttribute("data-theme")).toBe("dark");
    });

    it("restores light theme from localStorage", () => {
      localStorage.setItem("irig106-studio-theme", "light");
      const theme = initTheme();
      expect(theme).toBe("light");
      expect(document.documentElement.getAttribute("data-theme")).toBe("light");
    });

    it("treats invalid localStorage value as dark", () => {
      localStorage.setItem("irig106-studio-theme", "invalid");
      const theme = initTheme();
      expect(theme).toBe("dark");
    });
  });

  describe("toggleTheme", () => {
    it("toggles from dark to light", () => {
      initTheme(); // dark
      const result = toggleTheme();
      expect(result).toBe("light");
      expect(getTheme()).toBe("light");
    });

    it("toggles from light back to dark", () => {
      initTheme();
      toggleTheme(); // → light
      const result = toggleTheme(); // → dark
      expect(result).toBe("dark");
    });

    it("persists to localStorage", () => {
      initTheme();
      toggleTheme(); // → light
      expect(localStorage.getItem("irig106-studio-theme")).toBe("light");
    });

    it("updates DOM attribute", () => {
      initTheme();
      toggleTheme();
      expect(document.documentElement.getAttribute("data-theme")).toBe("light");
    });
  });

  describe("setTheme", () => {
    it("sets a specific theme", () => {
      initTheme();
      setTheme("light");
      expect(getTheme()).toBe("light");
      expect(document.documentElement.getAttribute("data-theme")).toBe("light");
      expect(localStorage.getItem("irig106-studio-theme")).toBe("light");
    });

    it("setting the same theme is a no-op", () => {
      initTheme();
      setTheme("dark");
      expect(getTheme()).toBe("dark");
    });
  });

  describe("getTheme", () => {
    it("returns current theme after init", () => {
      initTheme();
      expect(getTheme()).toBe("dark");
    });

    it("reflects toggle changes", () => {
      initTheme();
      toggleTheme();
      expect(getTheme()).toBe("light");
    });
  });
});
