import { normalizePath } from "../../shared/types.js";

export function mergeReviewFile<T extends { path: string }>(files: readonly T[], changed: T | null, path = changed?.path ?? ""): T[] {
  const normalizedPath = normalizePath(path);
  const index = files.findIndex((file) => normalizePath(file.path) === normalizedPath);
  if (!changed) return index < 0 ? [...files] : [...files.slice(0, index), ...files.slice(index + 1)];
  if (index < 0) return [...files, changed];
  return [...files.slice(0, index), changed, ...files.slice(index + 1)];
}
