import assert from "node:assert/strict";
import test from "node:test";
import { nextOpenTabs } from "../lib/client/chrome/tab-model.js";

test("preview tabs replace the current preview instead of stacking", () => {
  assert.deepEqual(nextOpenTabs([], "", "a.ts", "preview"), { open: ["a.ts"], preview: "a.ts" });
  assert.deepEqual(nextOpenTabs(["a.ts"], "a.ts", "b.ts", "preview"), { open: ["b.ts"], preview: "b.ts" });
});

test("kept tabs stay open when another file is previewed", () => {
  assert.deepEqual(nextOpenTabs(["a.ts"], "", "b.ts", "preview"), { open: ["a.ts", "b.ts"], preview: "b.ts" });
  assert.deepEqual(nextOpenTabs(["a.ts", "b.ts"], "b.ts", "c.ts", "preview"), { open: ["a.ts", "c.ts"], preview: "c.ts" });
});

test("opening a kept file pins a preview of the same path", () => {
  assert.deepEqual(nextOpenTabs(["a.ts"], "a.ts", "a.ts", "keep"), { open: ["a.ts"], preview: "" });
  assert.deepEqual(nextOpenTabs(["a.ts"], "", "b.ts", "keep"), { open: ["a.ts", "b.ts"], preview: "" });
});

test("previewing an already kept file only activates it", () => {
  assert.deepEqual(nextOpenTabs(["a.ts", "b.ts"], "b.ts", "a.ts", "preview"), { open: ["a.ts", "b.ts"], preview: "b.ts" });
});
