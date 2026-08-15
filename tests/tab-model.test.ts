import { nextOpenTabs } from "../src/client/chrome/tab-model.js";
import { expect, test } from "vitest";

test("preview tabs replace the current preview instead of stacking", () => {
  expect(nextOpenTabs([], "", "a.ts", "preview")).toEqual({ open: ["a.ts"], preview: "a.ts" });
  expect(nextOpenTabs(["a.ts"], "a.ts", "b.ts", "preview")).toEqual({ open: ["b.ts"], preview: "b.ts" });
});

test("kept tabs stay open when another file is previewed", () => {
  expect(nextOpenTabs(["a.ts"], "", "b.ts", "preview")).toEqual({ open: ["a.ts", "b.ts"], preview: "b.ts" });
  expect(nextOpenTabs(["a.ts", "b.ts"], "b.ts", "c.ts", "preview")).toEqual({ open: ["a.ts", "c.ts"], preview: "c.ts" });
});

test("opening a kept file pins a preview of the same path", () => {
  expect(nextOpenTabs(["a.ts"], "a.ts", "a.ts", "keep")).toEqual({ open: ["a.ts"], preview: "" });
  expect(nextOpenTabs(["a.ts"], "", "b.ts", "keep")).toEqual({ open: ["a.ts", "b.ts"], preview: "" });
});

test("previewing an already kept file only activates it", () => {
  expect(nextOpenTabs(["a.ts", "b.ts"], "b.ts", "a.ts", "preview")).toEqual({ open: ["a.ts", "b.ts"], preview: "b.ts" });
});
