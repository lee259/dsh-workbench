import type { FileState } from "../store.js";
import { FileTypeIcon, Icon, NewTabIcon } from "../chrome/icons.js";
import { visibleBreadcrumbTargets } from "../explorer/tree-model.js";
import { Fragment } from "react";
import { HoverCard, writeClipboard } from "@deepseek-ai/dsh-client-ui-primitives";
import { useWorkbenchServices } from "./runtime.js";
import { WorkbenchTooltip } from "../chrome/tooltip.js";
import type { ReviewScope } from "../../shared/types.js";

export function WorkbenchHeader({
    state,
    diffMode,
    setDiffMode,
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
  }: {
    state: FileState;
    diffMode: boolean;
    setDiffMode(next: boolean): void;
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
  }) {
    const { store, i18n, absolutePath } = useWorkbenchServices();
    const t = i18n.t;
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
                <select className="dsh-wb-review-scope" value={reviewScope} onChange={(event) => setReviewScope(event.target.value as ReviewScope)}>
                  <option value="session">{t("sessionEdits")}</option>
                  <option value="uncommitted">{t("uncommitted")}</option>
                  <option value="unstaged">{t("unstaged")}</option>
                  <option value="staged">{t("staged")}</option>
                </select>
                {reviewCounts.additions > 0 ? <span className="dsh-wb-review-count is-add">+{reviewCounts.additions}</span> : null}
                {reviewCounts.deletions > 0 ? <span className="dsh-wb-review-count is-delete">−{reviewCounts.deletions}</span> : null}
              </div>
            )}
            {!diffMode ? <span className="dsh-wb-meta">{meta}</span> : null}
            <div className="dsh-wb-path-actions" aria-label={t("viewOptions")}>
              <WorkbenchTooltip label={t(treeVisible ? "hideTree" : "showTree")}>
              <button
                className="dsh-wb-button dsh-wb-icon-button"
                type="button"
                aria-label={t(treeVisible ? "hideTree" : "showTree")}
                aria-pressed={treeVisible}
                onClick={() => setTreeOpen(!treeVisible)}
              >
                <Icon name={treeVisible ? "panel-open" : "panel-closed"} />
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
