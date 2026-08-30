import { nextOpenTabs } from "../src/client/chrome/tab-model.js";
import { activateEmptyFileTab, addEmptyFileTab, bindEmptyFileTab, closeEmptyFileTab, emptyFileTabs } from "../src/client/workbench/tab-model.js";
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

test("empty file tabs keep their identity and selection independent", () => {
  const first = addEmptyFileTab(emptyFileTabs(), "empty-file-1");
  const second = addEmptyFileTab(first, "empty-file-2");
  const boundFirst = bindEmptyFileTab(activateEmptyFileTab(second, "empty-file-1"), "src/first.ts");
  const selectedFirst = activateEmptyFileTab(boundFirst, "empty-file-1");

  expect(selectedFirst).toEqual({
    ids: ["empty-file-1", "empty-file-2"],
    paths: { "empty-file-1": "src/first.ts", "empty-file-2": "" },
    activeId: "empty-file-1",
  });
});

test("closing an empty file tab removes only that tab and its binding", () => {
  const state = bindEmptyFileTab(
    addEmptyFileTab(addEmptyFileTab(emptyFileTabs(), "empty-file-1"), "empty-file-2"),
    "src/second.ts",
  );

  expect(closeEmptyFileTab(state, "empty-file-1")).toEqual({
    ids: ["empty-file-2"],
    paths: { "empty-file-2": "src/second.ts" },
    activeId: "empty-file-2",
  });
});

test("closing the active file tab selects the previous tab first", () => {
  const state = addEmptyFileTab(addEmptyFileTab(addEmptyFileTab(emptyFileTabs(), "first"), "second"), "third");
  expect(closeEmptyFileTab(state, "third").activeId).toBe("second");
  expect(closeEmptyFileTab(activateEmptyFileTab(state, "second"), "second").activeId).toBe("first");
});
