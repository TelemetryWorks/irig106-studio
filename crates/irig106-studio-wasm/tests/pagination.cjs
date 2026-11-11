// Exercise the generated wasm-bindgen constructor and read_headers export in Node.
// This runs on wasm32, so start + count overflow is tested at the actual width.
const assert = require("node:assert/strict");
const { test } = require("node:test");
const { StudioSession } = require("../target/nodejs/irig106_studio_wasm.js");

function session(total = 3) {
  const bytes = new Uint8Array(Math.max(total, 1) * 24);
  const view = new DataView(bytes.buffer);
  for (let i = 0; i < total; i++) {
    const offset = i * 24;
    view.setUint16(offset, 0xeb25, true);
    view.setUint16(offset + 2, i, true);
    view.setUint32(offset + 4, 24, true);
  }
  return new StudioSession(bytes, "pagination.ch10");
}

const max = 0xffffffff;
for (const [name, total, start, count, expected] of [
  ["first page", 3, 0, 2, [0, 1]],
  ["exact end", 3, 1, 2, [1, 2]],
  ["partial final page", 3, 2, 2, [2]],
  ["zero count", 3, 0, 0, []],
  ["start at total", 3, 3, 1, []],
  ["start beyond total", 3, 4, 1, []],
  ["zero count beyond total", 3, 4, 0, []],
  ["empty index", 0, 0, 1, []],
  ["beyond empty index", 0, 1, 1, []],
  ["maximum count", 3, 0, max, [0, 1, 2]],
  ["end addition overflow", 3, 2, max, [2]],
  ["maximum start", 3, max, 0, []],
  ["maximum start plus one", 3, max, 1, []],
  ["maximum start and count", 3, max, max, []],
]) {
  test(name, () => {
    const file = session(total);
    // A Rust panic can leave the session borrowed. Preserve that original trap
    // instead of masking it with a second error from free() during unwinding.
    const headers = file.read_headers(start, count);
    try {
      assert.ok(Array.isArray(headers));
      assert.deepEqual(headers.map((header) => header.channel_id), expected);
      assert.deepEqual(headers.map((header) => Number(header.file_offset)), expected.map((id) => id * 24));
    } finally {
      file.free();
    }
  });
}
