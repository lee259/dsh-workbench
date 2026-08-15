import { expect, test } from "vitest";
import { renderMarkdown } from "../src/client/preview/markdown-preview.js";

test("renders common markdown blocks and resolves relative images", () => {
  const html = renderMarkdown("# Title\n\n- **one**\n- `two`\n\n![logo](../assets/logo.png)", "docs/readme.md");
  expect(html).toContain("<h1>Title</h1>");
  expect(html).toContain("<strong>one</strong>");
  expect(html).toContain("<code>two</code>");
  expect(html).toContain('src="/api/dsh-workbench/asset?path=docs%2F..%2Fassets%2Flogo.png"');
});

test("delegates CommonMark/GFM parsing to the renderer", () => {
  const html = renderMarkdown("<script>alert(1)</script>\n\n[x](javascript:alert(1))");
  expect(html).toContain("<script>alert(1)</script>");
  expect(html).toContain("href=\"javascript:alert(1)\"");
});
