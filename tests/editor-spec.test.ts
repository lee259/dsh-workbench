import { editorSpec, viewKind } from "../src/client/preview/editor-spec.js";
import { languageForPath } from "../src/client/preview/lang-map.js";
import { expect, test } from "vitest";

test("write and edit open as a diff", () => {
  expect(viewKind("dsh-write")).toBe("diff");
  expect(
    editorSpec({ source: "dsh-write", before: "old", path: "a.ts" }),
  ).toEqual(
    { kind: "diff", original: "old", language: "typescript" },
  );
});

test("a new write still opens as a diff against empty original", () => {
  expect(
    editorSpec({ source: "dsh-write", before: null, path: "a.ts" }),
  ).toEqual(
    { kind: "diff", original: "", language: "typescript" },
  );
});

test("reads and workspace files open as a view", () => {
  expect(viewKind("dsh-read")).toBe("view");
  expect(viewKind("workspace")).toBe("view");
  expect(
    editorSpec({ source: "workspace", before: "ignored", path: "a.ts" }),
  ).toEqual(
    { kind: "view", original: null, language: "typescript" },
  );
});

test("languageForPath resolves common extensions", () => {
  expect(languageForPath("file.ts")).toBe("typescript");
  expect(languageForPath("file.py")).toBe("python");
  expect(languageForPath("file.json")).toBe("json");
  expect(languageForPath("Dockerfile")).toBe("dockerfile");
  expect(languageForPath("file.xyz")).toBe(null);
});
