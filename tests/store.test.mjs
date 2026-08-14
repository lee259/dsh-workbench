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
