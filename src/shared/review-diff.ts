import { normalizePath, type GitFileDiff } from "./types.js";

export function completeSessionDiffs(
  worktreeDiffs: GitFileDiff[],
  sessionDiffs: GitFileDiff[],
): GitFileDiff[] {
  const paths = new Set(worktreeDiffs.map((file) => normalizePath(file.path)));
  return [...worktreeDiffs, ...sessionDiffs.filter((file) => !paths.has(normalizePath(file.path)))];
}

export function reviewDiffCounts(files: readonly Pick<GitFileDiff, "additions" | "deletions">[]) {
  return files.reduce((counts, file) => ({
    additions: counts.additions + file.additions,
    deletions: counts.deletions + file.deletions,
  }), { additions: 0, deletions: 0 });
}
