import assert from "node:assert/strict";
import test from "node:test";
import { ActivityStore } from "../lib/host/activity.js";

test("ActivityStore pairs native tool call and result", () => {
  const store = new ActivityStore();
  store.record({
    type: "tool/call",
    data: { callId: "c1", name: "read", arguments: JSON.stringify({ file_path: "./README.md" }) },
  }, "s1");
  assert.equal(store.getAll()[0].status, "running");
  store.record({ type: "tool/result", data: { message: { callId: "c1" } } }, "s1");
  assert.equal(store.getAll()[0].status, "done");
  assert.equal(store.getAll()[0].path, "README.md");
});

test("ActivityStore pairs real DSH result blocks and records failures", () => {
  const store = new ActivityStore();
  store.record({
    type: "tool/call",
    data: { callId: "c1", name: "edit", arguments: { file_path: "a.ts" } },
  }, "s1");
  store.record({
    type: "tool/result",
    data: {
      message: { content: [{ type: "tool-result", toolCallId: "c1", isError: true, content: [] }] },
    },
  }, "s1");
  assert.equal(store.getAll()[0].status, "error");
});

test("ActivityStore records code dispatches without leaking arguments", () => {
  const store = new ActivityStore();
  store.record({
    type: "tool/code-dispatch",
    data: { name: "shell", command: "pnpm test", isError: false },
  }, "s1");
  assert.deepEqual(store.getAll().map(({ name, kind, summary, status }) => ({ name, kind, summary, status })), [{
    name: "shell",
    kind: "code",
    summary: "pnpm test",
    status: "done",
  }]);
});
