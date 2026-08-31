import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import { normalizePath, type FilePayload, type ReviewChange } from "../../shared/types.js";
import { fetchWorkspaceFile, type FileState } from "../store.js";
import { FileTypeIcon, Icon, TreeChevron } from "../chrome/icons.js";
import { WorkbenchTooltip } from "../chrome/tooltip.js";
import { writeClipboard } from "@deepseek-ai/dsh-client-ui-primitives";
import { fetchReview } from "../review/review-data.js";
import { useWorkbenchServices } from "../workbench/runtime.js";
import { CodeView } from "./code-view.js";
import { GitDiffPanel, type ReviewScope } from "../review/git-diff-panel.js";

type DiffEntry = { change: ReviewChange; payload: FilePayload | null; error: boolean };

function diffElementId(path: string): string {
  return `dsh-wb-diff-${encodeURIComponent(normalizePath(path))}`;
}

function fileState(path: string, payload: FilePayload | null, error = false): FileState {
  return { open: [path], active: path, path, line: null, loading: false, payload, error: error ? "readError" : "", visible: true, reveal: 0, disk: 0, views: { [path]: "diff" }, preview: "" };
}

export type DiffPanelCommands = {
  reveal(path: string): void;
};

export const DiffPanel = forwardRef<DiffPanelCommands, { sessionId?: string; revealPath?: string; revision?: number; scope?: ReviewScope; onCountsChange?(counts: { additions: number; deletions: number }): void }>(function DiffPanel({ sessionId, revealPath: requestedRevealPath, revision, scope = "session", onCountsChange }, ref) {
  const { i18n } = useWorkbenchServices();
  const t = i18n.t;
  const [entries, setEntries] = useState<DiffEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [copiedPath, setCopiedPath] = useState("");
  const [revealPath, setRevealPath] = useState("");
  const panelRef = useRef<HTMLDivElement | null>(null);

  const scrollToDiff = (path: string) => {
    const target = document.getElementById(diffElementId(path));
    const panel = panelRef.current;
    if (!target || !panel) return;
    panel.scrollTo({ top: target.offsetTop, behavior: "smooth" });
  };

  useImperativeHandle(ref, () => ({
    reveal(path: string) {
      const target = normalizePath(path);
      setRevealPath(target);
      window.requestAnimationFrame(() => scrollToDiff(target));
    },
  }), []);

  useEffect(() => {
    if (requestedRevealPath) setRevealPath(normalizePath(requestedRevealPath));
  }, [requestedRevealPath]);

  useEffect(() => {
    let cancelled = false;
    setCollapsed(new Set());
    setRevealPath(requestedRevealPath ? normalizePath(requestedRevealPath) : "");
    setLoading(true);
    void fetchReview(sessionId)
      .then(async (response) => {
        const next = await Promise.all((response.changes ?? []).map(async (change) => {
          try { return { change, payload: await fetchWorkspaceFile(change.path, "diff"), error: false }; }
          catch { return { change, payload: null, error: true }; }
        }));
        if (!cancelled) setEntries(next);
      })
      .catch(() => { if (!cancelled) setEntries([]); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [revision, sessionId]);

  useEffect(() => {
    const onReveal = (event: Event) => {
      const path = event instanceof CustomEvent && typeof event.detail === "string" ? event.detail : "";
      if (path) {
        setRevealPath(path);
        window.requestAnimationFrame(() => {
          scrollToDiff(path);
        });
      }
    };
    window.addEventListener("dsh-wb-diff-reveal", onReveal);
    return () => window.removeEventListener("dsh-wb-diff-reveal", onReveal);
  }, []);

  useEffect(() => {
    const target = entries.find(({ change }) => normalizePath(change.path) === normalizePath(revealPath));
    if (!revealPath || !target) return;
    scrollToDiff(target.change.path);
  }, [entries, revealPath]);

  if (scope !== "session") return <GitDiffPanel scope={scope} revision={revision ?? 0} onCountsChange={onCountsChange} />;
  if (loading) return <div className="dsh-wb-empty"><strong>{t("reading")}</strong></div>;
  if (entries.length === 0) return <div className="dsh-wb-empty"><strong>{t("reviewEmpty")}</strong></div>;
  const toggleCollapsed = (path: string) => setCollapsed((current) => {
    const next = new Set(current);
    if (next.has(path)) next.delete(path);
    else next.add(path);
    return next;
  });
  return (
    <div ref={panelRef} className="dsh-wb-diff-panel">
      {entries.map(({ change, payload, error }) => (
        <section className={`dsh-wb-diff-file${collapsed.has(change.path) ? " is-collapsed" : ""}`} id={diffElementId(change.path)} key={`${change.sessionId}:${change.path}`}>
          <header
            className="dsh-wb-diff-file-head"
            onClick={() => toggleCollapsed(change.path)}
          >
            <button
              className="dsh-wb-diff-collapse dsh-wb-button"
              type="button"
              aria-label={t(collapsed.has(change.path) ? "expandDiff" : "collapseDiff")}
              aria-expanded={!collapsed.has(change.path)}
              onClick={(event) => {
                event.stopPropagation();
                toggleCollapsed(change.path);
              }}
            >
              <TreeChevron open={!collapsed.has(change.path)} />
            </button>
            <FileTypeIcon path={change.path} />
            <span className="dsh-wb-diff-file-path">{change.path}</span>
            {change.additions > 0 ? <span className="dsh-wb-diff-count is-add">+{change.additions}</span> : null}
            {change.deletions > 0 ? <span className="dsh-wb-diff-count is-delete">−{change.deletions}</span> : null}
            <div className="dsh-wb-diff-file-actions">
              <WorkbenchTooltip label={t(copiedPath === change.path ? "pathCopied" : "copyPath")}>
                <button
                  className="dsh-wb-button dsh-wb-icon-button"
                  type="button"
                  aria-label={t(copiedPath === change.path ? "pathCopied" : "copyPath")}
                  onClick={(event) => {
                    event.stopPropagation();
                    void writeClipboard(change.path).then((copied) => {
                      if (!copied) return;
                      setCopiedPath(change.path);
                      window.setTimeout(() => setCopiedPath((current) => current === change.path ? "" : current), 1400);
                    });
                  }}
                >
                  <Icon name={copiedPath === change.path ? "check" : "copy"} />
                </button>
              </WorkbenchTooltip>
            </div>
          </header>
          {!collapsed.has(change.path) ? <div className="dsh-wb-diff-file-editor"><CodeView state={fileState(change.path, payload, error)} /></div> : null}
        </section>
      ))}
    </div>
  );
});
