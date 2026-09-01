import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import { fetchReview, fetchReviewFile } from "../review/review-data.js";
import { mergeReviewFile } from "../review/review-files.js";
import { useWorkbenchServices } from "../workbench/runtime.js";
import { GitDiffPanel, type ReviewScope } from "../review/git-diff-panel.js";

export type DiffPanelCommands = {
  reveal(path: string): void;
};

export const DiffPanel = forwardRef<DiffPanelCommands, { sessionId?: string; revealPath?: string; revealVersion?: number; revision?: number; scope?: ReviewScope; updates?: Readonly<Record<string, number>>; onCountsChange?(counts: { additions: number; deletions: number }): void }>(function DiffPanel({ sessionId, revealPath: requestedRevealPath, revealVersion, revision, scope = "session", updates, onCountsChange }, ref) {
  const { i18n } = useWorkbenchServices();
  const t = i18n.t;
  const [files, setFiles] = useState<import("../../shared/types.js").GitFileDiff[]>([]);
  const [loading, setLoading] = useState(true);
  const fullRequest = useRef(0);
  const pendingUpdates = useRef<Record<string, number>>({});

  useImperativeHandle(ref, () => ({
    reveal(path: string) {
      window.dispatchEvent(new CustomEvent("dsh-wb-diff-reveal", { detail: path }));
    },
  }), []);

  useEffect(() => {
    let cancelled = false;
    const request = ++fullRequest.current;
    setLoading(true);
    void fetchReview(sessionId)
      .then((response) => { if (!cancelled && request === fullRequest.current) setFiles(response.files ?? []); })
      .catch(() => { if (!cancelled && request === fullRequest.current) setFiles([]); })
      .finally(() => { if (!cancelled && request === fullRequest.current) setLoading(false); });
    return () => { cancelled = true; };
  }, [revision, sessionId]);

  useEffect(() => {
    if (scope !== "session" || !updates) return;
    for (const [path, version] of Object.entries(updates)) {
      if (pendingUpdates.current[path] === version) continue;
      pendingUpdates.current[path] = version;
      void fetchReviewFile(sessionId, path)
        .then((file) => {
          if (pendingUpdates.current[path] !== version) return;
          setFiles((current) => mergeReviewFile(current, file, path));
          setLoading(false);
        })
        .catch(() => {});
    }
  }, [scope, sessionId, updates]);

  if (scope !== "session") return <GitDiffPanel scope={scope} revision={revision ?? 0} onCountsChange={onCountsChange} />;
  if (loading) return <div className="dsh-wb-empty"><strong>{t("reading")}</strong></div>;
  return <GitDiffPanel scope="uncommitted" revision={revision ?? 0} files={files} sessionId={sessionId} revealPath={requestedRevealPath} revealVersion={revealVersion} onCountsChange={onCountsChange} />;
});
