import type { FileState } from "../store.js";
import { FileTypeIcon, Icon, NewTabIcon } from "../chrome/icons.js";
import { visibleBreadcrumbTargets } from "../explorer/tree-model.js";
import { Fragment } from "react";
import { useWorkbenchServices } from "./runtime.js";

export function WorkbenchHeader({
    state,
    treeVisible,
    setTreeOpen,
    setSearchOpen,
    showTreeAt,
    payload,
    meta,
    copied,
    setCopied,
    pathCopied,
    setPathCopied,
  }: {
    state: FileState;
    treeVisible: boolean;
    setTreeOpen(next: boolean): void;
    setSearchOpen(open: boolean): void;
    showTreeAt(path: string): void;
    payload: FileState["payload"];
    meta: string;
    copied: boolean;
    setCopied(value: boolean): void;
    pathCopied: boolean;
    setPathCopied(value: boolean): void;
  }) {
    const { store, i18n } = useWorkbenchServices();
    const t = i18n.t;
    return <>
          <nav className="dsh-wb-tabs" aria-label={t("openFiles")} role="tablist">
              <div className="dsh-wb-tabstrip">
                {state.open.map((path) => {
                  const kind = state.views[path] ?? "view";
                  return (
                    <div className={`dsh-wb-tab is-${kind}${path === state.active ? " is-active" : ""}${path === state.preview ? " is-preview" : ""}`} key={path} role="presentation">
                      <FileTypeIcon path={path} />
                      <button className="dsh-wb-tab-name" type="button" role="tab" aria-selected={path === state.active} title={path} onClick={() => void store.activate(path)} onDoubleClick={() => store.pin(path)}>
                        {path.split("/").pop() || path}
                      </button>
                      {kind === "diff" ? <span className="dsh-wb-tab-kind">{t("tabDiff")}</span> : null}
                      <button className="dsh-wb-tab-close" type="button" title={t("closeFile")} aria-label={`${t("closeFile")}: ${path}`} onClick={() => store.close(path)}>
                        ×
                      </button>
                    </div>
                  );
                })}
                <button type="button" className="dsh-wb-tabbar-add" aria-label={t("newTab")} title={t("searchHint")} onClick={() => setSearchOpen(true)}>
                  <NewTabIcon />
                </button>
              </div>
              <div className="dsh-wb-tab-actions">
                <button
                  className={`dsh-wb-button dsh-wb-icon-button${treeVisible ? " is-on" : ""}`}
                  type="button"
                  aria-label={t(treeVisible ? "hideTree" : "showTree")}
                  aria-pressed={treeVisible}
                  title={t(treeVisible ? "hideTree" : "showTree")}
                  onClick={() => setTreeOpen(!treeVisible)}
                >
                  <Icon name="panel" />
                </button>
                <button
                  className="dsh-wb-button dsh-wb-icon-button"
                  type="button"
                  aria-label={t("refresh")}
                  title={t("refresh")}
                  data-loading={state.loading ? "true" : "false"}
                  onClick={() => void store.reload()}
                >
                  <Icon name="refresh" />
                </button>
                <button
                  className="dsh-wb-button dsh-wb-icon-button"
                  type="button"
                  aria-label={t(copied ? "copied" : "copy")}
                  title={t(copied ? "copied" : "copy")}
                  onClick={() => {
                    if (!payload || !navigator.clipboard) return;
                    void navigator.clipboard.writeText(payload.content).then(() => {
                      setCopied(true);
                      window.setTimeout(() => setCopied(false), 1400);
                    });
                  }}
                >
                  <Icon name={copied ? "check" : "copy"} />
                </button>
                <button className="dsh-wb-button dsh-wb-icon-button dsh-wb-close-button" type="button" aria-label={t("close")} title={t("hidePanel")} onClick={() => store.hide()}>
                  <Icon name="close" />
                </button>
              </div>
            </nav>
            {state.path ? (
              <nav className="dsh-wb-pathbar" aria-label={t("filePath")}>
                <button
                  type="button"
                  className="dsh-wb-path-root"
                  aria-label={t("workspaceTitle")}
                  title={t("workspaceTitle")}
                  onClick={() => showTreeAt("")}
                >
                  <Icon name="folder" />
                </button>
                {visibleBreadcrumbTargets(state.path).map((item, index) => (
                  <Fragment key={`${item.path}-${index}`}>
                    {index > 0 ? <span className="dsh-wb-path-separator">/</span> : null}
                    <button
                      type="button"
                      className={`dsh-wb-path-segment${item.kind === "file" ? " is-current" : ""}`}
                      onClick={() => {
                        if (item.kind === "file") void store.activate(item.path);
                        showTreeAt(item.path);
                      }}
                    >
                      {item.label}
                    </button>
                  </Fragment>
                ))}
                <button
                  className="dsh-wb-path"
                  type="button"
                  aria-label={t(pathCopied ? "pathCopied" : "copyPath")}
                  title={t(pathCopied ? "pathCopied" : "copyPath")}
                  onClick={() => {
                    if (!navigator.clipboard) return;
                    void navigator.clipboard.writeText(state.path).then(() => {
                      setPathCopied(true);
                      window.setTimeout(() => setPathCopied(false), 1400);
                    });
                  }}
                >
                  <Icon name={pathCopied ? "check" : "copy"} />
                </button>
                <span className="dsh-wb-meta">{meta}</span>
              </nav>
            ) : null}
    </>;
}
