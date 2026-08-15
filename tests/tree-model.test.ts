
import { expect, test } from "vitest";
import {
  ancestorDirectories,
  breadcrumbTargets,
  clampTreeWidth,
  directoriesToReveal,
  foldersAreExpanded,
  consumeTreeEscape,
  flattenVisibleRows,
  mergeOpenDirectories,
  moveTreeFocus,
  nextFolderExpansion,
  readTreeVisible,
  treeFileOpenMode,
  treeKeyAction,
  visibleBreadcrumbTargets,
  writeTreeVisible,
} from "../src/client/explorer/tree-model.js";

const tree = {
  directories: ["src", "src/client"],
  files: [
    { path: "README.md", size: 1 },
    { path: "src/index.ts", size: 1 },
    { path: "src/client/ui.tsx", size: 1 },
  ],
};

test("tree and quick-open browse the workspace file, not a captured DSH diff", () => {
  expect(treeFileOpenMode()).toBe("view");
});

test("breadcrumb targets walk from root to the current file", () => {
  expect(breadcrumbTargets("src/client/ui.tsx")).toEqual([
    { label: "/", path: "", kind: "root" },
    { label: "src", path: "src", kind: "directory" },
    { label: "client", path: "src/client", kind: "directory" },
    { label: "ui.tsx", path: "src/client/ui.tsx", kind: "file" },
  ]);
  expect(breadcrumbTargets("")).toEqual([{ label: "/", path: "", kind: "root" }]);
  expect(visibleBreadcrumbTargets("src/client/ui.tsx")).toEqual([
    { label: "src", path: "src", kind: "directory" },
    { label: "client", path: "src/client", kind: "directory" },
    { label: "ui.tsx", path: "src/client/ui.tsx", kind: "file" },
  ]);
  expect(visibleBreadcrumbTargets("")).toEqual([]);
});

test("ancestor directories expand just enough to reveal a path", () => {
  expect(ancestorDirectories("src/client/ui.tsx")).toEqual(["src", "src/client"]);
  expect(directoriesToReveal("src/client")).toEqual(["src", "src/client"]);
  expect(mergeOpenDirectories(["src"], ["src", "src/client"])).toEqual(["src", "src/client"]);
});

test("folder control expands all folders, then collapses them", () => {
  expect(foldersAreExpanded([], tree.directories)).toBe(false);
  expect(nextFolderExpansion([], tree.directories)).toEqual(tree.directories);
  expect(foldersAreExpanded(tree.directories, tree.directories)).toBe(true);
  expect(nextFolderExpansion(tree.directories, tree.directories)).toEqual([]);
});

test("visible tree rows flatten open directories and keep files collapsed", () => {
  const closed = flattenVisibleRows(tree, [], "");
  expect(closed.map((row) => row.path)).toEqual(["src", "README.md"]);
  const opened = flattenVisibleRows(tree, ["src", "src/client"], "");
  expect(opened.map((row) => row.path)).toEqual(["src", "src/client", "src/client/ui.tsx", "src/index.ts", "README.md"]);
});

test("tree keyboard moves, toggles, and opens from the focused row", () => {
  const rows = flattenVisibleRows(tree, ["src"], "");
  expect(treeKeyAction("Home", rows, "src/index.ts", ["src"])).toEqual({ type: "move", path: "src" });
  expect(treeKeyAction("End", rows, "src", ["src"])).toEqual({ type: "move", path: "README.md" });
  expect(treeKeyAction("ArrowLeft", rows, "src", ["src"])).toEqual({ type: "toggle", path: "src" });
  expect(treeKeyAction("ArrowLeft", rows, "src/index.ts", ["src"])).toEqual({ type: "move", path: "src" });
  expect(treeKeyAction("ArrowRight", rows, "src", ["src"])).toEqual({ type: "move", path: "src/client" });
  expect(treeKeyAction("ArrowRight", rows, "src", [])).toEqual({ type: "toggle", path: "src" });
  expect(treeKeyAction("Enter", rows, "README.md", [])).toEqual({ type: "open", path: "README.md" });
  expect(treeKeyAction(" ", rows, "src", ["src"])).toEqual({ type: "toggle", path: "src" });
});

test("escape is consumed by the tree menu, then the tree filter", () => {
  expect(consumeTreeEscape({ menu: true, query: "ui" })).toBe("menu");
  expect(consumeTreeEscape({ menu: false, query: "ui" })).toBe("query");
  expect(consumeTreeEscape({ menu: false, query: "  " })).toBe(null);
});

test("tree focus moves within the visible row list", () => {
  const rows = flattenVisibleRows(tree, ["src"], "");
  expect(moveTreeFocus(rows, "src", 1)).toBe("src/client");
  expect(moveTreeFocus(rows, "src/client", 1)).toBe("src/index.ts");
  expect(moveTreeFocus(rows, "README.md", 1)).toBe("README.md");
  expect(moveTreeFocus(rows, "missing", -1)).toBe("README.md");
  expect(moveTreeFocus([], "src", 1)).toBe(undefined);
});

test("tree visibility persists through the bounded storage seam", () => {
  const values = new Map();
  const storage = {
    getItem(key) { return values.get(key) ?? null; },
    setItem(key, value) { values.set(key, value); },
  };
  expect(readTreeVisible(storage)).toBe(true);
  writeTreeVisible(storage, false);
  expect(readTreeVisible(storage)).toBe(false);
  expect(clampTreeWidth(200)).toBe(260);
  expect(clampTreeWidth(400)).toBe(380);
});
