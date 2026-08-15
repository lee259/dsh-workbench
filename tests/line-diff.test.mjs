import assert from "node:assert/strict";
import test from "node:test";
import { diffLines, previewLines } from "../lib/client/preview/line-diff.js";

test("preview keeps every line in order", () => {
  assert.deepEqual(previewLines("a\nb"), [
    { text: "a", line: 1, kind: "same" },
    { text: "b", line: 2, kind: "same" },
  ]);
});

test("diff inserts a line without shifting later matches", () => {
  const rows = diffLines("a\nc", "a\nb\nc");
  assert.deepEqual(rows, [
    { text: "a", line: 1, kind: "same" },
    { text: "b", line: 2, kind: "add" },
    { text: "c", line: 3, kind: "same" },
  ]);
});

test("diff deletes a line without treating the rest as replacements", () => {
  const rows = diffLines("a\nb\nc", "a\nc");
  assert.deepEqual(rows, [
    { text: "a", line: 1, kind: "same" },
    { text: "b", line: 2, kind: "remove" },
    { text: "c", line: 2, kind: "same" },
  ]);
});

test("identical files produce only same rows", () => {
  const rows = diffLines("a\nb", "a\nb");
  assert.equal(rows.every((row) => row.kind === "same"), true);
});
