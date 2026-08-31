import type { GitFileDiff, ReviewChange, ReviewScope } from "../../shared/types.js";

export type ScopedReviewChange = Pick<ReviewChange | GitFileDiff, "path" | "additions" | "deletions">;

export function scopedReviewChanges(
  scope: ReviewScope,
  sessionChanges: ReviewChange[],
  gitChanges: GitFileDiff[],
): ScopedReviewChange[] {
  return scope === "session" ? sessionChanges : gitChanges;
}

export function reviewTreePath(path: string, files: readonly { path: string }[]): string {
  const normalized = path.replace(/^\.\//, "").replace(/\\/g, "/");
  return files.find((file) => normalized === file.path || normalized.endsWith(`/${file.path}`))?.path ?? normalized;
}
