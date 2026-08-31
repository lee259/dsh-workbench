import { forwardRef, useEffect, useImperativeHandle, useState } from "react";
import { fetchReview } from "../review/review-data.js";
import { useWorkbenchServices } from "../workbench/runtime.js";
import { GitDiffPanel, type ReviewScope } from "../review/git-diff-panel.js";

export type DiffPanelCommands = {
  reveal(path: string): void;
};

export const DiffPanel = forwardRef<DiffPanelCommands, { sessionId?: string; revealPath?: string; revision?: number; scope?: ReviewScope; onCountsChange?(counts: { additions: number; deletions: number }): void }>(function DiffPanel({ sessionId, revealPath: requestedRevealPath, revision, scope = "session", onCountsChange }, ref) {
  const { i18n } = useWorkbenchServices();
  const t = i18n.t;
  const [files, setFiles] = useState<import("../../shared/types.js").GitFileDiff[]>([]);
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
      .then((response) => { if (!cancelled) setFiles(response.files ?? []); })
      .catch(() => { if (!cancelled) setFiles([]); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [revision, sessionId]);

  if (scope !== "session") return <GitDiffPanel scope={scope} revision={revision ?? 0} onCountsChange={onCountsChange} />;
  if (loading) return <div className="dsh-wb-empty"><strong>{t("reading")}</strong></div>;
  return <GitDiffPanel scope="uncommitted" revision={revision ?? 0} files={files} onCountsChange={onCountsChange} />;
});
