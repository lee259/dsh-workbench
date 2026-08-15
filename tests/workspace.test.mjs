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
    async readDir(absolute) {
      const prefix = absolute.endsWith("/") ? absolute : `${absolute}/`;
      const names = new Map();
      for (const path of Object.keys(files)) {
        if (!path.startsWith(prefix)) continue;
        const rest = path.slice(prefix.length);
        const [name, ...tail] = rest.split("/");
        if (!name) continue;
        names.set(name, { name, isFile: tail.length === 0, isDirectory: tail.length > 0 });
      }
      return [...names.values()];
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

test("lists matching workspace files while skipping dependency directories", async () => {
  const workspace = createWorkspace({
    root: "/repo",
    fs: memoryFs({
      "/repo/src/a.ts": { isFile: true, content: "ok" },
      "/repo/src/readme.md": { isFile: true, content: "ok" },
      "/repo/.env": { isFile: true, content: "secret" },
      "/repo/.pnpm-store/v10/index": { isFile: true, content: "ignored" },
      "/repo/node_modules/pkg/index.js": { isFile: true, content: "ignored" },
    }),
  });
  assert.deepEqual(await workspace.list(".ts"), [{ path: "src/a.ts", size: 2 }]);
  assert.deepEqual(await workspace.list(), [
    { path: ".env", size: 6 },
    { path: "src/a.ts", size: 2 },
    { path: "src/readme.md", size: 2 },
  ]);
  assert.deepEqual((await workspace.tree()).directories, ["src"]);
});

test("searches past the tree file limit", async () => {
  const files = {};
  for (let index = 0; index <= 1000; index += 1) {
    files[`/repo/src/file-${String(index).padStart(4, "0")}.ts`] = { isFile: true, content: "x" };
  }
  files["/repo/src/target-after-tree-limit.ts"] = { isFile: true, content: "x" };
  const workspace = createWorkspace({ root: "/repo", fs: memoryFs(files) });

  assert.equal((await workspace.tree()).files.some((file) => file.path === "src/target-after-tree-limit.ts"), false);
  assert.deepEqual(await workspace.list("target-after-tree-limit"), [
    { path: "src/target-after-tree-limit.ts", size: 1 },
  ]);
});
