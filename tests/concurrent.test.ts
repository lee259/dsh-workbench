import { mapConcurrent } from "../src/host/concurrent.js";
import { expect, test } from "vitest";

test("mapConcurrent caps in-flight work while retaining input order", async () => {
  let active = 0;
  let peak = 0;
  const values = await mapConcurrent([3, 1, 2, 0], 2, async (value) => {
    active += 1;
    peak = Math.max(peak, active);
    await new Promise((resolve) => setTimeout(resolve, value));
    active -= 1;
    return value;
  });
  expect(values).toEqual([3, 1, 2, 0]);
  expect(peak).toBe(2);
});
