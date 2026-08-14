import assert from "node:assert/strict";
import test from "node:test";
import { toFilePayload } from "../lib/host/file-preview.js";

const disk = { ok: true, path: "src/a.ts", content: "disk", size: 4 };

test("preview uses disk content until DSH writes the file", () => {
  const payload = toFilePayload(disk, {
    path: "src/a.ts",
    before: null,
    content: "read-cache",
    revision: 0,
    sessionId: "s",
    source: "dsh-read",
  });
  assert.equal(payload.content, "disk");
  assert.equal(payload.source, "dsh-read");
  assert.equal(payload.before, null);
});

test("an edit snippet expands against the current disk file", () => {
  const payload = toFilePayload({
    ok: true,
    path: "src/a.ts",
    content: "export const a = 2;\n",
    size: 20,
  }, {
    path: "src/a.ts",
    before: "const a = 1;",
    content: "const a = 2;",
    revision: 1,
    sessionId: "s",
    source: "dsh-write",
  });
  assert.equal(payload.source, "dsh-write");
  assert.equal(payload.content, "export const a = 2;\n");
  assert.equal(payload.before, "export const a = 1;\n");
});

test("a DSH write overlays disk content and keeps the previous baseline", () => {
  const payload = toFilePayload(disk, {
    path: "src/a.ts",
    before: "old",
    content: "written",
    revision: 2,
    sessionId: "s",
    source: "dsh-write",
  });
  assert.equal(payload.content, "written");
  assert.equal(payload.before, "old");
  assert.equal(payload.revision, 2);
});

test("a read request stays a view after the same file was written", () => {
  const payload = toFilePayload(disk, {
    path: "src/a.ts",
    before: "old",
    content: "written",
    revision: 1,
    sessionId: "s",
    source: "dsh-write",
  }, "view");
  assert.equal(payload.source, "workspace");
  assert.equal(payload.content, "disk");
  assert.equal(payload.before, null);
});
