export type ReviewRefreshAction = {
  openReview: boolean;
  showDiff: boolean;
  openTree: boolean;
};

export function reviewRefreshAction(sessionChanged: boolean, hasDiff: boolean): ReviewRefreshAction | null {
  if (!sessionChanged) return null;
  return { openReview: hasDiff, showDiff: hasDiff, openTree: hasDiff };
}
