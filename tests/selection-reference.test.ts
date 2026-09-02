import { buildReviewNoteReference, buildSelectionReference, SELECTION_REFERENCE_LIMIT, selectionLineRange } from "../src/client/preview/selection-reference.js";
import { expect, test } from "vitest";

const source = "first\nsecond\nthird\n";

test("selection line range uses the last selected character, not the next line", () => {
  expect(selectionLineRange(source, 0, 5)).toEqual({ start: 1, end: 1 });
  expect(selectionLineRange(source, 6, 18)).toEqual({ start: 2, end: 3 });
});

test("selection references include a path range and short code context", () => {
  expect(buildSelectionReference("src/example.ts", source, 6, 18)).toBe(
    "@src/example.ts:2-3\n```\nsecond\nthird\n```",
  );
});

test("selection references keep only the path range when context is too long", () => {
  const long = "x".repeat(SELECTION_REFERENCE_LIMIT + 1);
  expect(buildSelectionReference("src/example.ts", long, 0, long.length)).toBe("@src/example.ts:1");
});

test("selection references fence code that contains Markdown fences", () => {
  const markdown = "before\n```ts\nconst value = 1;\n```\nafter";
  const selected = "```ts\nconst value = 1;\n```";
  const from = markdown.indexOf(selected);
  expect(buildSelectionReference("README.md", markdown, from, from + selected.length)).toBe(
    "@README.md:2-4\n````\n```ts\nconst value = 1;\n```\n````",
  );
});

test("selection references ignore an empty range", () => {
  expect(buildSelectionReference("src/example.ts", source, 2, 2)).toBeNull();
});

test("review note references preserve the selected path and context", () => {
  expect(buildReviewNoteReference("src/example.ts", source, 6, 18)).toBe(
    "@src/example.ts:2-3\n```\nsecond\nthird\n```",
  );
});
