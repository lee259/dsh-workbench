import { ActivityStore } from "../src/host/activity.js";
import { expect, test } from "vitest";

test("ActivityStore pairs native tool call and result", () => {
  const store = new ActivityStore();
  store.record({
    type: "tool/call",
    data: { callId: "c1", name: "read", arguments: JSON.stringify({ file_path: "./README.md" }) },
  }, "s1");
  expect(store.getAll()[0].status).toBe("running");
  store.record({ type: "tool/result", data: { message: { callId: "c1" } } }, "s1");
  expect(store.getAll()[0].status).toBe("done");
  expect(store.getAll()[0].path).toBe("README.md");
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
  expect(store.getAll()[0].status).toBe("error");
});

test("ActivityStore records code dispatches without leaking arguments", () => {
  const store = new ActivityStore();
  store.record({
    type: "tool/code-dispatch",
    data: { name: "shell", command: "pnpm test", isError: false },
  }, "s1");
  expect(store.getAll().map(({ name, kind, summary, status }) => ({ name, kind, summary, status }))).toEqual([{
    name: "shell",
    kind: "code",
    summary: "pnpm test",
    status: "done",
  }]);
});
