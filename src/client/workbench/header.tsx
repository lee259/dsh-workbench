import type { FileState } from "../store.js";
import { FileTypeIcon, Icon, NewTabIcon, TreeChevron } from "../chrome/icons.js";
import type { DiffViewMode } from "../preview/code-mirror.js";
import { visibleBreadcrumbTargets } from "../explorer/tree-model.js";
import { Fragment, useEffect, useRef, useState, type DragEvent } from "react";
import { Menu, writeClipboard } from "@deepseek-ai/dsh-client-ui-primitives";
import { useWorkbenchServices } from "./runtime.js";
import { WorkbenchTooltip } from "../chrome/tooltip.js";
import type { ReviewScope } from "../../shared/types.js";
import { fetchActivities } from "../review/activity-data.js";
import { openInSystem } from "../preview/system-open.js";

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
    allDiffsCollapsed,
    setAllDiffsCollapsed,
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
    allDiffsCollapsed: boolean;
    setAllDiffsCollapsed(next: boolean): void;
    reviewCounts: { additions: number; deletions: number };
    sessionId: string;
  }) {
    const { store, i18n, absolutePath } = useWorkbenchServices();
    const t = i18n.t;
    const [reviewScopeMenuOpen, setReviewScopeMenuOpen] = useState(false);
    const [draggingPath, setDraggingPath] = useState<string | null>(null);
    const [dragOverPath, setDragOverPath] = useState<string | null>(null);
    const tabRefs = useRef(new Map<string, HTMLElement>());
    const normalFileTabs = state.open.filter((path) => !Object.values(emptyFilePaths).includes(path));
    const tabKeys = [
      ...(reviewTabOpen ? ["review"] : []),
      ...normalFileTabs.map((path) => `file:${path}`),
      ...(emptyTabOpen ? ["empty"] : []),
      ...emptyFileTabs.map((id) => `draft:${id}`),
    ];
    const tabOrderStorageKey = `dsh-wb-tab-order:${sessionId}`;
    const [tabOrder, setTabOrder] = useState<string[]>(() => {
      try {
        const saved = JSON.parse(localStorage.getItem(tabOrderStorageKey) ?? "null");
        return Array.isArray(saved) && saved.every((key): key is string => typeof key === "string") ? saved : tabKeys;
      } catch {
        return tabKeys;
      }
    });
    useEffect(() => {
      setTabOrder((previous) => [...previous.filter((key) => tabKeys.includes(key)), ...tabKeys.filter((key) => !previous.includes(key))]);
    }, [tabKeys.join("|")]);
    useEffect(() => {
      try { localStorage.setItem(tabOrderStorageKey, JSON.stringify(tabOrder)); } catch { /* storage may be unavailable */ }
    }, [tabOrderStorageKey, tabOrder]);
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
    const closeNormalFile = (path: string) => {
      const isActive = !diffMode && !emptyTabOpen && !activeEmptyFileTab && path === state.active;
      if (!store.close(path, hasTabsAfter("normal"))) return;
      if (!isActive || normalFileTabs.length > 1) return;
      if (reviewTabOpen) openReviewTab();
      else if (emptyTabOpen) setEmptyTabOpen(true);
      else if (emptyFileTabs[0]) activateFileTab(emptyFileTabs[0]);
    };
    const reorderNormalTabs = (from: string, to: string) => {
      if (from === to) return;
      const normal = [...normalFileTabs];
      const fromIndex = normal.indexOf(from);
      const toIndex = normal.indexOf(to);
      if (fromIndex < 0 || toIndex < 0) return;
      normal.splice(fromIndex, 1);
      normal.splice(toIndex, 0, from);
      let index = 0;
      store.reorder(state.open.map((path) => normal.includes(path) ? normal[index++] : path));
    };
    const tabOrderIndex = (key: string) => {
      const index = tabOrder.indexOf(key);
      return index === -1 ? tabKeys.indexOf(key) : index;
    };
    const tabDragProps = (key: string) => ({
      style: { order: tabOrderIndex(key) },
      draggable: true,
      onDragStart: (event: DragEvent<HTMLDivElement>) => {
        event.dataTransfer.effectAllowed = "move";
        event.dataTransfer.setData("text/dsh-workbench-tab", key);
        setDraggingPath(key);
      },
      onDragOver: (event: DragEvent<HTMLDivElement>) => {
        if (draggingPath === null || draggingPath === key) return;
        event.preventDefault();
        event.dataTransfer.dropEffect = "move";
        setDragOverPath(key);
      },
      onDragLeave: () => { if (dragOverPath === key) setDragOverPath(null); },
      onDrop: (event: DragEvent<HTMLDivElement>) => {
        event.preventDefault();
        event.stopPropagation();
        const from = event.dataTransfer.getData("text/dsh-workbench-tab");
        if (from !== key && tabKeys.includes(from)) {
          setTabOrder((previous) => {
            const next = [...previous];
            const fromIndex = next.indexOf(from);
            const toIndex = next.indexOf(key);
            if (fromIndex >= 0 && toIndex >= 0) {
              next.splice(fromIndex, 1);
              next.splice(toIndex, 0, from);
            }
            return next;
          });
          if (from.startsWith("file:") && key.startsWith("file:")) reorderNormalTabs(from.slice(5), key.slice(5));
        }
        setDraggingPath(null);
        setDragOverPath(null);
      },
      onDragEnd: () => { setDraggingPath(null); setDragOverPath(null); },
    });
    const appendDraggedTab = (event: DragEvent<HTMLDivElement>) => {
      if (event.target !== event.currentTarget || draggingPath === null) return;
      event.preventDefault();
      event.dataTransfer.dropEffect = "move";
      setDragOverPath("__end__");
    };
    const dropDraggedTabAtEnd = (event: DragEvent<HTMLDivElement>) => {
      if (event.target !== event.currentTarget) return;
      event.preventDefault();
      event.stopPropagation();
      const from = event.dataTransfer.getData("text/dsh-workbench-tab");
      if (from && tabKeys.includes(from)) {
        setTabOrder((previous) => [...previous.filter((key) => key !== from), from]);
        if (from.startsWith("file:")) {
          const moved = from.slice(5);
          const normal = normalFileTabs.filter((path) => path !== moved);
          normal.push(moved);
          let index = 0;
          store.reorder(state.open.map((path) => normal.includes(path) ? normal[index++] : path));
        }
      }
      setDraggingPath(null);
      setDragOverPath(null);
    };
    let activeTabKey = "";
    if (diffMode && reviewTabOpen) activeTabKey = "review";
    else if (emptyTabOpen) activeTabKey = "empty";
    else if (activeEmptyFileTab) activeTabKey = `draft:${activeEmptyFileTab}`;
    else if (state.active) activeTabKey = `file:${state.active}`;
    const tabRef = (key: string) => (element: HTMLElement | null) => {
      if (element) tabRefs.current.set(key, element);
      else tabRefs.current.delete(key);
    };
    useEffect(() => {
      tabRefs.current.get(activeTabKey)?.scrollIntoView({ block: "nearest", inline: "nearest" });
    }, [activeTabKey]);
    return (
      <>
        <nav className="dsh-wb-tabs" aria-label={t("openFiles")}>
          <div
            className={`dsh-wb-tabstrip${dragOverPath === "__end__" ? " is-drag-end" : ""}`}
            onDragOver={appendDraggedTab}
            onDragLeave={() => { if (dragOverPath === "__end__") setDragOverPath(null); }}
            onDrop={dropDraggedTabAtEnd}
          >
            {reviewTabOpen ? (
              <div {...tabDragProps("review")} className={`dsh-wb-tab is-review${activeTabKey === "review" ? " is-active" : ""}${draggingPath === "review" ? " is-dragging" : ""}${dragOverPath === "review" ? " is-drag-over" : ""}`} role="presentation">
                <Icon name="commit" />
                <button
                  className="dsh-wb-tab-name"
                  type="button"
                  aria-current={activeTabKey === "review" ? "page" : undefined}
                  ref={tabRef("review")}
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
              const isActive = activeTabKey === `file:${path}`;
              return (
                <div
                  key={path}
                  className={`dsh-wb-tab is-${kind}${isActive ? " is-active" : ""}${path === state.preview ? " is-preview" : ""}${draggingPath === `file:${path}` ? " is-dragging" : ""}${dragOverPath === `file:${path}` ? " is-drag-over" : ""}`}
                  {...tabDragProps(`file:${path}`)}
                  role="presentation"
                >
                  <FileTypeIcon path={path} />
                  <button
                    className="dsh-wb-tab-name"
                    type="button"
                    aria-current={isActive ? "page" : undefined}
                    ref={tabRef(`file:${path}`)}
                    onClick={() => activateNormalFile(path)}
                    onDoubleClick={() => store.pin(path)}
                    onAuxClick={(event) => {
                      if (event.button !== 1) return;
                      event.preventDefault();
                      closeNormalFile(path);
                    }}
                  >
                    {path.split("/").pop() || path}
                  </button>
                  {store.editorSession(path).baseline !== null && store.editorSession(path).content !== store.editorSession(path).baseline ? <span className="dsh-wb-dirty-dot" aria-label={t("unsavedChanges")} /> : null}
                  <WorkbenchTooltip label={t("closeFile")}>
                  <button
                    className="dsh-wb-tab-close"
                    type="button"
                    aria-label={`${t("closeFile")}: ${path}`}
                    onClick={() => closeNormalFile(path)}
                  >
                    ×
                  </button>
                  </WorkbenchTooltip>
                </div>
              );
            })}
            {emptyTabOpen ? (
              <div {...tabDragProps("empty")} className={`dsh-wb-tab is-empty${activeTabKey === "empty" ? " is-active" : ""}${draggingPath === "empty" ? " is-dragging" : ""}${dragOverPath === "empty" ? " is-drag-over" : ""}`} role="presentation">
                <button
                  className="dsh-wb-tab-name"
                  type="button"
                  aria-current={activeTabKey === "empty" ? "page" : undefined}
                  ref={tabRef("empty")}
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
              <div {...tabDragProps(`draft:${id}`)} className={`dsh-wb-tab is-file${activeTabKey === `draft:${id}` ? " is-active" : ""}${draggingPath === `draft:${id}` ? " is-dragging" : ""}${dragOverPath === `draft:${id}` ? " is-drag-over" : ""}`} key={id} role="presentation">
                <FileTypeIcon path="" />
                <button
                  className="dsh-wb-tab-name"
                  type="button"
                  aria-current={activeTabKey === `draft:${id}` ? "page" : undefined}
                  ref={tabRef(`draft:${id}`)}
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
            <div className="dsh-wb-tab-type-picker" style={{ order: 9999 }}>
              <WorkbenchTooltip label={t("openFile")}>
              <button
                type="button"
                className="dsh-wb-tabbar-add"
                aria-label={t("openFile")}
                onClick={newFileTab}
              >
                <NewTabIcon />
              </button>
              </WorkbenchTooltip>
            </div>
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
                    setAllDiffsCollapsed(false);
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
                    setAllDiffsCollapsed(!allDiffsCollapsed);
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
              {state.path && !diffMode ? <button className="dsh-wb-button dsh-wb-path-open" type="button" onClick={() => { void openInSystem(state.path).catch(() => {}); }}>{t("openWithDefault")}</button> : null}
            </div>
          </nav>
        ) : null}
      </>
    );
}
