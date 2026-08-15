import { clampPreviewLine } from "../src/client/preview/preview-nav.js";
import { expect, test } from "vitest";

test("preview line targets stay inside the document", () => {
  expect(clampPreviewLine(12, 40)).toBe(12);
  expect(clampPreviewLine(0, 40)).toBe(1);
  expect(clampPreviewLine(99, 12)).toBe(12);
  expect(clampPreviewLine(3.8, 12)).toBe(3);
  expect(clampPreviewLine(Number.NaN, 12)).toBe(1);
  expect(clampPreviewLine(4, 0)).toBe(1);
});
