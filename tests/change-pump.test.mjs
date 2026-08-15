import assert from "node:assert/strict";
import test from "node:test";
import { createChangePump, shouldIgnoreWatchPath } from "../lib/host/change-pump.js";

test("watch paths skip dependency and build directories", () => {
  assert.equal(shouldIgnoreWatchPath("src/index.ts"), false);
  assert.equal(shouldIgnoreWatchPath("node_modules/react/index.js"), true);
  assert.equal(shouldIgnoreWatchPath(".git/HEAD"), true);
  assert.equal(shouldIgnoreWatchPath("dist/client.js"), true);
  assert.equal(shouldIgnoreWatchPath(null), false);
});

test("change pump debounces notifies and ignores skipped paths", () => {
  const timers = [];
  const pump = createChangePump({
    delay: 20,
    schedule(fn) {
      timers.push(fn);
      return timers.length;
    },
    cancel() {
      timers.pop();
    },
  });
  const seen = [];
  pump.subscribe(() => seen.push("change"));
  pump.notify("node_modules/pkg/index.js");
  pump.notify("src/a.ts");
  pump.notify("src/b.ts");
  assert.equal(timers.length, 1);
  timers[0]();
  assert.deepEqual(seen, ["change"]);
});
