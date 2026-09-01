import { reviewRefreshAction } from "../src/client/workbench/review-refresh.js";
import { expect, test } from "vitest";

test("a same-session review refresh never changes the selected tab", () => {
  expect(reviewRefreshAction(false, true)).toBeNull();
  expect(reviewRefreshAction(false, false)).toBeNull();
});

test("a new session opens its review only when it has captured edits", () => {
  expect(reviewRefreshAction(true, true)).toEqual({ openReview: true, showDiff: true, openTree: true });
  expect(reviewRefreshAction(true, false)).toEqual({ openReview: false, showDiff: false, openTree: false });
});
