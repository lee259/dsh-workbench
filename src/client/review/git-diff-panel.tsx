import { useEffect, useRef, useState } from "react";
import { normalizePath, type FilePayload, type GitFileDiff, type ReviewScope } from "../../shared/types.js";
import { FileTypeIcon, TreeChevron } from "../chrome/icons.js";
import { CodeView } from "../preview/code-view.js";
import type { FileState } from "../store.js";
import { useWorkbenchServices } from "../workbench/runtime.js";
import { fetchGitDiff } from "./git-diff-data.js";
import { completeSessionDiffs } from "./review-scope.js";

export type { ReviewScope } from "../../shared/types.js";

function fileState(file: GitFileDiff): FileState {
  const payload: FilePayload = {
    path: file.path,
    content: file.content,
    before: file.before,
    source: "dsh-write",
    revision: 0,
    size: file.content.length,
  };
  return { open: [file.path], active: file.path, path: file.path, line: null, loading: false, payload, error: "", visible: true, reveal: 0, disk: 0, views: { [file.path]: "diff" }, preview: "" };
}

function diffElementId(path: string): string {
  return `dsh-wb-diff-${encodeURIComponent(normalizePath(path))}`;
}

export function GitDiffPanel({ scope, revision, historyFiles = [], onCountsChange }: { scope: Exclude<ReviewScope, "session">; revision: number; historyFiles?: GitFileDiff[]; onCountsChange?(counts: { additions: number; deletions: number }): void }) {
  const { i18n } = useWorkbenchServices();
  const [worktreeFiles, setWorktreeFiles] = useState<GitFileDiff[]>([]);
  const [loading, setLoading] = useState(true);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [revealPath, setRevealPath] = useState("");
  const lastCounts = useRef({ additions: -1, deletions: -1 });
  const panelRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setCollapsed(new Set());
    void fetchGitDiff(scope)
      .then((next) => { if (!cancelled) setWorktreeFiles(next); })
      .catch(() => { if (!cancelled) setWorktreeFiles([]); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [revision, scope]);
  const files = completeSessionDiffs(worktreeFiles, historyFiles);
  useEffect(() => {
    const onReveal = (event: Event) => {
      const path = event instanceof CustomEvent && typeof event.detail === "string" ? event.detail : "";
      if (path) setRevealPath(normalizePath(path));
    };
    window.addEventListener("dsh-wb-diff-reveal", onReveal);
    return () => window.removeEventListener("dsh-wb-diff-reveal", onReveal);
  }, []);
  useEffect(() => {
    if (!revealPath) return;
    const target = document.getElementById(diffElementId(revealPath));
    const panel = panelRef.current;
    if (target && panel) panel.scrollTo({ top: target.offsetTop, behavior: "smooth" });
  }, [files, revealPath]);
  useEffect(() => {
    const counts = files.reduce((total, file) => ({ additions: total.additions + file.additions, deletions: total.deletions + file.deletions }), { additions: 0, deletions: 0 });
    if (counts.additions === lastCounts.current.additions && counts.deletions === lastCounts.current.deletions) return;
    lastCounts.current = counts;
    onCountsChange?.(counts);
  }, [files, onCountsChange]);
  if (loading) return <div className="dsh-wb-empty"><strong>{i18n.t("reading")}</strong></div>;
  if (files.length === 0) return <div className="dsh-wb-empty"><strong>{i18n.t("noChanges")}</strong></div>;
  const toggleCollapsed = (path: string) => setCollapsed((current) => {
    const next = new Set(current);
    if (next.has(path)) next.delete(path);
    else next.add(path);
    return next;
  });
  return (
    <div ref={panelRef} className="dsh-wb-diff-panel">
      {files.map((file) => (
        <section className={`dsh-wb-diff-file${collapsed.has(file.path) ? " is-collapsed" : ""}`} id={diffElementId(file.path)} key={file.path}>
          <header className="dsh-wb-diff-file-head" onClick={() => toggleCollapsed(file.path)}>
            <button className="dsh-wb-diff-collapse dsh-wb-button" type="button" aria-label={i18n.t(collapsed.has(file.path) ? "expandDiff" : "collapseDiff")} aria-expanded={!collapsed.has(file.path)} onClick={(event) => { event.stopPropagation(); toggleCollapsed(file.path); }}>
              <TreeChevron open={!collapsed.has(file.path)} />
            </button>
            <FileTypeIcon path={file.path} />
            <span className="dsh-wb-diff-file-path">{file.path}</span>
            {file.additions > 0 ? <span className="dsh-wb-diff-count is-add">+{file.additions}</span> : null}
            {file.deletions > 0 ? <span className="dsh-wb-diff-count is-delete">−{file.deletions}</span> : null}
          </header>
          {!collapsed.has(file.path) ? <div className="dsh-wb-diff-file-editor"><CodeView state={fileState(file)} /></div> : null}
        </section>
      ))}
    </div>
  );
}
