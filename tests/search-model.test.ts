
import { expect, test } from "vitest";
import {
  highlightSegments,
  moveSearchFocus,
  rankSearchHits,
  recentSearchHits,
  splitSearchPath,
  treeSearchHits,
} from "../src/client/explorer/search-model.js";

const files = [
  { path: "src/client/ui.tsx", size: 10 },
  { path: "src/shared/i18n.ts", size: 8 },
  { path: "README.md", size: 4 },
  { path: "docs/ui-notes.md", size: 2 },
];

test("quick-open ranks basename matches ahead of path matches", () => {
  expect(rankSearchHits(files, "ui").map((hit) => hit.path)).toEqual([
    "src/client/ui.tsx",
    "docs/ui-notes.md",
  ]);
  expect(rankSearchHits(files, "README")[0]).toEqual({
    path: "README.md",
    name: "README.md",
    parent: "",
    size: 4,
    score: 300,
  });
  expect(rankSearchHits(files, "")).toEqual([]);
  expect(rankSearchHits(files, "   ")).toEqual([]);
});

test("empty quick-open stays on recent paths instead of dumping the workspace", () => {
  expect(recentSearchHits(["src/client/ui.tsx", "README.md", "src/client/ui.tsx"])).toEqual([
    { path: "src/client/ui.tsx", name: "ui.tsx", parent: "src/client", size: 0, score: 0 },
    { path: "README.md", name: "README.md", parent: "", size: 0, score: 0 },
  ]);
});

test("search focus stays inside the visible hit list", () => {
  expect(moveSearchFocus(3, 0, 1)).toBe(1);
  expect(moveSearchFocus(3, 2, 1)).toBe(2);
  expect(moveSearchFocus(3, 0, -1)).toBe(0);
  expect(moveSearchFocus(0, 4, 1)).toBe(0);
});

test("search rows split the basename from its parent and highlight the needle", () => {
  expect(splitSearchPath("src/client/ui.tsx")).toEqual({ name: "ui.tsx", parent: "src/client" });
  expect(highlightSegments("ui.tsx", "UI")).toEqual([
    { text: "ui", match: true },
    { text: ".tsx", match: false },
  ]);
  expect(highlightSegments("README.md", "nope")).toEqual([{ text: "README.md", match: false }]);
});

test("tree search hits locate files and directories without opening them", () => {
  const tree = {
    directories: ["src", "src/client"],
    files,
  };
  expect(treeSearchHits(tree, "client").map((hit) => hit.path)).toEqual([
    "src/client",
    "src/client/ui.tsx",
  ]);
  expect(treeSearchHits(tree, "")).toEqual([]);
});
