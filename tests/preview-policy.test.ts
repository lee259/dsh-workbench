import { isPreviewablePath, isTextPreviewPath } from "../src/shared/preview-policy.js";
import { expect, test } from "vitest";

test("preview policy allows supported source, config, and image files", () => {
  expect(isTextPreviewPath("src/main.ts")).toBe(true);
  expect(isTextPreviewPath(".env")).toBe(true);
  expect(isTextPreviewPath("Dockerfile.dev")).toBe(true);
  expect(isPreviewablePath("assets/logo.webp")).toBe(true);
});

test("preview policy rejects binary and unknown file formats", () => {
  expect(isTextPreviewPath("assets/archive.zip")).toBe(false);
  expect(isPreviewablePath("assets/video.mp4")).toBe(false);
});
