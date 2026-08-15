import assert from "node:assert/strict";
import test from "node:test";
import {
  highlightSegments,
  moveSearchFocus,
  rankSearchHits,
  recentSearchHits,
  splitSearchPath,
  treeSearchHits,
} from "../lib/client/explorer/search-model.js";

const files = [
  { path: "src/client/ui.tsx", size: 10 },
  { path: "src/shared/i18n.ts", size: 8 },
  { path: "README.md", size: 4 },
  { path: "docs/ui-notes.md", size: 2 },
];

test("quick-open ranks basename matches ahead of path matches", () => {
  assert.deepEqual(rankSearchHits(files, "ui").map((hit) => hit.path), [
    "src/client/ui.tsx",
    "docs/ui-notes.md",
  ]);
  assert.deepEqual(rankSearchHits(files, "README")[0], {
    path: "README.md",
    name: "README.md",
    parent: "",
    size: 4,
    score: 300,
  });
  assert.deepEqual(rankSearchHits(files, ""), []);
  assert.deepEqual(rankSearchHits(files, "   "), []);
});

test("empty quick-open stays on recent paths instead of dumping the workspace", () => {
  assert.deepEqual(recentSearchHits(["src/client/ui.tsx", "README.md", "src/client/ui.tsx"]), [
    { path: "src/client/ui.tsx", name: "ui.tsx", parent: "src/client", size: 0, score: 0 },
    { path: "README.md", name: "README.md", parent: "", size: 0, score: 0 },
  ]);
});

test("search focus stays inside the visible hit list", () => {
  assert.equal(moveSearchFocus(3, 0, 1), 1);
  assert.equal(moveSearchFocus(3, 2, 1), 2);
  assert.equal(moveSearchFocus(3, 0, -1), 0);
  assert.equal(moveSearchFocus(0, 4, 1), 0);
});

test("search rows split the basename from its parent and highlight the needle", () => {
  assert.deepEqual(splitSearchPath("src/client/ui.tsx"), { name: "ui.tsx", parent: "src/client" });
  assert.deepEqual(highlightSegments("ui.tsx", "UI"), [
    { text: "ui", match: true },
    { text: ".tsx", match: false },
  ]);
  assert.deepEqual(highlightSegments("README.md", "nope"), [{ text: "README.md", match: false }]);
});

test("tree search hits locate files and directories without opening them", () => {
  const tree = {
    directories: ["src", "src/client"],
    files,
  };
  assert.deepEqual(treeSearchHits(tree, "client").map((hit) => hit.path), [
    "src/client",
    "src/client/ui.tsx",
  ]);
  assert.deepEqual(treeSearchHits(tree, ""), []);
});
