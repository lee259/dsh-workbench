import { hasMarkdownOutline, markdownOutline } from "../src/client/preview/markdown-outline.js";
import { expect, test } from "vitest";

test("extracts readable Markdown headings with their hierarchy", () => {
  expect(markdownOutline("# Plan\n\n## [Setup](./setup.md)\n\n### `Verify` #")).toEqual([
    { level: 1, label: "Plan" },
    { level: 2, label: "Setup" },
    { level: 3, label: "Verify" },
  ]);
});

test("only shows an outline when it provides navigation value", () => {
  expect(hasMarkdownOutline(markdownOutline("# One\n## Two"))).toBe(false);
  expect(hasMarkdownOutline(markdownOutline("# One\n## Two\n### Three"))).toBe(true);
});

test("does not treat headings inside fenced code as document navigation", () => {
  expect(markdownOutline("# One\n```md\n# Example\n```\n## Two")).toEqual([
    { level: 1, label: "One" },
    { level: 2, label: "Two" },
  ]);
});
