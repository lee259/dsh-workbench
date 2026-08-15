import assert from "node:assert/strict";
import test from "node:test";
import { editorSpec, viewKind } from "../lib/client/preview/editor-spec.js";
import { languageForPath } from "../lib/client/preview/lang-map.js";

test("write and edit open as a diff", () => {
  assert.equal(viewKind("dsh-write"), "diff");
  assert.deepEqual(
    editorSpec({ source: "dsh-write", before: "old", path: "a.ts" }),
    { kind: "diff", original: "old", language: "typescript" },
  );
});

test("a new write still opens as a diff against empty original", () => {
  assert.deepEqual(
    editorSpec({ source: "dsh-write", before: null, path: "a.ts" }),
    { kind: "diff", original: "", language: "typescript" },
  );
});

test("reads and workspace files open as a view", () => {
  assert.equal(viewKind("dsh-read"), "view");
  assert.equal(viewKind("workspace"), "view");
  assert.deepEqual(
    editorSpec({ source: "workspace", before: "ignored", path: "a.ts" }),
    { kind: "view", original: null, language: "typescript" },
  );
});

test("languageForPath resolves common extensions", () => {
  assert.equal(languageForPath("file.ts"), "typescript");
  assert.equal(languageForPath("file.py"), "python");
  assert.equal(languageForPath("file.json"), "json");
  assert.equal(languageForPath("Dockerfile"), "dockerfile");
  assert.equal(languageForPath("file.xyz"), null);
});
