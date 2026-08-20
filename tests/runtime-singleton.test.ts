import { expect, test } from "vitest";
import { runtimeSingleton } from "../src/client/runtime-singleton.js";

test("reuses one runtime across repeated plugin activation", () => {
  let creates = 0;
  const getRuntime = runtimeSingleton(() => ({ id: ++creates }));

  expect(getRuntime()).toEqual({ id: 1 });
  expect(getRuntime()).toEqual({ id: 1 });
  expect(creates).toBe(1);
});
