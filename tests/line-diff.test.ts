import { countDiffLines, diffLines, previewLines } from "../src/shared/line-diff.js";
import { expect, test } from "vitest";

test("preview keeps every line in order", () => {
  expect(previewLines("a\nb")).toEqual([
    { text: "a", line: 1, kind: "same" },
    { text: "b", line: 2, kind: "same" },
  ]);
});

test("diff inserts a line without shifting later matches", () => {
  const rows = diffLines("a\nc", "a\nb\nc");
  expect(rows).toEqual([
    { text: "a", line: 1, kind: "same" },
    { text: "b", line: 2, kind: "add" },
    { text: "c", line: 3, kind: "same" },
  ]);
});

test("diff deletes a line without treating the rest as replacements", () => {
  const rows = diffLines("a\nb\nc", "a\nc");
  expect(rows).toEqual([
    { text: "a", line: 1, kind: "same" },
    { text: "b", line: 2, kind: "remove" },
    { text: "c", line: 2, kind: "same" },
  ]);
});

test("countDiffLines matches the expanded add and remove rows", () => {
  expect(countDiffLines("const value = 0;", "const value = 1;")).toEqual({ additions: 1, deletions: 1 });
  expect(countDiffLines(null, "one\ntwo")).toEqual({ additions: 2, deletions: 0 });
  expect(countDiffLines("a\nb\nc", "a\nc")).toEqual({ additions: 0, deletions: 1 });
  expect(countDiffLines("", "a\nb")).toEqual({ additions: 2, deletions: 0 });
});

test("identical files produce only same rows", () => {
  const rows = diffLines("a\nb", "a\nb");
  expect(rows.every((row) => row.kind === "same")).toBe(true);
});
