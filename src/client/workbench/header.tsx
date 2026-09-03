import type { FileState } from "../store.js";
import { FileTypeIcon, Icon, NewTabIcon, TreeChevron } from "../chrome/icons.js";
import type { DiffViewMode } from "../preview/code-mirror.js";
import { visibleBreadcrumbTargets } from "../explorer/tree-model.js";
import { Fragment, useEffect, useState } from "react";
import { HoverCard, Menu, writeClipboard } from "@deepseek-ai/dsh-client-ui-primitives";
import { useWorkbenchServices } from "./runtime.js";
import { WorkbenchTooltip } from "../chrome/tooltip.js";
import type { ReviewScope } from "../../shared/types.js";
import type { GitStatus } from "../../shared/types.js";
import { fetchGitStatus } from "../review/git-diff-data.js";
import { fetchActivities } from "../review/activity-data.js";

function GitStatusMeta() {
  const [status, setStatus] = useState<GitStatus | null>(null);
  useEffect(() => {
    const refresh = () => { void fetchGitStatus().then(setStatus).catch(() => setStatus(null)); };
    refresh();
    window.addEventListener("dsh-wb-workspace-change", refresh);
    return () => window.removeEventListener("dsh-wb-workspace-change", refresh);
  }, []);
  if (!status?.branch) return null;
  return <span className="dsh-wb-git-status" title={status.branch}><span>{status.branch}</span>{status.unstaged ? <b>•{status.unstaged}</b> : null}{status.staged ? <b>+{status.staged}</b> : null}{status.untracked ? <b>?{status.untracked}</b> : null}</span>;
}

function ActivityMeta({ sessionId, t, onOpen }: { sessionId: string; t(key: "tasksRunning" | "taskFailed" | "taskDone", values?: { count: number }): string; onOpen(path: string): void }) {
  const [records, setRecords] = useState<import("../../shared/types.js").ActivityRecord[]>([]);
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const refresh = () => { void fetchActivities().then(setRecords).catch(() => setRecords([])); };
    refresh();
    window.addEventListener("dsh-wb-activity-change", refresh);
    return () => window.removeEventListener("dsh-wb-activity-change", refresh);
  }, []);
  const own = records.filter((record) => record.sessionId === sessionId);
  const running = own.filter((record) => record.status === "running");
  const latest = running.at(-1) ?? own.filter((record) => record.status === "error").at(-1);
  if (!latest) return null;
  const recent = own.filter((record) => record.status === "running" || record.status === "error").slice(-4).reverse();
  return <Menu
    open={open}
    onClose={() => setOpen(false)}
    items={recent.map((record) => ({
      id: record.id,
      label: record.path ? `${record.name} · ${record.path}` : record.name,
    }))}
    onSelect={(id: string) => {
      const record = recent.find((item) => item.id === id);
      if (record?.path) onOpen(record.path);
      setOpen(false);
    }}
    portal
    align="end"
    anchor={(
      <button
        className="dsh-wb-activity-status"
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        {running.length ? t("tasksRunning", { count: running.length }) : latest.status === "error" ? t("taskFailed") : t("taskDone")}
      </button>
    )}
  />;
}

export function WorkbenchHeader({
    state,
    diffMode,
    setDiffMode,
    diffView,
    setDiffView,
    reviewTabOpen,
    openReviewTab,
    closeReviewTab,
    emptyTabOpen,
    setEmptyTabOpen,
    emptyFileTabs,
    emptyFilePaths,
    activeEmptyFileTab,
    setActiveEmptyFileTab,
    newFileTab,
    activateEmptyFileTab,
    closeEmptyFileTab,
    treeVisible,
    setTreeOpen,
    setSearchOpen,
    showTreeAt,
    meta,
    pathCopied,
    setPathCopied,
    reviewScope,
    setReviewScope,
    reviewCounts,
    sessionId,
  }: {
    state: FileState;
    diffMode: boolean;
    setDiffMode(next: boolean): void;
    diffView: DiffViewMode;
    setDiffView(next: DiffViewMode): void;
    reviewTabOpen: boolean;
    openReviewTab(): void;
    closeReviewTab(): void;
    emptyTabOpen: boolean;
    setEmptyTabOpen(open: boolean): void;
    emptyFileTabs: string[];
    emptyFilePaths: Record<string, string>;
    activeEmptyFileTab: string;
    setActiveEmptyFileTab(value: string): void;
    newFileTab(): void;
    activateEmptyFileTab(id: string): void;
    closeEmptyFileTab(id: string, keepPanelOpen?: boolean): void;
    treeVisible: boolean;
    setTreeOpen(next: boolean): void;
    setSearchOpen(open: boolean): void;
    showTreeAt(path: string): void;
    meta: string;
    pathCopied: boolean;
    setPathCopied(value: boolean): void;
    reviewScope: ReviewScope;
    setReviewScope(scope: ReviewScope): void;
    reviewCounts: { additions: number; deletions: number };
    sessionId: string;
  }) {
    const { store, i18n, absolutePath } = useWorkbenchServices();
    const t = i18n.t;
    const [reviewScopeMenuOpen, setReviewScopeMenuOpen] = useState(false);
    const [allDiffsCollapsed, setAllDiffsCollapsed] = useState(false);
    useEffect(() => setAllDiffsCollapsed(false), [reviewScope]);
    const normalFileTabs = state.open.filter((path) => !Object.values(emptyFilePaths).includes(path));
    const hasTabsAfter = (closing: "review" | "empty" | "file" | "normal") => (
      (closing !== "review" && reviewTabOpen)
      || (closing !== "empty" && emptyTabOpen)
      || (closing !== "file" && emptyFileTabs.length > 0)
      || (closing !== "normal" && normalFileTabs.length > 0)
      || (closing === "file" && emptyFileTabs.length > 1)
      || (closing === "normal" && normalFileTabs.length > 1)
    );
    const activateNormalFile = (path: string) => {
      setEmptyTabOpen(false);
      setActiveEmptyFileTab("");
      setDiffMode(false);
      void store.activate(path);
    };
    const activateFileTab = (id: string) => {
      setEmptyTabOpen(false);
      setDiffMode(false);
      activateEmptyFileTab(id);
    };
    return (
      <>
        <nav className="dsh-wb-tabs" aria-label={t("openFiles")} role="tablist">
          <div className="dsh-wb-tabstrip">
            {reviewTabOpen ? (
              <div className={`dsh-wb-tab is-review${diffMode ? " is-active" : ""}`} role="presentation">
                <Icon name="commit" />
                <button
                  className="dsh-wb-tab-name"
                  type="button"
                  role="tab"
                  aria-selected={diffMode}
                  onClick={openReviewTab}
                >
                  {t("reviewTab")}
                </button>
                <WorkbenchTooltip label={t("closeFile")}>
                  <button
                    className="dsh-wb-tab-close"
                    type="button"
                    aria-label={`${t("closeFile")}: ${t("reviewTab")}`}
                    onClick={() => {
                      closeReviewTab();
                      if (!hasTabsAfter("review")) store.hide();
                      else if (normalFileTabs[0]) activateNormalFile(normalFileTabs[0]);
                      else if (emptyTabOpen) setEmptyTabOpen(true);
                      else if (emptyFileTabs[0]) activateFileTab(emptyFileTabs[0]);
                    }}
                  >
                    ×
                  </button>
                </WorkbenchTooltip>
              </div>
            ) : null}
            {normalFileTabs.map((path) => {
              const kind = state.views[path] ?? "view";
              const fullPath = absolutePath?.(path) ?? path;
              return (
                <div
                  className={`dsh-wb-tab is-${kind}${!diffMode && !emptyTabOpen && !activeEmptyFileTab && path === state.active ? " is-active" : ""}${path === state.preview ? " is-preview" : ""}`}
                  key={path}
                  role="presentation"
                >
                  <FileTypeIcon path={path} />
                  <HoverCard
                    anchor={(
                      <button
                        className="dsh-wb-tab-name"
                        type="button"
                        role="tab"
                        aria-selected={!diffMode && !emptyTabOpen && !activeEmptyFileTab && path === state.active}
                        onClick={() => activateNormalFile(path)}
                        onDoubleClick={() => store.pin(path)}
                      >
                        {path.split("/").pop() || path}
                      </button>
                    )}
                    content={<span className="dsh-wb-path-hovercard">{fullPath}</span>}
                    copyText={fullPath}
                    copyLabel={t("copyPath")}
                    copiedLabel={t("pathCopied")}
                  />
                  <WorkbenchTooltip label={t("closeFile")}>
                  <button
                    className="dsh-wb-tab-close"
                    type="button"
                    aria-label={`${t("closeFile")}: ${path}`}
                    onClick={() => {
                      const isActive = !diffMode && !emptyTabOpen && !activeEmptyFileTab && path === state.active;
                      store.close(path, hasTabsAfter("normal"));
                      if (!isActive || normalFileTabs.length > 1) return;
                      if (reviewTabOpen) openReviewTab();
                      else if (emptyTabOpen) setEmptyTabOpen(true);
                      else if (emptyFileTabs[0]) activateFileTab(emptyFileTabs[0]);
                    }}
                  >
                    ×
                  </button>
                  </WorkbenchTooltip>
                </div>
              );
            })}
            {emptyTabOpen ? (
              <div className="dsh-wb-tab is-empty is-active" role="presentation">
                <button
                  className="dsh-wb-tab-name"
                  type="button"
                  role="tab"
                  aria-selected="true"
                  onClick={() => setEmptyTabOpen(true)}
                >
                  {t("newTab")}
                </button>
                <WorkbenchTooltip label={t("closeFile")}>
                  <button
                    className="dsh-wb-tab-close"
                    type="button"
                    aria-label={`${t("closeFile")}: ${t("newTab")}`}
                    onClick={() => {
                      setEmptyTabOpen(false);
                      if (!hasTabsAfter("empty")) store.hide();
                      else if (normalFileTabs.at(-1)) activateNormalFile(normalFileTabs.at(-1) as string);
                      else if (reviewTabOpen) openReviewTab();
                      else if (emptyFileTabs[0]) activateFileTab(emptyFileTabs[0]);
                    }}
                  >
                    ×
                  </button>
                </WorkbenchTooltip>
              </div>
            ) : null}
            {emptyFileTabs.map((id) => (
              <div className={`dsh-wb-tab is-file${activeEmptyFileTab === id ? " is-active" : ""}`} key={id} role="presentation">
                <FileTypeIcon path="" />
                <button
                  className="dsh-wb-tab-name"
                  type="button"
                  role="tab"
                  aria-selected={activeEmptyFileTab === id}
                  onClick={() => { setEmptyTabOpen(false); setDiffMode(false); activateEmptyFileTab(id); }}
                >
                  {emptyFilePaths[id] ? emptyFilePaths[id].split("/").pop() || t("file") : t("file")}
                </button>
                <WorkbenchTooltip label={t("closeFile")}>
                  <button
                    className="dsh-wb-tab-close"
                    type="button"
                    aria-label={`${t("closeFile")}: ${t("file")}`}
                    onClick={() => {
                      const isActive = activeEmptyFileTab === id;
                      closeEmptyFileTab(id, hasTabsAfter("file"));
                      if (!isActive || emptyFileTabs.length > 1) return;
                      if (normalFileTabs.at(-1)) activateNormalFile(normalFileTabs.at(-1) as string);
                      else if (reviewTabOpen) openReviewTab();
                      else if (emptyTabOpen) setEmptyTabOpen(true);
                    }}
                  >
                    ×
                  </button>
                </WorkbenchTooltip>
              </div>
            ))}
          </div>
          <div className="dsh-wb-tab-type-picker">
            <WorkbenchTooltip label={t("newTab")}>
            <button
              type="button"
              className="dsh-wb-tabbar-add"
              aria-label={t("newTab")}
              onClick={() => {
                if (reviewTabOpen) {
                  newFileTab();
                } else {
                  setEmptyTabOpen(true);
                  setActiveEmptyFileTab("");
                  setDiffMode(false);
                }
              }}
            >
              <NewTabIcon />
            </button>
            </WorkbenchTooltip>
          </div>
          <div className="dsh-wb-tab-actions">
            <WorkbenchTooltip label={t("hidePanel")}>
            <button
              className="dsh-wb-button dsh-wb-icon-button dsh-wb-close-button"
              type="button"
              aria-label={t("close")}
              onClick={() => store.hide()}
            >
              <Icon name="close" />
            </button>
            </WorkbenchTooltip>
          </div>
        </nav>
        {!emptyTabOpen && (state.path || diffMode) ? (
          <nav className={`dsh-wb-pathbar${diffMode ? " is-review" : ""}`} aria-label={t("filePath")}>
            {!diffMode ? visibleBreadcrumbTargets(state.path).map((item, index) => (
              <Fragment key={item.path}>
                {index > 0 ? <span className="dsh-wb-path-separator">/</span> : null}
                <button
                  type="button"
                  className={`dsh-wb-path-segment${item.kind === "file" ? " is-current" : ""}`}
                  onClick={() => {
                    if (item.kind === "file") void store.activate(item.path);
                    else showTreeAt(item.path);
                  }}
                >
                  {item.label}
                </button>
              </Fragment>
            )) : (
              <div className="dsh-wb-review-toolbar">
                <Menu
                  open={reviewScopeMenuOpen}
                  onClose={() => setReviewScopeMenuOpen(false)}
                  items={[
                    { id: "session", label: t("sessionEdits") },
                    { id: "uncommitted", label: t("uncommitted") },
                    { id: "unstaged", label: t("unstaged") },
                    { id: "staged", label: t("staged") },
                  ]}
                  onSelect={(id: string) => {
                    setReviewScope(id as ReviewScope);
                    setReviewScopeMenuOpen(false);
                  }}
                  portal
                  align="start"
                  anchor={(
                    <button
                      className="dsh-wb-review-scope"
                      type="button"
                      aria-expanded={reviewScopeMenuOpen}
                      onClick={() => setReviewScopeMenuOpen((open) => !open)}
                    >
                      <span>{t(reviewScope === "session" ? "sessionEdits" : reviewScope)}</span>
                      <TreeChevron open />
                    </button>
                  )}
                />
                {reviewCounts.additions > 0 ? <span className="dsh-wb-review-count is-add">+{reviewCounts.additions}</span> : null}
                {reviewCounts.deletions > 0 ? <span className="dsh-wb-review-count is-delete">−{reviewCounts.deletions}</span> : null}
                <GitStatusMeta />
                <ActivityMeta sessionId={sessionId} t={t} onOpen={(path) => { setDiffMode(false); void store.open(path, "view"); }} />
              </div>
            )}
            {!diffMode ? <span className="dsh-wb-meta">{meta}</span> : null}
            <div className="dsh-wb-path-actions" aria-label={t("viewOptions")}>
              {diffMode ? (
                <WorkbenchTooltip label={t(allDiffsCollapsed ? "expandAllDiffs" : "collapseAllDiffs")}>
                <button
                  className="dsh-wb-button dsh-wb-icon-button"
                  type="button"
                  aria-label={t(allDiffsCollapsed ? "expandAllDiffs" : "collapseAllDiffs")}
                  aria-pressed={allDiffsCollapsed}
                  onClick={() => {
                    const next = !allDiffsCollapsed;
                    setAllDiffsCollapsed(next);
                    window.dispatchEvent(new CustomEvent("dsh-wb-diff-collapse-all", { detail: next ? "collapse" : "expand" }));
                  }}
                >
                  <Icon name={allDiffsCollapsed ? "expand-all" : "collapse-all"} />
                </button>
                </WorkbenchTooltip>
              ) : null}
              {diffMode ? (
                <WorkbenchTooltip label={t(diffView === "unified" ? "splitDiff" : "unifiedDiff")}>
                <button
                  className="dsh-wb-button dsh-wb-icon-button"
                  type="button"
                  aria-label={t(diffView === "unified" ? "splitDiff" : "unifiedDiff")}
                  aria-pressed={diffView === "split"}
                  onClick={() => setDiffView(diffView === "unified" ? "split" : "unified")}
                >
                  <Icon name={diffView === "unified" ? "split" : "unified"} />
                </button>
                </WorkbenchTooltip>
              ) : null}
              <WorkbenchTooltip label={t(treeVisible ? "hideTree" : "showTree")}>
              <button
                className="dsh-wb-button dsh-wb-icon-button"
                type="button"
                aria-label={t(treeVisible ? "hideTree" : "showTree")}
                aria-pressed={treeVisible}
                onClick={() => setTreeOpen(!treeVisible)}
              >
                <Icon name="folder" />
              </button>
              </WorkbenchTooltip>
              {state.path ? <WorkbenchTooltip label={t(pathCopied ? "pathCopied" : "copyPath")}>
              <button
                className="dsh-wb-path"
                type="button"
                aria-label={t(pathCopied ? "pathCopied" : "copyPath")}
                onClick={() => {
                  void writeClipboard(absolutePath?.(state.path) ?? state.path).then((copied) => {
                    if (!copied) return;
                    setPathCopied(true);
                    window.setTimeout(() => setPathCopied(false), 1400);
                  });
                }}
              >
                <Icon name={pathCopied ? "check" : "copy"} />
              </button>
              </WorkbenchTooltip> : null}
            </div>
          </nav>
        ) : null}
      </>
    );
}
