import assert from "node:assert/strict";
import test from "node:test";
import { clampPreviewLine } from "../lib/client/preview/preview-nav.js";

test("preview line targets stay inside the document", () => {
  assert.equal(clampPreviewLine(12, 40), 12);
  assert.equal(clampPreviewLine(0, 40), 1);
  assert.equal(clampPreviewLine(99, 12), 12);
  assert.equal(clampPreviewLine(3.8, 12), 3);
  assert.equal(clampPreviewLine(Number.NaN, 12), 1);
  assert.equal(clampPreviewLine(4, 0), 1);
});
