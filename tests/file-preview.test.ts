import { reviewCountsFor, toFilePayload } from "../src/host/file-preview.js";
import { countDiffLines } from "../src/shared/line-diff.js";
import { expect, test } from "vitest";

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
  expect(payload.content).toBe("disk");
  expect(payload.source).toBe("dsh-read");
  expect(payload.before).toBe(null);
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
  expect(payload.source).toBe("dsh-write");
  expect(payload.content).toBe("export const a = 2;\n");
  expect(payload.before).toBe("export const a = 1;\n");
});

test("review counts follow the expanded disk diff", () => {
  const revision = {
    path: "src/a.ts",
    before: "const a = 1;",
    content: "const a = 2;",
    revision: 1,
    sessionId: "s",
    source: "dsh-write" as const,
  };
  const expanded = {
    ok: true as const,
    path: "src/a.ts",
    content: "export const a = 2;\n",
    size: 20,
  };
  expect(reviewCountsFor(expanded, revision)).toEqual(
    countDiffLines("export const a = 1;\n", "export const a = 2;\n"),
  );
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
  expect(payload.content).toBe("written");
  expect(payload.before).toBe("old");
  expect(payload.revision).toBe(2);
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
  expect(payload.source).toBe("workspace");
  expect(payload.content).toBe("disk");
  expect(payload.before).toBe(null);
});
