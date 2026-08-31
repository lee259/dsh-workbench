import { WriteHistory } from "../src/host/write-history.js";
import { reviewTreePath, scopedReviewChanges } from "../src/client/review/review-scope.js";
import { completeSessionDiffs, reviewDiffCounts } from "../src/shared/review-diff.js";
import { expect, test } from "vitest";

test("review tree uses the active Git scope instead of session edits", () => {
  const session = [{ path: "session.ts", sessionId: "s1", revision: 1, summary: "Edited file", additions: 1, deletions: 0 }];
  const git = [{ path: "git.ts", before: "before", content: "after", additions: 1, deletions: 1 }];
  expect(scopedReviewChanges("uncommitted", session, git).map((change) => change.path)).toEqual(["git.ts"]);
  expect(scopedReviewChanges("uncommitted", session, []).map((change) => change.path)).toEqual([]);
  expect(scopedReviewChanges("session", session, git).map((change) => change.path)).toEqual(["session.ts"]);
});

test("review tree matches an absolute session path to its workspace file", () => {
  const files = [{ path: "src/editor.ts" }, { path: "typings.d.ts" }];
  expect(reviewTreePath("/repo/typings.d.ts", files)).toBe("typings.d.ts");
  expect(reviewTreePath("/repo/src/editor.ts", files)).toBe("src/editor.ts");
});

test("complete session diff includes the worktree and history-only files", () => {
  const worktree = [{ path: "current.ts", before: "old", content: "new", additions: 1, deletions: 1 }];
  const history = [
    { path: "current.ts", before: "old", content: "stale", additions: 1, deletions: 1 },
    { path: "committed.ts", before: "old", content: "new", additions: 1, deletions: 1 },
  ];
  expect(completeSessionDiffs(worktree, history).map((file) => file.path)).toEqual(["current.ts", "committed.ts"]);
  expect(reviewDiffCounts(completeSessionDiffs(worktree, history))).toEqual({ additions: 2, deletions: 2 });
});

test("review returns captured write changes with line counts", () => {
  const history = new WriteHistory();
  history.record({ type: "tool/code-dispatch", data: { name: "write", arguments: { file_path: "src/a.ts", content: "one\ntwo" }, callId: "w1" } }, "s1");
  history.record({ type: "tool/code-dispatch", data: { name: "edit", arguments: { file_path: "src/a.ts", old_string: "two", new_string: "three\nfour" }, callId: "e1" } }, "s1");
  expect(history.getReview("s1")).toEqual([{ path: "src/a.ts", sessionId: "s1", revision: 2, summary: "Edited file", additions: 2, deletions: 1 }]);
});

test("review can filter changes by session", () => {
  const history = new WriteHistory();
  history.record({ type: "tool/code-dispatch", data: { name: "write", arguments: { file_path: "a.ts", content: "a" }, callId: "w1" } }, "s1");
  history.record({ type: "tool/code-dispatch", data: { name: "write", arguments: { file_path: "b.ts", content: "b" }, callId: "w2" } }, "s2");
  expect(history.getReview("s2").map((change) => change.path)).toEqual(["b.ts"]);
});

test("review can hide writes from a session in another workspace", () => {
  const history = new WriteHistory();
  history.noteSessionRoot("s1", "/repo/one");
  history.noteSessionRoot("s2", "/repo/two");
  history.record({ type: "tool/code-dispatch", data: { name: "write", arguments: { file_path: "a.ts", content: "a" }, callId: "w1" } }, "s1");
  history.record({ type: "tool/code-dispatch", data: { name: "write", arguments: { file_path: "b.ts", content: "b" }, callId: "w2" } }, "s2");
  expect(history.getReview(undefined, "/repo/two").map((change) => change.path)).toEqual(["b.ts"]);
  expect(history.reviewSessions("/repo/two")).toEqual(["s2"]);
  expect(history.getReview("s1", "/repo/two")).toEqual([]);
});

test("review keeps writes whose session root is still unknown", () => {
  const history = new WriteHistory();
  history.record({ type: "tool/code-dispatch", data: { name: "write", arguments: { file_path: "a.ts", content: "a" }, callId: "w1" } }, "s1");
  expect(history.getReview(undefined, "/repo/current").map((change) => change.path)).toEqual(["a.ts"]);
});

test("review treats an empty previous file as all additions", () => {
  const history = new WriteHistory();
  history.record({ type: "tool/code-dispatch", data: { name: "write", arguments: { file_path: "a.ts", content: "" }, callId: "w1" } }, "s1");
  history.record({ type: "tool/code-dispatch", data: { name: "write", arguments: { file_path: "a.ts", content: "a\nb" }, callId: "w2" } }, "s1");
  expect(history.getReview("s1")).toEqual([{ path: "a.ts", sessionId: "s1", revision: 2, summary: "Rewrote file", additions: 2, deletions: 0 }]);
});

test("review treats the latest write as the newest session and file", () => {
  const history = new WriteHistory();
  history.record({ type: "tool/code-dispatch", data: { name: "write", arguments: { file_path: "a.ts", content: "a" }, callId: "w1" } }, "s1");
  history.record({ type: "tool/code-dispatch", data: { name: "write", arguments: { file_path: "b.ts", content: "b" }, callId: "w2" } }, "s2");
  history.record({ type: "tool/code-dispatch", data: { name: "write", arguments: { file_path: "a.ts", content: "aa" }, callId: "w3" } }, "s1");
  expect(history.reviewSessions()).toEqual(["s2", "s1"]);
  expect(history.getReview().map((change) => change.path)).toEqual(["b.ts", "a.ts"]);
  expect(history.getReview("s1").map((change) => change.path)).toEqual(["a.ts"]);
});
