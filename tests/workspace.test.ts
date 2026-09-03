import { createWorkspace } from "../src/host/workspace.js";
import { expect, test } from "vitest";

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
    async writeFile(absolute, content) {
      const file = files[absolute];
      if (!file) throw new Error("missing");
      file.content = content;
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
  expect(result.ok).toBe(true);
  expect(result.path).toBe("/other/project/a.ts");
  expect(result.content).toBe("ok");
});

test("rejects a null-byte path", async () => {
  const workspace = createWorkspace({ root: "/repo", fs: memoryFs({}) });
  const result = await workspace.read("src/\0secret.ts");
  expect(result.ok).toBe(false);
  expect(result.status).toBe(400);
});

test("rejects a missing path", async () => {
  const workspace = createWorkspace({ root: "/repo", fs: memoryFs({}) });
  const result = await workspace.read("src/missing.ts");
  expect(result.ok).toBe(false);
  expect(result.status).toBe(404);
});

test("rejects an oversized file", async () => {
  const workspace = createWorkspace({
    root: "/repo",
    maxBytes: 4,
    fs: memoryFs({ "/repo/big.ts": { isFile: true, content: "12345" } }),
  });
  const result = await workspace.read("big.ts");
  expect(result.ok).toBe(false);
  expect(result.status).toBe(413);
});

test("rejects a file outside the preview allowlist", async () => {
  const workspace = createWorkspace({
    root: "/repo",
    fs: memoryFs({ "/repo/archive.zip": { isFile: true, content: "binary" } }),
  });
  const result = await workspace.read("archive.zip");
  expect(result).toMatchObject({ ok: false, status: 413, error: "not_previewable" });
});

test("reads a workspace file", async () => {
  const workspace = createWorkspace({
    root: "/repo",
    fs: memoryFs({ "/repo/src/a.ts": { isFile: true, content: "ok" } }),
  });
  const result = await workspace.read("./src/a.ts");
  expect(result.ok).toBe(true);
  expect(result.path).toBe("src/a.ts");
  expect(result.content).toBe("ok");
});

test("saves a workspace file when its baseline still matches", async () => {
  const files = { "/repo/src/a.ts": { isFile: true, content: "before" } };
  const workspace = createWorkspace({ root: "/repo", fs: memoryFs(files) });
  const result = await workspace.write("src/a.ts", "after", "before");
  expect(result).toMatchObject({ ok: true, path: "src/a.ts", content: "after" });
  expect(files["/repo/src/a.ts"].content).toBe("after");
});

test("refuses to overwrite a workspace file changed outside the editor", async () => {
  const workspace = createWorkspace({
    root: "/repo",
    fs: memoryFs({ "/repo/src/a.ts": { isFile: true, content: "external" } }),
  });
  const result = await workspace.write("src/a.ts", "draft", "before");
  expect(result).toMatchObject({ ok: false, status: 409, error: "file_changed" });
});

test("allows normal-sized images above the text preview limit", async () => {
  const workspace = createWorkspace({
    root: "/repo",
    fs: memoryFs({ "/repo/image.png": { isFile: true, content: "x".repeat(900_000) } }),
  });
  const result = await workspace.read("image.png");
  expect(result.ok).toBe(true);
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
  expect(await workspace.list(".ts")).toEqual([{ path: "src/a.ts", size: 2 }]);
  expect(await workspace.list()).toEqual([
    { path: ".env", size: 6 },
    { path: "src/a.ts", size: 2 },
    { path: "src/readme.md", size: 2 },
  ]);
  expect((await workspace.tree()).directories).toEqual(["src"]);
});

test("searches past the tree file limit", async () => {
  const files = {};
  for (let index = 0; index <= 1000; index += 1) {
    files[`/repo/src/file-${String(index).padStart(4, "0")}.ts`] = { isFile: true, content: "x" };
  }
  files["/repo/src/target-after-tree-limit.ts"] = { isFile: true, content: "x" };
  const workspace = createWorkspace({ root: "/repo", fs: memoryFs(files) });

  expect((await workspace.tree()).files.some((file) => file.path === "src/target-after-tree-limit.ts")).toBe(false);
  expect(await workspace.list("target-after-tree-limit")).toEqual([
    { path: "src/target-after-tree-limit.ts", size: 1 },
  ]);
});

test("searches file contents while skipping dependency directories", async () => {
  const workspace = createWorkspace({
    root: "/repo",
    fs: memoryFs({
      "/repo/src/a.ts": { isFile: true, content: "const needle = true;\nother" },
      "/repo/src/b.ts": { isFile: true, content: "none" },
      "/repo/node_modules/pkg/index.js": { isFile: true, content: "needle" },
    }),
  });
  expect(await workspace.searchContent("NEEDLE")).toEqual([
    { path: "src/a.ts", line: 1, column: 6, text: "const needle = true;" },
  ]);
});
