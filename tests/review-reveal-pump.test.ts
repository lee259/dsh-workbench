import { createReviewRevealPump } from "../src/client/workbench/review-reveal-pump.js";
import { expect, test } from "vitest";

test("review reveal pump coalesces a burst to the latest changed file", () => {
  const timers: Array<() => void> = [];
  const pump = createReviewRevealPump({
    delay: 20,
    schedule(fn) {
      timers.push(fn);
      return timers.length;
    },
    cancel() {
      timers.pop();
    },
  });
  const seen: string[] = [];
  pump.schedule("src/a.ts", (path) => seen.push(path));
  pump.schedule("src/b.ts", (path) => seen.push(path));
  pump.schedule("src/c.ts", (path) => seen.push(path));

  expect(timers).toHaveLength(1);
  timers[0]();
  expect(seen).toEqual(["src/c.ts"]);
});
