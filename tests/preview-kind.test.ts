import { expect, test } from "vitest";
import { previewKind } from "../src/client/preview/preview-kind.js";

test("classifies image and markdown files", () => {
  expect(previewKind("assets/logo.PNG")).toBe("image");
  expect(previewKind("docs/readme.md")).toBe("markdown");
  expect(previewKind("src/app.ts")).toBe("code");
});
