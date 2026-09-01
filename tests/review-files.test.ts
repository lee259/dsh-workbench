import { mergeReviewFile } from "../src/client/review/review-files.js";
import { expect, test } from "vitest";

const first = { path: "a.ts", before: "old", content: "new", additions: 1, deletions: 1 };
const second = { path: "b.ts", before: "", content: "next", additions: 1, deletions: 0 };

test("a review delta replaces only its changed file", () => {
  const files = [first, second];
  const updated = { ...second, content: "latest", additions: 2 };

  const next = mergeReviewFile(files, updated);

  expect(next).not.toBe(files);
  expect(next[0]).toBe(first);
  expect(next[1]).toBe(updated);
});

test("a review delta removes a file that no longer has a diff", () => {
  expect(mergeReviewFile([first, second], null, "a.ts")).toEqual([second]);
});
