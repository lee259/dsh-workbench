import { useEffect, useState } from "react";
import { type FilePayload, type GitFileDiff, type ReviewScope } from "../../shared/types.js";
import { FileTypeIcon, TreeChevron } from "../chrome/icons.js";
import { CodeView } from "../preview/code-view.js";
import type { FileState } from "../store.js";
import { useWorkbenchServices } from "../workbench/runtime.js";
import { fetchGitDiff } from "./git-diff-data.js";

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

export function GitDiffPanel({ scope, revision, onCountsChange }: { scope: Exclude<ReviewScope, "session">; revision: number; onCountsChange?(counts: { additions: number; deletions: number }): void }) {
  const { i18n } = useWorkbenchServices();
  const [files, setFiles] = useState<GitFileDiff[]>([]);
  const [loading, setLoading] = useState(true);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setCollapsed(new Set());
    void fetchGitDiff(scope)
      .then((next) => { if (!cancelled) setFiles(next); })
      .catch(() => { if (!cancelled) setFiles([]); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [revision, scope]);
  useEffect(() => {
    onCountsChange?.(files.reduce((counts, file) => ({ additions: counts.additions + file.additions, deletions: counts.deletions + file.deletions }), { additions: 0, deletions: 0 }));
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
    <div className="dsh-wb-diff-panel">
      {files.map((file) => (
        <section className={`dsh-wb-diff-file${collapsed.has(file.path) ? " is-collapsed" : ""}`} key={file.path}>
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
