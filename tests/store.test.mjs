import assert from "node:assert/strict";
import test from "node:test";
import { createFileStore } from "../lib/client/store.js";

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
  assert.equal(state.loading, false);
  assert.equal(state.payload?.content, "ok");
  assert.equal(state.error, "");
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
  assert.equal(store.getSnapshot().payload?.source, "workspace");
  assert.equal(store.getSnapshot().payload?.before, null);
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
  assert.deepEqual(modes, ["a.ts:view", "b.ts:view", "a.ts:view"]);
  assert.equal(store.getSnapshot().payload?.source, "workspace");
  assert.equal(store.getSnapshot().views["a.ts"], "view");
});

test("reload preserves the current file open mode", async () => {
  const modes = [];
  const store = createFileStore(async (path, mode) => {
    modes.push(mode);
    return { path, content: "disk", before: null, source: "workspace", revision: 0, size: 4 };
  });
  await store.open("a.ts", "view");
  await store.reload();
  assert.deepEqual(modes, ["view", "view"]);
});

test("a failed open does not keep a stale payload", async () => {
  const store = createFileStore(async () => {
    throw new Error("boom");
  });
  await store.open("a.ts");
  const state = store.getSnapshot();
  assert.equal(state.payload, null);
  assert.equal(state.error, "boom");
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
  assert.equal(store.getSnapshot().path, "");
  assert.deepEqual(store.getSnapshot().open, []);
  assert.equal(store.getSnapshot().payload, null);
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
  assert.equal(store.getSnapshot().visible, false);
  assert.deepEqual(store.getSnapshot().open, ["a.ts"]);
  assert.equal(store.getSnapshot().active, "a.ts");
  store.show();
  assert.equal(store.getSnapshot().visible, true);
  assert.equal(store.getSnapshot().payload?.content, "a.ts");
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
  assert.equal(store.getSnapshot().visible, true);
  assert.equal(store.getSnapshot().active, "b.ts");
  assert.deepEqual(store.getSnapshot().open, ["a.ts", "b.ts"]);
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
  assert.deepEqual(state.open, ["a.ts", "b.ts"]);
  assert.equal(state.active, "b.ts");
  assert.equal(state.path, "b.ts");
  assert.equal(state.payload?.content, "b.ts");
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
  assert.deepEqual(state.open, ["a.ts", "b.ts"]);
  assert.equal(state.active, "a.ts");
  assert.equal(state.payload?.content, "a.ts");
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
  assert.deepEqual(state.open, ["a.ts"]);
  assert.equal(state.active, "a.ts");
  assert.equal(state.payload?.content, "a.ts");
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
  assert.deepEqual(state.open, ["b.ts"]);
  assert.equal(state.active, "b.ts");
  assert.equal(state.payload?.content, "b.ts");
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
  assert.deepEqual(store.getSnapshot().open, ["b.ts"]);
  assert.equal(store.getSnapshot().preview, "b.ts");
  assert.equal(store.getSnapshot().active, "b.ts");
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
  assert.equal(store.getSnapshot().preview, "a.ts");
  assert.deepEqual(store.getSnapshot().open, ["a.ts"]);
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
  assert.deepEqual(store.getSnapshot().open, ["a.ts", "b.ts"]);
  assert.equal(store.getSnapshot().preview, "b.ts");
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
  assert.equal(store.getSnapshot().views["a.ts"], "diff");
  assert.equal(store.getSnapshot().views["b.ts"], "view");
  store.close("a.ts");
  assert.equal(store.getSnapshot().views["a.ts"], undefined);
  assert.equal(store.getSnapshot().views["b.ts"], "view");
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
  assert.equal(store.getSnapshot().disk, 0);
  store.noteDiskChange();
  assert.equal(store.getSnapshot().disk, 1);
  assert.equal(store.getSnapshot().active, "a.ts");
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
  assert.equal(store.getSnapshot().reveal, 1);
  await store.open("b.ts");
  assert.equal(store.getSnapshot().reveal, 2);
  await store.activate("a.ts");
  assert.equal(store.getSnapshot().active, "a.ts");
  assert.equal(store.getSnapshot().reveal, 2);
  await store.open("b.ts", "auto", undefined, false);
  assert.equal(store.getSnapshot().active, "b.ts");
  assert.equal(store.getSnapshot().reveal, 2);
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
  assert.equal(store.getSnapshot().line, 3);
  await store.open("a.ts", "view", 9);
  assert.equal(store.getSnapshot().line, 9);
  await store.open("b.ts");
  assert.equal(store.getSnapshot().line, null);
  await store.activate("a.ts", "view", 2);
  assert.equal(store.getSnapshot().active, "a.ts");
  assert.equal(store.getSnapshot().line, 2);
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
  assert.equal(store.getSnapshot().path, "new.ts");
  assert.equal(store.getSnapshot().payload?.content, "new.ts");
});
