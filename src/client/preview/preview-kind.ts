import { isImagePreviewPath, isMarkdownPreviewPath } from "../../shared/preview-policy.js";

export type PreviewKind = "image" | "markdown" | "code";

export function previewKind(path: string): PreviewKind {
  if (isImagePreviewPath(path)) return "image";
  if (isMarkdownPreviewPath(path)) return "markdown";
  return "code";
}

export function isImagePath(path: string): boolean {
  return previewKind(path) === "image";
}
