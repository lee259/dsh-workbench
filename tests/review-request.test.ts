import { reviewRequest } from "../src/client/workbench/review-request.js";
import { expect, test } from "vitest";

test("automatic writes update review data without taking over the active tab", () => {
  expect(reviewRequest({ path: "src/a.ts", focus: false })).toEqual({ path: "src/a.ts", focus: false });
});

test("a user file click remains a focused review request", () => {
  expect(reviewRequest("src/a.ts")).toEqual({ path: "src/a.ts", focus: true });
});
