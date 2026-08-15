import { marked } from "marked";
import { FILE_ASSET_API_PATH } from "../../shared/types.js";

function resolveRelativeImages(html: string, filePath: string): string {
  const slash = filePath.lastIndexOf("/");
  const basePath = filePath.slice(0, slash + 1);
  return html.replace(/(<img\b[^>]*\bsrc=")(?![a-z][a-z\d+.-]*:|\/|#|data:)([^"]+)/gi, (_, prefix: string, source: string) => {
    const path = `${basePath}${source}`;
    return `${prefix}${FILE_ASSET_API_PATH}?path=${encodeURIComponent(path)}`;
  });
}

export function renderMarkdown(source: string, filePath = ""): string {
  const html = marked.parse(source, { gfm: true, breaks: false, async: false });
  return resolveRelativeImages(html, filePath);
}
