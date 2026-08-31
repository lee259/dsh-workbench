import { useEffect, useRef, useState } from "react";
import { normalizePath, type FilePayload, type GitFileDiff, type ReviewScope } from "../../shared/types.js";
import { FileTypeIcon, Icon, TreeChevron } from "../chrome/icons.js";
import { CodeView } from "../preview/code-view.js";
import type { FileState } from "../store.js";
import { useWorkbenchServices } from "../workbench/runtime.js";
import { WorkbenchTooltip } from "../chrome/tooltip.js";
import { writeClipboard } from "@deepseek-ai/dsh-client-ui-primitives";
import { fetchGitDiff } from "./git-diff-data.js";
import { reviewDiffCounts } from "../../shared/review-diff.js";

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

export function GitDiffPanel({ scope, revision, files: suppliedFiles, onCountsChange }: { scope: Exclude<ReviewScope, "session">; revision: number; files?: GitFileDiff[]; onCountsChange?(counts: { additions: number; deletions: number }): void }) {
  const { i18n } = useWorkbenchServices();
  const [worktreeFiles, setWorktreeFiles] = useState<GitFileDiff[]>([]);
  const [loading, setLoading] = useState(true);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [copiedPath, setCopiedPath] = useState("");
  const [revealPath, setRevealPath] = useState("");
  const lastCounts = useRef({ additions: -1, deletions: -1 });
  const panelRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    let cancelled = false;
    if (suppliedFiles) return () => {};
    setLoading(true);
    setCollapsed(new Set());
    void fetchGitDiff(scope)
      .then((next) => { if (!cancelled) setWorktreeFiles(next); })
      .catch(() => { if (!cancelled) setWorktreeFiles([]); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [revision, scope, suppliedFiles]);
  const files = suppliedFiles ?? worktreeFiles;
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
    const counts = reviewDiffCounts(files);
    if (counts.additions === lastCounts.current.additions && counts.deletions === lastCounts.current.deletions) return;
    lastCounts.current = counts;
    onCountsChange?.(counts);
  }, [files, onCountsChange]);
  if (!suppliedFiles && loading) return <div className="dsh-wb-empty"><strong>{i18n.t("reading")}</strong></div>;
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
            <div className="dsh-wb-diff-file-actions">
              <WorkbenchTooltip label={i18n.t(copiedPath === file.path ? "pathCopied" : "copyPath")}>
                <button
                  className="dsh-wb-button dsh-wb-icon-button"
                  type="button"
                  aria-label={i18n.t(copiedPath === file.path ? "pathCopied" : "copyPath")}
                  onClick={(event) => {
                    event.stopPropagation();
                    void writeClipboard(file.path).then((copied) => {
                      if (!copied) return;
                      setCopiedPath(file.path);
                      window.setTimeout(() => setCopiedPath((path) => path === file.path ? "" : path), 1400);
                    });
                  }}
                >
                  <Icon name={copiedPath === file.path ? "check" : "copy"} />
                </button>
              </WorkbenchTooltip>
            </div>
          </header>
          {!collapsed.has(file.path) ? <div className="dsh-wb-diff-file-editor"><CodeView state={fileState(file)} /></div> : null}
        </section>
      ))}
    </div>
  );
}
