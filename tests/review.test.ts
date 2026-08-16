import { WriteHistory } from "../src/host/write-history.js";
import { expect, test } from "vitest";

test("review returns captured write changes with line counts", () => {
  const history = new WriteHistory();
  history.record({ type: "tool/code-dispatch", data: { name: "write", arguments: { file_path: "src/a.ts", content: "one\ntwo" }, callId: "w1" } }, "s1");
  history.record({ type: "tool/code-dispatch", data: { name: "edit", arguments: { file_path: "src/a.ts", old_string: "two", new_string: "three\nfour" }, callId: "e1" } }, "s1");
  expect(history.getReview("s1")).toEqual([{ path: "src/a.ts", sessionId: "s1", revision: 2, additions: 2, deletions: 1 }]);
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
  expect(history.getReview("s1")).toEqual([{ path: "a.ts", sessionId: "s1", revision: 2, additions: 2, deletions: 0 }]);
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
