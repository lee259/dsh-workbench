const IMAGE_EXTENSIONS = new Set(["png", "jpg", "jpeg", "gif", "webp", "svg", "avif", "bmp", "ico"]);
const MARKDOWN_EXTENSIONS = new Set(["md", "markdown", "mdx"]);

function extension(path: string): string {
  return path.toLowerCase().split("/").pop()?.split(".").pop() ?? "";
}

export type PreviewKind = "image" | "markdown" | "code";

export function previewKind(path: string): PreviewKind {
  const ext = extension(path);
  if (IMAGE_EXTENSIONS.has(ext)) return "image";
  if (MARKDOWN_EXTENSIONS.has(ext)) return "markdown";
  return "code";
}

export function isImagePath(path: string): boolean {
  return previewKind(path) === "image";
}
