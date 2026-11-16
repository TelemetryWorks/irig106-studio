import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { test } from "node:test";

// Format captured from the installed CLI's `tauri info` output.
const aligned = `[-] Packages
    - tauri 🦀: 2.12.5
    - @tauri-apps/api  ⱼₛ: 2.12.4
[-] Plugins
    - tauri-plugin-dialog 🦀: 2.8.4
    - @tauri-apps/plugin-dialog  ⱼₛ: 2.8.4
    - tauri-plugin-fs 🦀: 2.7.1
    - @tauri-apps/plugin-fs  ⱼₛ: not installed!
`;

function check(input) {
  return spawnSync(process.execPath, ["scripts/check-tauri-versions.mjs"], {
    input,
    encoding: "utf8",
  });
}

test("accepts aligned minors with different core patches and Rust-only fs", () => {
  assert.equal(check(aligned).status, 0);
});

test("rejects the pre-existing core/API mismatch", () => {
  const result = check(aligned.replace("2.12.5", "2.11.1").replace("2.12.4", "2.10.1"));
  assert.equal(result.status, 1);
  assert.match(result.stderr, /tauri 2.11.1 does not match/);
});

test("rejects independently updated dialog and additional plugin pairs", () => {
  assert.equal(check(aligned.replace("dialog 🦀: 2.8.4", "dialog 🦀: 2.7.0")).status, 1);
  assert.equal(check(aligned.replace("not installed!", "2.6.0")).status, 1);
});

test("fails closed on missing output or explicit CLI mismatch diagnostics", () => {
  assert.equal(check("").status, 1);
  assert.equal(check(aligned.replace("@tauri-apps/api", "missing-api")).status, 1);
  assert.equal(check(`${aligned}\nVersion mismatch detected`).status, 1);
});
