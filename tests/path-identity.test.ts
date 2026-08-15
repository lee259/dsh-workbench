import { createPathIdentity } from "../src/host/path-identity.js";
import { expect, test } from "vitest";

test("a relative path under the root becomes a display path", () => {
  const paths = createPathIdentity("/repo");
  expect(paths.identify("./src/a.ts")).toEqual({
    ok: true,
    absolute: "/repo/src/a.ts",
    display: "src/a.ts",
  });
});

test("an absolute path under the root shares the same display path", () => {
  const paths = createPathIdentity("/repo");
  expect(paths.identify("/repo/src/a.ts").display).toBe("src/a.ts");
  expect(paths.identify("src/a.ts").display).toBe("src/a.ts");
});

test("an absolute path outside the root keeps the absolute display path", () => {
  const paths = createPathIdentity("/repo");
  expect(paths.identify("/other/project/a.ts")).toEqual({
    ok: true,
    absolute: "/other/project/a.ts",
    display: "/other/project/a.ts",
  });
});

test("empty and null-byte paths are rejected", () => {
  const paths = createPathIdentity("/repo");
  expect(paths.identify("  ")).toEqual({ ok: false, status: 400, error: "missing_path" });
  expect(paths.identify("src/\0secret.ts").ok).toBe(false);
});
