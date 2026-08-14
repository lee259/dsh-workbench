import assert from "node:assert/strict";
import test from "node:test";
import { createPathIdentity } from "../lib/host/path-identity.js";

test("a relative path under the root becomes a display path", () => {
  const paths = createPathIdentity("/repo");
  assert.deepEqual(paths.identify("./src/a.ts"), {
    ok: true,
    absolute: "/repo/src/a.ts",
    display: "src/a.ts",
  });
});

test("an absolute path under the root shares the same display path", () => {
  const paths = createPathIdentity("/repo");
  assert.equal(paths.identify("/repo/src/a.ts").display, "src/a.ts");
  assert.equal(paths.identify("src/a.ts").display, "src/a.ts");
});

test("an absolute path outside the root keeps the absolute display path", () => {
  const paths = createPathIdentity("/repo");
  assert.deepEqual(paths.identify("/other/project/a.ts"), {
    ok: true,
    absolute: "/other/project/a.ts",
    display: "/other/project/a.ts",
  });
});

test("empty and null-byte paths are rejected", () => {
  const paths = createPathIdentity("/repo");
  assert.deepEqual(paths.identify("  "), { ok: false, status: 400, error: "missing_path" });
  assert.equal(paths.identify("src/\0secret.ts").ok, false);
});
