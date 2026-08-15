import assert from "node:assert/strict";
import test from "node:test";
import {
  ancestorDirectories,
  breadcrumbTargets,
  clampTreeWidth,
  directoriesToReveal,
  consumeTreeEscape,
  flattenVisibleRows,
  mergeOpenDirectories,
  moveTreeFocus,
  readTreeVisible,
  treeFileOpenMode,
  treeKeyAction,
  visibleBreadcrumbTargets,
  writeTreeVisible,
} from "../lib/client/explorer/tree-model.js";

const tree = {
  directories: ["src", "src/client"],
  files: [
    { path: "README.md", size: 1 },
    { path: "src/index.ts", size: 1 },
    { path: "src/client/ui.tsx", size: 1 },
  ],
};

test("tree and quick-open browse the workspace file, not a captured DSH diff", () => {
  assert.equal(treeFileOpenMode(), "view");
});

test("breadcrumb targets walk from root to the current file", () => {
  assert.deepEqual(breadcrumbTargets("src/client/ui.tsx"), [
    { label: "/", path: "", kind: "root" },
    { label: "src", path: "src", kind: "directory" },
    { label: "client", path: "src/client", kind: "directory" },
    { label: "ui.tsx", path: "src/client/ui.tsx", kind: "file" },
  ]);
  assert.deepEqual(breadcrumbTargets(""), [{ label: "/", path: "", kind: "root" }]);
  assert.deepEqual(visibleBreadcrumbTargets("src/client/ui.tsx"), [
    { label: "src", path: "src", kind: "directory" },
    { label: "client", path: "src/client", kind: "directory" },
    { label: "ui.tsx", path: "src/client/ui.tsx", kind: "file" },
  ]);
  assert.deepEqual(visibleBreadcrumbTargets(""), []);
});

test("ancestor directories expand just enough to reveal a path", () => {
  assert.deepEqual(ancestorDirectories("src/client/ui.tsx"), ["src", "src/client"]);
  assert.deepEqual(directoriesToReveal("src/client"), ["src", "src/client"]);
  assert.deepEqual(mergeOpenDirectories(["src"], ["src", "src/client"]), ["src", "src/client"]);
});

test("visible tree rows flatten open directories and keep files collapsed", () => {
  const closed = flattenVisibleRows(tree, [], "");
  assert.deepEqual(closed.map((row) => row.path), ["src", "README.md"]);
  const opened = flattenVisibleRows(tree, ["src", "src/client"], "");
  assert.deepEqual(opened.map((row) => row.path), ["src", "src/client", "src/client/ui.tsx", "src/index.ts", "README.md"]);
});

test("tree keyboard moves, toggles, and opens from the focused row", () => {
  const rows = flattenVisibleRows(tree, ["src"], "");
  assert.deepEqual(treeKeyAction("Home", rows, "src/index.ts", ["src"]), { type: "move", path: "src" });
  assert.deepEqual(treeKeyAction("End", rows, "src", ["src"]), { type: "move", path: "README.md" });
  assert.deepEqual(treeKeyAction("ArrowLeft", rows, "src", ["src"]), { type: "toggle", path: "src" });
  assert.deepEqual(treeKeyAction("ArrowLeft", rows, "src/index.ts", ["src"]), { type: "move", path: "src" });
  assert.deepEqual(treeKeyAction("ArrowRight", rows, "src", ["src"]), { type: "move", path: "src/client" });
  assert.deepEqual(treeKeyAction("ArrowRight", rows, "src", []), { type: "toggle", path: "src" });
  assert.deepEqual(treeKeyAction("Enter", rows, "README.md", []), { type: "open", path: "README.md" });
  assert.deepEqual(treeKeyAction(" ", rows, "src", ["src"]), { type: "toggle", path: "src" });
});

test("escape is consumed by the tree menu, then the tree filter", () => {
  assert.equal(consumeTreeEscape({ menu: true, query: "ui" }), "menu");
  assert.equal(consumeTreeEscape({ menu: false, query: "ui" }), "query");
  assert.equal(consumeTreeEscape({ menu: false, query: "  " }), null);
});

test("tree focus moves within the visible row list", () => {
  const rows = flattenVisibleRows(tree, ["src"], "");
  assert.equal(moveTreeFocus(rows, "src", 1), "src/client");
  assert.equal(moveTreeFocus(rows, "src/client", 1), "src/index.ts");
  assert.equal(moveTreeFocus(rows, "README.md", 1), "README.md");
  assert.equal(moveTreeFocus(rows, "missing", -1), "README.md");
  assert.equal(moveTreeFocus([], "src", 1), undefined);
});

test("tree visibility persists through the bounded storage seam", () => {
  const values = new Map();
  const storage = {
    getItem(key) { return values.get(key) ?? null; },
    setItem(key, value) { values.set(key, value); },
  };
  assert.equal(readTreeVisible(storage), true);
  writeTreeVisible(storage, false);
  assert.equal(readTreeVisible(storage), false);
  assert.equal(clampTreeWidth(200), 260);
  assert.equal(clampTreeWidth(400), 380);
});
