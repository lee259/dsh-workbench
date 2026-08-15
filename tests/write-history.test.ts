import { createPathIdentity } from "../src/host/path-identity.js";
import { WriteHistory } from "../src/host/write-history.js";
import { expect, test } from "vitest";

test("consecutive write outputs become the next diff baseline", () => {
  const history = new WriteHistory();
  history.record({
    type: "tool/code-dispatch",
    data: { name: "write", subCallId: "call-1", arguments: { file_path: "./src/a.ts", content: "const a = 1;" } },
  }, "session-1");
  const revision = history.record({
    type: "tool/code-dispatch",
    data: { name: "write", subCallId: "call-2", arguments: { file_path: "./src/a.ts", content: "const a = 2;" } },
  }, "session-1");
  expect(revision?.before).toBe("const a = 1;");
  expect(revision?.content).toBe("const a = 2;");
  expect(revision?.source).toBe("dsh-write");
});

test("start and completion events do not duplicate one write", () => {
  const history = new WriteHistory();
  const event = { name: "write", subCallId: "call-1", arguments: { file_path: "x.ts", content: "one" } };
  history.record({ type: "tool/code-dispatch", data: event }, "session-1");
  history.record({ type: "tool/code-dispatch", data: event }, "session-1");
  expect(history.get("x.ts")?.revision).toBe(1);
});

test("a read result becomes the baseline for the next write", () => {
  const history = new WriteHistory();
  history.record({
    type: "tool/code-dispatch",
    data: {
      name: "read",
      subCallId: "read-1",
      arguments: { file_path: "./x.ts" },
      content: [{ type: "text", text: "<content>\n1: const x = 1;\n2: \n(End of file - total 2 lines)\n</content>" }],
    },
  }, "session-1");
  const revision = history.record({
    type: "tool/code-dispatch",
    data: { name: "write", subCallId: "write-1", arguments: { file_path: "./x.ts", content: "const x = 2;\n" } },
  }, "session-1");
  expect(revision?.before).toBe("const x = 1;\n");
  expect(revision?.source).toBe("dsh-write");
});

test("native tool/call arguments are a JSON string and pair with tool/result", () => {
  const history = new WriteHistory();
  history.record({
    type: "tool/call",
    data: { callId: "c1", name: "write", arguments: JSON.stringify({ file_path: "a.ts", content: "one" }) },
  }, "session-1");
  const revision = history.record({
    type: "tool/result",
    data: { message: { callId: "c1" } },
  }, "session-1");
  expect(revision?.content).toBe("one");
  expect(revision?.source).toBe("dsh-write");
});

test("real DSH tool/result pairs via message.content[0].toolCallId", () => {
  const history = new WriteHistory();
  history.record({
    type: "tool/call",
    data: { callId: "c1", name: "edit", arguments: JSON.stringify({ file_path: "a.ts", old_string: "one", new_string: "two" }) },
  }, "session-1");
  const revision = history.record({
    type: "tool/result",
    data: {
      message: {
        role: "user",
        content: [{
          type: "tool-result",
          toolCallId: "c1",
          content: [{ type: "text", text: "ok" }],
        }],
      },
    },
  }, "session-1");
  expect(revision?.source).toBe("dsh-write");
  expect(revision?.before).toBe("one");
  expect(revision?.content).toBe("two");
});

test("real DSH read output is read from the nested result block", () => {
  const history = new WriteHistory();
  history.record({
    type: "tool/call",
    data: { callId: "r1", name: "read", arguments: JSON.stringify({ file_path: "a.ts" }) },
  }, "session-1");
  const revision = history.record({
    type: "tool/result",
    data: {
      message: {
        role: "user",
        content: [{
          type: "tool-result",
          toolCallId: "r1",
          content: [{ type: "text", text: "<content>\n1: const x = 1;\n2: \n(End of file - total 2 lines)\n</content>" }],
        }],
      },
    },
  }, "session-1");
  expect(revision?.source).toBe("dsh-read");
  expect(revision?.content).toBe("const x = 1;\n");
});

test("tool/result meta.diffs from dsh-tool-fs win over reconstructed edits", () => {
  const history = new WriteHistory();
  const revision = history.record({
    type: "tool/result",
    data: {
      message: { callId: "c1" },
      meta: { diffs: [{ path: "./src/a.ts", oldText: "old", newText: "new" }] },
    },
  }, "session-1");
  expect(revision?.path).toBe("src/a.ts");
  expect(revision?.before).toBe("old");
  expect(revision?.content).toBe("new");
});

test("a native edit without a prior read still records a dsh-write", () => {
  const history = new WriteHistory();
  history.record({
    type: "tool/call",
    data: {
      callId: "e1",
      name: "edit",
      arguments: JSON.stringify({
        file_path: "a.ts",
        old_string: "const a = 1;",
        new_string: "const a = 2;",
      }),
    },
  }, "s");
  const revision = history.record({
    type: "tool/result",
    data: { message: { callId: "e1" } },
  }, "s");
  expect(revision?.source).toBe("dsh-write");
  expect(revision?.before).toBe("const a = 1;");
  expect(revision?.content).toBe("const a = 2;");
});

test("absolute and workspace-relative paths share one revision", () => {
  const paths = createPathIdentity("/repo");
  const history = new WriteHistory((path) => {
    const located = paths.identify(path);
    return located.ok ? located.display : path;
  });
  history.record({
    type: "tool/call",
    data: {
      callId: "e1",
      name: "edit",
      arguments: JSON.stringify({
        file_path: "/repo/src/a.ts",
        old_string: "old",
        new_string: "new",
      }),
    },
  }, "s");
  history.record({
    type: "tool/result",
    data: { message: { callId: "e1" } },
  }, "s");
  expect(history.get("src/a.ts")?.source).toBe("dsh-write");
  expect(history.get("/repo/src/a.ts")?.source).toBe("dsh-write");
});

test("edit honors replace_all", () => {
  const history = new WriteHistory();
  history.record({
    type: "tool/code-dispatch",
    data: { name: "write", subCallId: "w1", arguments: { file_path: "a.ts", content: "foo foo" } },
  }, "s");
  const revision = history.record({
    type: "tool/code-dispatch",
    data: {
      name: "edit",
      subCallId: "e1",
      arguments: { file_path: "a.ts", old_string: "foo", new_string: "bar", replace_all: true },
    },
  }, "s");
  expect(revision?.content).toBe("bar bar");
});

test("replay rebuilds revisions from a session log", () => {
  const history = new WriteHistory();
  history.replay([
    {
      type: "tool/call",
      data: { callId: "c1", name: "write", arguments: JSON.stringify({ file_path: "a.ts", content: "one" }) },
    },
    { type: "tool/result", data: { message: { callId: "c1" } } },
    {
      type: "tool/call",
      data: { callId: "e1", name: "edit", arguments: JSON.stringify({ file_path: "a.ts", old_string: "one", new_string: "two" }) },
    },
    { type: "tool/result", data: { message: { callId: "e1" } } },
  ], "s");
  expect(history.get("a.ts")?.source).toBe("dsh-write");
  expect(history.get("a.ts")?.before).toBe("one");
  expect(history.get("a.ts")?.content).toBe("two");
});

test("replay is idempotent with later live events", () => {
  const events = [
    {
      type: "tool/call",
      data: { callId: "c1", name: "write", arguments: JSON.stringify({ file_path: "a.ts", content: "one" }) },
    },
    { type: "tool/result", data: { message: { callId: "c1" } } },
  ];
  const history = new WriteHistory();
  history.replay(events, "s");
  history.replay(events, "s");
  history.record(events[0], "s");
  history.record(events[1], "s");
  expect(history.get("a.ts")?.revision).toBe(1);
  expect(history.get("a.ts")?.content).toBe("one");
});

test("failed tool results are ignored", () => {
  const history = new WriteHistory();
  expect(history.record({
    type: "tool/code-dispatch",
    data: { name: "write", isError: true, subCallId: "w1", arguments: { file_path: "a.ts", content: "x" } },
  }, "s")).toBe(null);
  expect(history.record({
    type: "tool/result",
    data: { error: { name: "ToolError", code: "FAILED" }, message: { callId: "c1" } },
  }, "s")).toBe(null);
});
