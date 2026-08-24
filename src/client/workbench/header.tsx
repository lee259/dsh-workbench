import type { FileState } from "../store.js";
import { FileTypeIcon, Icon, NewTabIcon } from "../chrome/icons.js";
import { visibleBreadcrumbTargets } from "../explorer/tree-model.js";
import { Fragment } from "react";
import { HoverCard, writeClipboard } from "@deepseek-ai/dsh-client-ui-primitives";
import { useWorkbenchServices } from "./runtime.js";
import { WorkbenchTooltip } from "../chrome/tooltip.js";

export function WorkbenchHeader({
    state,
    diffMode,
    setDiffMode,
    treeVisible,
    setTreeOpen,
    setSearchOpen,
    showTreeAt,
    meta,
    pathCopied,
    setPathCopied,
  }: {
    state: FileState;
    diffMode: boolean;
    setDiffMode(next: boolean): void;
    treeVisible: boolean;
    setTreeOpen(next: boolean): void;
    setSearchOpen(open: boolean): void;
    showTreeAt(path: string): void;
    meta: string;
    pathCopied: boolean;
    setPathCopied(value: boolean): void;
  }) {
    const { store, i18n, absolutePath } = useWorkbenchServices();
    const t = i18n.t;
    return (
      <>
        <nav className="dsh-wb-tabs" aria-label={t("openFiles")} role="tablist">
          <div className="dsh-wb-tabstrip">
            {state.open.map((path) => {
              const kind = state.views[path] ?? "view";
              const fullPath = absolutePath?.(path) ?? path;
              return (
                <div
                  className={`dsh-wb-tab is-${kind}${path === state.active ? " is-active" : ""}${path === state.preview ? " is-preview" : ""}`}
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
                        aria-selected={path === state.active}
                        onClick={() => void store.activate(path)}
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
                    onClick={() => store.close(path)}
                  >
                    ×
                  </button>
                  </WorkbenchTooltip>
                </div>
              );
            })}
            <WorkbenchTooltip label={t("searchHint")}>
            <button
              type="button"
              className="dsh-wb-tabbar-add"
              aria-label={t("newTab")}
              onClick={() => setSearchOpen(true)}
            >
              <NewTabIcon />
            </button>
            </WorkbenchTooltip>
          </div>
          <div className="dsh-wb-tab-actions">
            <WorkbenchTooltip label={t(diffMode ? "previewMode" : "diffMode")}>
            <button
              className="dsh-wb-button dsh-wb-icon-button"
              type="button"
              aria-label={t(diffMode ? "previewMode" : "diffMode")}
              aria-pressed={diffMode}
              onClick={() => {
                setDiffMode(!diffMode);
                if (!treeVisible) setTreeOpen(true);
              }}
            >
              <Icon name={diffMode ? "folder" : "commit"} />
            </button>
            </WorkbenchTooltip>
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
        {state.path ? (
          <nav className="dsh-wb-pathbar" aria-label={t("filePath")}>
            {visibleBreadcrumbTargets(state.path).map((item, index) => (
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
            ))}
            <span className="dsh-wb-meta">{meta}</span>
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
              <WorkbenchTooltip label={t(pathCopied ? "pathCopied" : "copyPath")}>
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
              </WorkbenchTooltip>
            </div>
          </nav>
        ) : null}
      </>
    );
}
