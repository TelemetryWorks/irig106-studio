/// <reference types="vitest" />
import { defineConfig } from "vite";

export default defineConfig({
  // Prevent vite from obscuring Rust errors
  clearScreen: false,
  server: {
    // Tauri expects a fixed port; fail if port is in use
    port: 1420,
    strictPort: true,
    // For mobile dev, Tauri sets TAURI_DEV_HOST
    host: process.env.TAURI_DEV_HOST || false,
    hmr: process.env.TAURI_DEV_HOST
      ? { protocol: "ws", host: process.env.TAURI_DEV_HOST, port: 1421 }
      : undefined,
  },
  // Env variables prefixed with TAURI_ are exposed to the frontend
  envPrefix: ["VITE_", "TAURI_"],
  build: {
    // Tauri uses Chromium on Windows and WebKit on macOS/Linux
    target: process.env.TAURI_ENV_PLATFORM === "windows" ? "chrome105" : "safari14",
    // Don't minify for debug builds
    minify: !process.env.TAURI_ENV_DEBUG ? "esbuild" : false,
    // Produce sourcemaps for debug builds
    sourcemap: !!process.env.TAURI_ENV_DEBUG,
    rollupOptions: {
      // Tauri packages resolve at runtime inside the webview.
      // In browser mode they're never called (factory picks MockAdapter).
      external: [
        "@tauri-apps/api/core",
        "@tauri-apps/plugin-dialog",
      ],
    },
  },
  resolve: {
    alias: {
      "@": "/src",
    },
  },
  test: {
    environment: "happy-dom",
    include: ["src/**/*.test.ts"],
    globals: true,
  },
});
