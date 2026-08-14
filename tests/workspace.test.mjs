import assert from "node:assert/strict";
import test from "node:test";
import { createWorkspace } from "../lib/host/workspace.js";

function memoryFs(files) {
  return {
    async stat(absolute) {
      const file = files[absolute];
      if (!file) throw new Error("missing");
      return { isFile: file.isFile, size: file.content.length };
    },
    async readFile(absolute) {
      const file = files[absolute];
      if (!file) throw new Error("missing");
      return file.content;
    },
  };
}

test("reads an absolute path that is not under the start root", async () => {
  const workspace = createWorkspace({
    root: "/repo",
    fs: memoryFs({ "/other/project/a.ts": { isFile: true, content: "ok" } }),
  });
  const result = await workspace.read("/other/project/a.ts");
  assert.equal(result.ok, true);
  assert.equal(result.path, "/other/project/a.ts");
  assert.equal(result.content, "ok");
});

test("rejects a null-byte path", async () => {
  const workspace = createWorkspace({ root: "/repo", fs: memoryFs({}) });
  const result = await workspace.read("src/\0secret.ts");
  assert.equal(result.ok, false);
  assert.equal(result.status, 400);
});

test("rejects a missing path", async () => {
  const workspace = createWorkspace({ root: "/repo", fs: memoryFs({}) });
  const result = await workspace.read("src/missing.ts");
  assert.equal(result.ok, false);
  assert.equal(result.status, 404);
});

test("rejects an oversized file", async () => {
  const workspace = createWorkspace({
    root: "/repo",
    maxBytes: 4,
    fs: memoryFs({ "/repo/big.ts": { isFile: true, content: "12345" } }),
  });
  const result = await workspace.read("big.ts");
  assert.equal(result.ok, false);
  assert.equal(result.status, 413);
});

test("reads a workspace file", async () => {
  const workspace = createWorkspace({
    root: "/repo",
    fs: memoryFs({ "/repo/src/a.ts": { isFile: true, content: "ok" } }),
  });
  const result = await workspace.read("./src/a.ts");
  assert.equal(result.ok, true);
  assert.equal(result.path, "src/a.ts");
  assert.equal(result.content, "ok");
});
