import { createChangePump, shouldIgnoreWatchPath } from "../src/host/change-pump.js";
import { expect, test } from "vitest";

test("watch paths skip dependency and build directories", () => {
  expect(shouldIgnoreWatchPath("src/index.ts")).toBe(false);
  expect(shouldIgnoreWatchPath("node_modules/react/index.js")).toBe(true);
  expect(shouldIgnoreWatchPath(".git/HEAD")).toBe(true);
  expect(shouldIgnoreWatchPath("dist/client.js")).toBe(true);
  expect(shouldIgnoreWatchPath(null)).toBe(false);
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
  expect(timers.length).toBe(1);
  timers[0]();
  expect(seen).toEqual(["change"]);
});

test("change pump keeps the changed paths in one debounced update", () => {
  const timers = [];
  const pump = createChangePump({
    schedule(fn) { timers.push(fn); return timers.length; },
    cancel() { timers.pop(); },
  });
  const seen: string[][] = [];
  pump.subscribe((paths) => seen.push(paths));
  pump.notify("src/a.ts");
  pump.notify("src/b.ts");
  timers[0]();
  expect(seen).toEqual([["src/a.ts", "src/b.ts"]]);
});
