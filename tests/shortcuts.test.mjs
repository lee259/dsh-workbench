import assert from "node:assert/strict";
import test from "node:test";
import { shortcutAction } from "../lib/client/shortcuts.js";

const state = { visible: true, active: "b.ts", open: ["a.ts", "b.ts", "c.ts"] };

test("panel shortcuts hide and toggle visibility", () => {
  assert.deepEqual(shortcutAction({ key: "Escape" }, state), { type: "hide" });
  assert.deepEqual(shortcutAction({ key: "b", altKey: true, metaKey: true }, state), { type: "toggle" });
  assert.equal(shortcutAction({ key: "Escape" }, { ...state, visible: false }), null);
});

test("file shortcuts close and activate tabs", () => {
  assert.deepEqual(shortcutAction({ key: "w", metaKey: true }, state), { type: "close", path: "b.ts" });
  assert.deepEqual(shortcutAction({ key: "1", ctrlKey: true }, state), { type: "activate", path: "a.ts" });
  assert.deepEqual(shortcutAction({ key: "9", ctrlKey: true }, state), null);
  assert.deepEqual(shortcutAction({ key: "ArrowLeft", altKey: true }, state), { type: "activate", path: "a.ts" });
  assert.deepEqual(shortcutAction({ key: "ArrowRight", altKey: true }, state), { type: "activate", path: "c.ts" });
});

test("shortcut modifiers and inactive states are respected", () => {
  assert.equal(shortcutAction({ key: "w" }, state), null);
  assert.equal(shortcutAction({ key: "b", altKey: true }, state), null);
  assert.equal(shortcutAction({ key: "w", metaKey: true }, { ...state, active: "" }), null);
  assert.equal(shortcutAction({ key: "ArrowLeft", altKey: true }, { ...state, open: ["a.ts"] }), null);
});
