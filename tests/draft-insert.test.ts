import { spliceDraftValue } from "../src/client/explorer/draft-insert.js";
import { followWorkspaceEvents } from "../src/client/workspace-events.js";
import { expect, test } from "vitest";

test("draft text is spliced at the caret without replacing the whole value", () => {
  expect(spliceDraftValue("hello", 5, 5, " src/app.ts")).toEqual({
    value: "hello src/app.ts",
    caret: 16,
  });
  expect(spliceDraftValue("hello world", 6, 11, "src/app.ts")).toEqual({
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
  expect(log).toEqual(["change", "close"]);
});
