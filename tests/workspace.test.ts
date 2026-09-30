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
  expect(result).toMatchObject({ ok: false, status: 413, error: "file_too_large" });
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

test("tree lists every file and content search works beyond any tree size", async () => {
  const files = {};
  for (let index = 0; index <= 1000; index += 1) {
    files[`/repo/src/file-${String(index).padStart(4, "0")}.ts`] = { isFile: true, content: "x" };
  }
  files["/repo/src/target-after-tree-limit.ts"] = { isFile: true, content: "x" };
  const workspace = createWorkspace({ root: "/repo", fs: memoryFs(files) });

  const tree = await workspace.tree();
  expect(tree.files.some((file) => file.path === "src/target-after-tree-limit.ts")).toBe(true);
  expect(tree.files).toHaveLength(1002);
  expect(await workspace.list("target-after-tree-limit")).toEqual([
    { path: "src/target-after-tree-limit.ts", size: 1 },
  ]);
});

test("tree keeps folders and files behind a large early directory", async () => {
  const files = {};
  for (let index = 0; index < 1050; index += 1) {
    files[`/repo/.claude/state-${index}.json`] = { isFile: true, content: "x" };
  }
  files["/repo/产品规划/roadmap.md"] = { isFile: true, content: "x" };
  files["/repo/技术学习/notes.md"] = { isFile: true, content: "x" };
  const workspace = createWorkspace({ root: "/repo", fs: memoryFs(files) });

  const tree = await workspace.tree();
  expect(tree.directories).toEqual(expect.arrayContaining([".claude", "产品规划", "技术学习"]));
  expect(tree.files).toEqual(expect.arrayContaining([
    { path: ".claude/state-0.json", size: 1 },
    { path: "产品规划/roadmap.md", size: 1 },
    { path: "技术学习/notes.md", size: 1 },
  ]));
  expect(tree.files).toHaveLength(1052);
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

test.each([
  "analysis.M", "model.R", "model.jl", "init.lua", "App.cs", "App.kt",
  "build.kts", "App.scala", "App.swift", "main.dart", "App.vue", "App.svelte",
  "data.xml", "schema.xsd", "style.xsl", "style.xslt", "types.pyi",
])("reads, searches, and edits newly supported source file %s", async (path) => {
  const workspace = createWorkspace({
    root: "/repo",
    fs: memoryFs({ [`/repo/${path}`]: { isFile: true, content: "original" } }),
  });
  expect(await workspace.read(path)).toMatchObject({ ok: true, content: "original" });
  expect(await workspace.searchContent("original")).toMatchObject([{ path, line: 1 }]);
  expect(await workspace.write(path, "updated", "original")).toMatchObject({ ok: true });
  expect(await workspace.read(path)).toMatchObject({ ok: true, content: "updated" });
});

test.each(["data.mat", "script.mlx", "model.slx", "code.p", "app.class", "app.dll"])(
  "keeps non-source formats out of code previews: %s", async (path) => {
    const workspace = createWorkspace({
      root: "/repo",
      fs: memoryFs({ [`/repo/${path}`]: { isFile: true, content: "binary" } }),
    });
    expect(await workspace.read(path)).toMatchObject({ ok: false, error: "not_previewable" });
    expect(await workspace.write(path, "text", "binary")).toMatchObject({ ok: false, error: "not_previewable" });
    expect(await workspace.searchContent("binary")).toEqual([]);
  },
);
