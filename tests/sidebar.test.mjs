import assert from "node:assert/strict";
import test from "node:test";
import {
  DEFAULT_SIDEBAR_WIDTH,
  MAX_SIDEBAR_WIDTH,
  MIN_SIDEBAR_WIDTH,
  clampSidebarWidth,
  readSidebarWidth,
  sidebarWidthFromKey,
  sidebarWidthFromPointer,
  writeSidebarWidth,
} from "../lib/client/sidebar.js";

test("sidebar width clamps saved and interactive values", () => {
  assert.equal(clampSidebarWidth(MIN_SIDEBAR_WIDTH - 1), MIN_SIDEBAR_WIDTH);
  assert.equal(clampSidebarWidth(MAX_SIDEBAR_WIDTH + 1), MAX_SIDEBAR_WIDTH);
  assert.equal(clampSidebarWidth(DEFAULT_SIDEBAR_WIDTH), DEFAULT_SIDEBAR_WIDTH);
});

test("dragging the separator derives width from the viewport edge", () => {
  assert.equal(sidebarWidthFromPointer(900, 1440), 540);
  assert.equal(sidebarWidthFromPointer(200, 1440), MAX_SIDEBAR_WIDTH);
  assert.equal(sidebarWidthFromPointer(1400, 1440), MIN_SIDEBAR_WIDTH);
});

test("keyboard resize moves in fixed steps and ignores other keys", () => {
  assert.equal(sidebarWidthFromKey(520, "ArrowLeft"), 536);
  assert.equal(sidebarWidthFromKey(520, "ArrowRight"), 504);
  assert.equal(sidebarWidthFromKey(MIN_SIDEBAR_WIDTH, "ArrowRight"), MIN_SIDEBAR_WIDTH);
  assert.equal(sidebarWidthFromKey(MAX_SIDEBAR_WIDTH, "ArrowLeft"), MAX_SIDEBAR_WIDTH);
  assert.equal(sidebarWidthFromKey(520, "Enter"), 520);
});

test("sidebar width persists through the bounded storage seam", () => {
  const values = new Map();
  const storage = {
    getItem(key) { return values.get(key) ?? null; },
    setItem(key, value) { values.set(key, value); },
  };
  writeSidebarWidth(storage, 640);
  assert.equal(readSidebarWidth(storage), 640);
  writeSidebarWidth(storage, 1200);
  assert.equal(readSidebarWidth(storage), MAX_SIDEBAR_WIDTH);
  values.set("dsh-workbench.sidebar-width", "not-a-number");
  assert.equal(readSidebarWidth(storage), 520);
});
