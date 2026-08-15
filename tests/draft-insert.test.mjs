import assert from "node:assert/strict";
import test from "node:test";
import { spliceDraftValue } from "../lib/client/explorer/draft-insert.js";
import { followWorkspaceEvents } from "../lib/client/workspace-events.js";

test("draft text is spliced at the caret without replacing the whole value", () => {
  assert.deepEqual(spliceDraftValue("hello", 5, 5, " src/app.ts"), {
    value: "hello src/app.ts",
    caret: 16,
  });
  assert.deepEqual(spliceDraftValue("hello world", 6, 11, "src/app.ts"), {
    value: "hello src/app.ts",
    caret: 16,
  });
});

test("workspace events subscribe to change and close the source", () => {
  const listeners = new Map();
  const log = [];
  const stop = followWorkspaceEvents(() => log.push("change"), () => ({
    addEventListener(type, listener) {
      listeners.set(type, listener);
    },
    close() {
      log.push("close");
    },
  }));
  listeners.get("change")();
  stop();
  assert.deepEqual(log, ["change", "close"]);
});
