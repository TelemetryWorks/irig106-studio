// Check the installed versions reported by `tauri info`, not manifest ranges.
// Tauri's Rust/JS pairs must share major/minor; patch releases can differ.
import { readFileSync } from "node:fs";

const output = readFileSync(0, "utf8");
process.stdout.write(output);

try {
  if (/mismatch/i.test(output)) {
    throw new Error("tauri info reported a version mismatch");
  }
  const versions = new Map(
    [...output.matchAll(/^\s*-\s+(\S+)\s+[^:\n]*:\s*(\d+\.\d+\.\d+)/gm)].map((match) => [
      match[1],
      match[2],
    ]),
  );
  const pairs = [
    ["tauri", "@tauri-apps/api"],
    ["tauri-plugin-dialog", "@tauri-apps/plugin-dialog"],
  ];
  // A Rust-only plugin (currently fs) needs no JS counterpart. Check any
  // additional plugin pair that tauri info reports as installed on both sides.
  for (const name of versions.keys()) {
    if (name.startsWith("tauri-plugin-") && name !== "tauri-plugin-dialog") {
      const js = `@tauri-apps/plugin-${name.slice("tauri-plugin-".length)}`;
      if (versions.has(js)) pairs.push([name, js]);
    }
  }
  for (const [rust, js] of pairs) {
    const rustVersion = versions.get(rust);
    const jsVersion = versions.get(js);
    if (!rustVersion || !jsVersion) {
      throw new Error(`tauri info did not report both ${rust} and ${js}`);
    }
    const minor = (version) => version.split(".").slice(0, 2).join(".");
    if (minor(rustVersion) !== minor(jsVersion)) {
      throw new Error(`${rust} ${rustVersion} does not match ${js} ${jsVersion}`);
    }
  }
  console.log("Tauri Rust/JS versions are aligned (major/minor).");
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
