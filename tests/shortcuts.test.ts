import { shortcutAction } from "../src/client/chrome/shortcuts.js";
import { expect, test } from "vitest";

const state = { visible: true, active: "b.ts", open: ["a.ts", "b.ts", "c.ts"] };

test("panel shortcuts hide and toggle visibility", () => {
  expect(shortcutAction({ key: "Escape" }, state)).toEqual({ type: "hide" });
  expect(shortcutAction({ key: "b", altKey: true, metaKey: true }, state)).toEqual({ type: "toggle" });
  expect(shortcutAction({ key: "Escape" }, { ...state, visible: false })).toBe(null);
  expect(shortcutAction({ key: "p", metaKey: true }, state)).toEqual({ type: "search" });
  expect(shortcutAction({ key: "p", ctrlKey: true }, state)).toEqual({ type: "search" });
});

test("file shortcuts close and activate tabs", () => {
  expect(shortcutAction({ key: "w", metaKey: true }, state)).toEqual({ type: "close", path: "b.ts" });
  expect(shortcutAction({ key: "1", ctrlKey: true }, state)).toEqual({ type: "activate", path: "a.ts" });
  expect(shortcutAction({ key: "9", ctrlKey: true }, state)).toEqual(null);
  expect(shortcutAction({ key: "ArrowLeft", altKey: true }, state)).toEqual({ type: "activate", path: "a.ts" });
  expect(shortcutAction({ key: "ArrowRight", altKey: true }, state)).toEqual({ type: "activate", path: "c.ts" });
});

test("preview and tree shortcuts stay scoped to the file pane", () => {
  expect(shortcutAction({ key: "e", metaKey: true, shiftKey: true }, state)).toEqual({ type: "toggleTree" });
  expect(shortcutAction({ key: "f", metaKey: true }, state)).toEqual({ type: "find" });
  expect(shortcutAction({ key: "l", ctrlKey: true }, state)).toEqual({ type: "gotoLine" });
  expect(shortcutAction({ key: "f", metaKey: true }, { ...state, visible: false })).toBe(null);
  expect(shortcutAction({ key: "l", metaKey: true }, { ...state, active: "" })).toBe(null);
  expect(shortcutAction({ key: "p", metaKey: true, shiftKey: true }, state)).toBe(null);
});

test("shortcut modifiers and inactive states are respected", () => {
  expect(shortcutAction({ key: "w" }, state)).toBe(null);
  expect(shortcutAction({ key: "b", altKey: true }, state)).toBe(null);
  expect(shortcutAction({ key: "w", metaKey: true }, { ...state, active: "" })).toBe(null);
  expect(shortcutAction({ key: "ArrowLeft", altKey: true }, { ...state, open: ["a.ts"] })).toBe(null);
});
