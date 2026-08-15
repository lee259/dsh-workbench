
import { expect, test } from "vitest";
import {
  DEFAULT_SIDEBAR_WIDTH,
  MAX_SIDEBAR_WIDTH,
  MIN_SIDEBAR_WIDTH,
  clampSidebarWidth,
  readSidebarWidth,
  sidebarWidthFromKey,
  sidebarWidthFromPointer,
  writeSidebarWidth,
} from "../src/client/chrome/sidebar.js";

test("sidebar width clamps saved and interactive values", () => {
  expect(clampSidebarWidth(MIN_SIDEBAR_WIDTH - 1)).toBe(MIN_SIDEBAR_WIDTH);
  expect(clampSidebarWidth(MAX_SIDEBAR_WIDTH + 1)).toBe(MAX_SIDEBAR_WIDTH);
  expect(clampSidebarWidth(DEFAULT_SIDEBAR_WIDTH)).toBe(DEFAULT_SIDEBAR_WIDTH);
});

test("dragging the separator derives width from the viewport edge", () => {
  expect(sidebarWidthFromPointer(900, 1440)).toBe(540);
  expect(sidebarWidthFromPointer(200, 1440)).toBe(MAX_SIDEBAR_WIDTH);
  expect(sidebarWidthFromPointer(1400, 1440)).toBe(MIN_SIDEBAR_WIDTH);
});

test("keyboard resize moves in fixed steps and ignores other keys", () => {
  expect(sidebarWidthFromKey(600, "ArrowLeft")).toBe(616);
  expect(sidebarWidthFromKey(600, "ArrowRight")).toBe(584);
  expect(sidebarWidthFromKey(MIN_SIDEBAR_WIDTH, "ArrowRight")).toBe(MIN_SIDEBAR_WIDTH);
  expect(sidebarWidthFromKey(MAX_SIDEBAR_WIDTH, "ArrowLeft")).toBe(MAX_SIDEBAR_WIDTH);
  expect(sidebarWidthFromKey(600, "Enter")).toBe(600);
});

test("sidebar width persists through the bounded storage seam", () => {
  const values = new Map();
  const storage = {
    getItem(key) { return values.get(key) ?? null; },
    setItem(key, value) { values.set(key, value); },
  };
  writeSidebarWidth(storage, 640);
  expect(readSidebarWidth(storage)).toBe(640);
  writeSidebarWidth(storage, 1200);
  expect(readSidebarWidth(storage)).toBe(MAX_SIDEBAR_WIDTH);
  values.set("dsh-workbench.sidebar-width", "not-a-number");
  expect(readSidebarWidth(storage)).toBe(600);
});
