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

export function completeSessionDiffs(
  worktreeDiffs: GitFileDiff[],
  sessionDiffs: GitFileDiff[],
): GitFileDiff[] {
  const paths = worktreeDiffs.map((file) => file.path.replace(/^\.\//, "").replace(/\\/g, "/"));
  return [...worktreeDiffs, ...sessionDiffs.filter((file) => {
    const path = file.path.replace(/^\.\//, "").replace(/\\/g, "/");
    return !paths.some((worktreePath) => path === worktreePath || path.endsWith(`/${worktreePath}`));
  })];
}
