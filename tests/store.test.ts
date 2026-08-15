import { createFileStore } from "../src/client/store.js";
import { expect, test } from "vitest";

test("open records a successful payload", async () => {
  const store = createFileStore(async (path) => ({
    path,
    content: "ok",
    before: null,
    source: "workspace",
    revision: 0,
    size: 2,
  }));
  await store.open("a.ts");
  const state = store.getSnapshot();
  expect(state.loading).toBe(false);
  expect(state.payload?.content).toBe("ok");
  expect(state.error).toBe("");
});

test("a view request cannot render a write payload as a diff", async () => {
  const store = createFileStore(async (path) => ({
    path,
    content: "written",
    before: "original",
    source: "dsh-write",
    revision: 1,
    size: 7,
  }));
  await store.open("a.ts", "view");
  expect(store.getSnapshot().payload?.source).toBe("workspace");
  expect(store.getSnapshot().payload?.before).toBe(null);
});

test("activate without a mode keeps the tab's remembered view", async () => {
  const modes = [];
  const store = createFileStore(async (path, mode) => {
    modes.push(`${path}:${mode ?? "auto"}`);
    return {
      path,
      content: path,
      before: path === "a.ts" ? "old" : null,
      source: path === "a.ts" ? "dsh-write" : "workspace",
      revision: path === "a.ts" ? 1 : 0,
      size: 1,
    };
  });
  await store.open("a.ts", "view");
  await store.open("b.ts", "view");
  await store.activate("a.ts");
  expect(modes).toEqual(["a.ts:view", "b.ts:view", "a.ts:view"]);
  expect(store.getSnapshot().payload?.source).toBe("workspace");
  expect(store.getSnapshot().views["a.ts"]).toBe("view");
});

test("reload preserves the current file open mode", async () => {
  const modes = [];
  const store = createFileStore(async (path, mode) => {
    modes.push(mode);
    return { path, content: "disk", before: null, source: "workspace", revision: 0, size: 4 };
  });
  await store.open("a.ts", "view");
  await store.reload();
  expect(modes).toEqual(["view", "view"]);
});

test("a failed open does not keep a stale payload", async () => {
  const store = createFileStore(async () => {
    throw new Error("boom");
  });
  await store.open("a.ts");
  const state = store.getSnapshot();
  expect(state.payload).toBe(null);
  expect(state.error).toBe("boom");
});

test("close clears the open file", async () => {
  const store = createFileStore(async (path) => ({
    path,
    content: path,
    before: null,
    source: "workspace",
    revision: 0,
    size: 1,
  }));
  await store.open("a.ts");
  store.close();
  expect(store.getSnapshot().path).toBe("");
  expect(store.getSnapshot().open).toEqual([]);
  expect(store.getSnapshot().payload).toBe(null);
});

test("show and hide only change panel visibility", async () => {
  const store = createFileStore(async (path) => ({
    path,
    content: path,
    before: null,
    source: "workspace",
    revision: 0,
    size: 1,
  }));
  await store.open("a.ts");
  store.hide();
  expect(store.getSnapshot().visible).toBe(false);
  expect(store.getSnapshot().open).toEqual(["a.ts"]);
  expect(store.getSnapshot().active).toBe("a.ts");
  store.show();
  expect(store.getSnapshot().visible).toBe(true);
  expect(store.getSnapshot().payload?.content).toBe("a.ts");
});

test("opening a file reopens a hidden panel", async () => {
  const store = createFileStore(async (path) => ({
    path,
    content: path,
    before: null,
    source: "workspace",
    revision: 0,
    size: 1,
  }));
  await store.open("a.ts");
  store.hide();
  await store.open("b.ts");
  expect(store.getSnapshot().visible).toBe(true);
  expect(store.getSnapshot().active).toBe("b.ts");
  expect(store.getSnapshot().open).toEqual(["a.ts", "b.ts"]);
});

test("open keeps a set and activates the latest path", async () => {
  const store = createFileStore(async (path) => ({
    path,
    content: path,
    before: null,
    source: "workspace",
    revision: 0,
    size: 1,
  }));
  await store.open("a.ts");
  await store.open("./b.ts");
  const state = store.getSnapshot();
  expect(state.open).toEqual(["a.ts", "b.ts"]);
  expect(state.active).toBe("b.ts");
  expect(state.path).toBe("b.ts");
  expect(state.payload?.content).toBe("b.ts");
});

test("activate reloads a path already in the open set", async () => {
  const store = createFileStore(async (path) => ({
    path,
    content: path,
    before: null,
    source: "workspace",
    revision: 0,
    size: 1,
  }));
  await store.open("a.ts");
  await store.open("b.ts");
  await store.activate("a.ts");
  const state = store.getSnapshot();
  expect(state.open).toEqual(["a.ts", "b.ts"]);
  expect(state.active).toBe("a.ts");
  expect(state.payload?.content).toBe("a.ts");
});

test("close of the active path activates the last remaining file", async () => {
  const store = createFileStore(async (path) => ({
    path,
    content: path,
    before: null,
    source: "workspace",
    revision: 0,
    size: 1,
  }));
  await store.open("a.ts");
  await store.open("b.ts");
  store.close("b.ts");
  await Promise.resolve();
  await Promise.resolve();
  const state = store.getSnapshot();
  expect(state.open).toEqual(["a.ts"]);
  expect(state.active).toBe("a.ts");
  expect(state.payload?.content).toBe("a.ts");
});

test("close of a background path keeps the active file", async () => {
  const store = createFileStore(async (path) => ({
    path,
    content: path,
    before: null,
    source: "workspace",
    revision: 0,
    size: 1,
  }));
  await store.open("a.ts");
  await store.open("b.ts");
  store.close("a.ts");
  const state = store.getSnapshot();
  expect(state.open).toEqual(["b.ts"]);
  expect(state.active).toBe("b.ts");
  expect(state.payload?.content).toBe("b.ts");
});

test("preview opens replace the transient tab", async () => {
  const store = createFileStore(async (path) => ({
    path,
    content: path,
    before: null,
    source: "workspace",
    revision: 0,
    size: 1,
  }));
  await store.open("a.ts", "view", undefined, false, "preview");
  await store.open("b.ts", "view", undefined, false, "preview");
  expect(store.getSnapshot().open).toEqual(["b.ts"]);
  expect(store.getSnapshot().preview).toBe("b.ts");
  expect(store.getSnapshot().active).toBe("b.ts");
});

test("activating a preview tab does not pin it", async () => {
  const store = createFileStore(async (path) => ({
    path,
    content: path,
    before: null,
    source: "workspace",
    revision: 0,
    size: 1,
  }));
  await store.open("a.ts", "view", undefined, false, "preview");
  await store.activate("a.ts");
  expect(store.getSnapshot().preview).toBe("a.ts");
  expect(store.getSnapshot().open).toEqual(["a.ts"]);
});

test("pinning a preview keeps it when another file is previewed", async () => {
  const store = createFileStore(async (path) => ({
    path,
    content: path,
    before: null,
    source: "workspace",
    revision: 0,
    size: 1,
  }));
  await store.open("a.ts", "view", undefined, false, "preview");
  store.pin("a.ts");
  await store.open("b.ts", "view", undefined, false, "preview");
  expect(store.getSnapshot().open).toEqual(["a.ts", "b.ts"]);
  expect(store.getSnapshot().preview).toBe("b.ts");
});

test("open remembers whether a tab is a view or a captured diff", async () => {
  const store = createFileStore(async (path) => ({
    path,
    content: path,
    before: path === "a.ts" ? "old" : null,
    source: path === "a.ts" ? "dsh-write" : "workspace",
    revision: path === "a.ts" ? 1 : 0,
    size: 1,
  }));
  await store.open("a.ts");
  await store.open("b.ts", "view");
  expect(store.getSnapshot().views["a.ts"]).toBe("diff");
  expect(store.getSnapshot().views["b.ts"]).toBe("view");
  store.close("a.ts");
  expect(store.getSnapshot().views["a.ts"]).toBe(undefined);
  expect(store.getSnapshot().views["b.ts"]).toBe("view");
});

test("disk changes bump a generation without changing the active file", async () => {
  const store = createFileStore(async (path) => ({
    path,
    content: path,
    before: null,
    source: "workspace",
    revision: 0,
    size: 1,
  }));
  await store.open("a.ts");
  expect(store.getSnapshot().disk).toBe(0);
  store.noteDiskChange();
  expect(store.getSnapshot().disk).toBe(1);
  expect(store.getSnapshot().active).toBe("a.ts");
});

test("open can reveal a file in the tree without a tab switch doing the same", async () => {
  const store = createFileStore(async (path) => ({
    path,
    content: path,
    before: null,
    source: "workspace",
    revision: 0,
    size: 1,
  }));
  await store.open("a.ts");
  expect(store.getSnapshot().reveal).toBe(1);
  await store.open("b.ts");
  expect(store.getSnapshot().reveal).toBe(2);
  await store.activate("a.ts");
  expect(store.getSnapshot().active).toBe("a.ts");
  expect(store.getSnapshot().reveal).toBe(2);
  await store.open("b.ts", "auto", undefined, false);
  expect(store.getSnapshot().active).toBe("b.ts");
  expect(store.getSnapshot().reveal).toBe(2);
});

test("open and activate remember a preview line", async () => {
  const store = createFileStore(async (path) => ({
    path,
    content: "one\ntwo\nthree\n",
    before: null,
    source: "workspace",
    revision: 0,
    size: 14,
  }));
  await store.open("a.ts", "view", 3);
  expect(store.getSnapshot().line).toBe(3);
  await store.open("a.ts", "view", 9);
  expect(store.getSnapshot().line).toBe(9);
  await store.open("b.ts");
  expect(store.getSnapshot().line).toBe(null);
  await store.activate("a.ts", "view", 2);
  expect(store.getSnapshot().active).toBe("a.ts");
  expect(store.getSnapshot().line).toBe(2);
});

test("a newer open wins over a slower earlier request", async () => {
  let finishFirst;
  const first = new Promise((resolve) => {
    finishFirst = resolve;
  });
  const store = createFileStore(async (path) => {
    if (path === "old.ts") await first;
    return { path, content: path, before: null, source: "workspace", revision: 0, size: 1 };
  });
  const older = store.open("old.ts");
  const newer = store.open("new.ts");
  finishFirst();
  await Promise.all([older, newer]);
  expect(store.getSnapshot().path).toBe("new.ts");
  expect(store.getSnapshot().payload?.content).toBe("new.ts");
});

test("open adopts the host-normalized relative path as the canonical tab key", async () => {
  const store = createFileStore(async (path) => ({
    path: path.startsWith("/repo/") ? path.slice("/repo/".length) : path,
    content: "ok",
    before: null,
    source: "workspace",
    revision: 0,
    size: 2,
  }));
  await store.open("/repo/src/a.ts");
  const state = store.getSnapshot();
  expect(state.active).toBe("src/a.ts");
  expect(state.open).toEqual(["src/a.ts"]);
  expect(state.path).toBe("src/a.ts");
  expect(state.payload?.path).toBe("src/a.ts");
});

test("opening the same file by absolute path reuses the existing relative tab", async () => {
  const store = createFileStore(async (path) => ({
    path: path.startsWith("/repo/") ? path.slice("/repo/".length) : path,
    content: "ok",
    before: null,
    source: "workspace",
    revision: 0,
    size: 2,
  }));
  await store.open("src/a.ts");
  await store.open("/repo/src/a.ts");
  const state = store.getSnapshot();
  expect(state.open).toEqual(["src/a.ts"]);
  expect(state.active).toBe("src/a.ts");
});
