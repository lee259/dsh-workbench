import { scrollTopForDiffTarget } from "../src/client/review/diff-reveal.js";
import { expect, test } from "vitest";

test("revealing a diff file uses the scroll panel coordinate system", () => {
  expect(scrollTopForDiffTarget({ top: 80 }, { top: 420 }, 125)).toBe(465);
});
