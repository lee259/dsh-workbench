import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import { fetchReview, fetchReviewFile } from "../review/review-data.js";
import { mergeReviewFile } from "../review/review-files.js";
import { useWorkbenchServices } from "../workbench/runtime.js";
import { GitDiffPanel, type ReviewScope } from "../review/git-diff-panel.js";
import type { DiffViewMode } from "./code-mirror.js";

export type DiffPanelCommands = {
  reveal(path: string): void;
};

export const DiffPanel = forwardRef<DiffPanelCommands, { sessionId?: string; revealPath?: string; revealVersion?: number; revision?: number; scope?: ReviewScope; updates?: Readonly<Record<string, number>>; diffView?: DiffViewMode; collapseAll?: boolean; onCountsChange?(counts: { additions: number; deletions: number }): void }>(function DiffPanel({ sessionId, revealPath: requestedRevealPath, revealVersion, revision, scope = "session", updates, diffView = "unified", collapseAll = false, onCountsChange }, ref) {
  const { i18n } = useWorkbenchServices();
  const t = i18n.t;
  const [files, setFiles] = useState<import("../../shared/types.js").GitFileDiff[]>([]);
  const [loading, setLoading] = useState(true);
  const fullRequest = useRef(0);
  const pendingUpdates = useRef<Record<string, number>>({});
  const snapshotReady = useRef(false);
  const [snapshotVersion, setSnapshotVersion] = useState(0);

  useImperativeHandle(ref, () => ({
    reveal(path: string) {
      window.dispatchEvent(new CustomEvent("dsh-wb-diff-reveal", { detail: path }));
    },
  }), []);

  useEffect(() => {
    const controller = new AbortController();
    const request = ++fullRequest.current;
    snapshotReady.current = false;
    setLoading(true);
    void fetchReview(sessionId, controller.signal)
      .then((response) => { if (!controller.signal.aborted && request === fullRequest.current) setFiles(response.sessionFiles ?? response.files ?? []); })
      .catch(() => { if (!controller.signal.aborted && request === fullRequest.current) setFiles([]); })
      .finally(() => {
        if (controller.signal.aborted || request !== fullRequest.current) return;
        snapshotReady.current = true;
        setSnapshotVersion((version) => version + 1);
        setLoading(false);
      });
    return () => controller.abort();
  }, [revision, sessionId]);

  useEffect(() => {
    if (scope !== "session" || !updates || !snapshotReady.current) return;
    for (const [path, version] of Object.entries(updates)) {
      if (pendingUpdates.current[path] === version) continue;
      pendingUpdates.current[path] = version;
      void fetchReviewFile(sessionId, path)
        .then((file) => {
          if (pendingUpdates.current[path] !== version) return;
          setFiles((current) => mergeReviewFile(current, file, path));
        })
        .catch(() => {});
    }
  }, [scope, sessionId, snapshotVersion, updates]);

  if (scope !== "session") return <GitDiffPanel scope={scope} revision={revision ?? 0} diffView={diffView} collapseAll={collapseAll} onCountsChange={onCountsChange} />;
  if (loading) return <div className="dsh-wb-empty"><strong>{t("reading")}</strong></div>;
  return <GitDiffPanel scope="uncommitted" revision={revision ?? 0} files={files} sessionId={sessionId} revealPath={requestedRevealPath} revealVersion={revealVersion} diffView={diffView} collapseAll={collapseAll} onCountsChange={onCountsChange} />;
});
