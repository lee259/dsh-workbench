import type { FileSource } from "../../shared/types.js";

export function canSaveWorkspacePreview(source: FileSource, kind: "code" | "markdown" | "image", editing: boolean): boolean {
  return source === "workspace" && kind !== "image" && editing;
}

export function shouldRefreshPreview(dirty: boolean, confirmed: boolean): boolean {
  return !dirty || confirmed;
}
