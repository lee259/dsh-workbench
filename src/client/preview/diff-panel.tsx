import { forwardRef, useEffect, useImperativeHandle, useState } from "react";
import type { GitFileDiff } from "../../shared/types.js";
import { fetchReview } from "../review/review-data.js";
import { fetchWorkspaceFile } from "../store.js";
import { useWorkbenchServices } from "../workbench/runtime.js";
import { GitDiffPanel, type ReviewScope } from "../review/git-diff-panel.js";

export type DiffPanelCommands = {
  reveal(path: string): void;
};

export const DiffPanel = forwardRef<DiffPanelCommands, { sessionId?: string; revealPath?: string; revision?: number; scope?: ReviewScope; onCountsChange?(counts: { additions: number; deletions: number }): void }>(function DiffPanel({ sessionId, revealPath: requestedRevealPath, revision, scope = "session", onCountsChange }, ref) {
  const { i18n } = useWorkbenchServices();
  const t = i18n.t;
  const [historyFiles, setHistoryFiles] = useState<GitFileDiff[]>([]);
  const [loading, setLoading] = useState(true);

  useImperativeHandle(ref, () => ({
    reveal(path: string) {
      window.dispatchEvent(new CustomEvent("dsh-wb-diff-reveal", { detail: path }));
    },
  }), []);

  useEffect(() => {
    if (requestedRevealPath) window.dispatchEvent(new CustomEvent("dsh-wb-diff-reveal", { detail: requestedRevealPath }));
  }, [requestedRevealPath]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    void fetchReview(sessionId)
      .then(async (response) => {
        const next = await Promise.all((response.changes ?? []).map(async (change) => {
          const payload = await fetchWorkspaceFile(change.path, "diff").catch(() => null);
          return payload ? { path: change.path, before: payload.before, content: payload.content, additions: change.additions, deletions: change.deletions } : null;
        }));
        if (!cancelled) setHistoryFiles(next.filter((file): file is GitFileDiff => file !== null));
      })
      .catch(() => { if (!cancelled) setHistoryFiles([]); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [revision, sessionId]);

  if (scope !== "session") return <GitDiffPanel scope={scope} revision={revision ?? 0} onCountsChange={onCountsChange} />;
  if (loading) return <div className="dsh-wb-empty"><strong>{t("reading")}</strong></div>;
  return <GitDiffPanel scope="uncommitted" revision={revision ?? 0} historyFiles={historyFiles} onCountsChange={onCountsChange} />;
});
