import { pointerLeavesTooltipTarget } from "../src/client/tooltip.js";
import { expect, test } from "vitest";

test("pointer leave cancels a tooltip before it becomes active", () => {
  const target = { contains: () => false } as Pick<Element, "contains">;

  expect(pointerLeavesTooltipTarget(target, null)).toBe(true);
});

test("moving within a tooltip target keeps its pending tooltip", () => {
  const child = {} as Node;
  const target = { contains: (node: Node | null) => node === child } as Pick<Element, "contains">;

  expect(pointerLeavesTooltipTarget(target, child)).toBe(false);
});
