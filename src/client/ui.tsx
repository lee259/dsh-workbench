import type { LocaleStore } from "../shared/i18n.js";
import { FILE_TOOLS } from "../shared/types.js";
import { filePathFromBlock } from "./capture/tool-path.js";
import { FileTypeIcon, Icon, EmptyFileIcon, NewTabIcon } from "./chrome/icons.js";
import { shortcutAction } from "./chrome/shortcuts.js";
import {
  DEFAULT_SIDEBAR_WIDTH,
  MAX_SIDEBAR_WIDTH,
  MIN_SIDEBAR_WIDTH,
  readSidebarWidth,
  sidebarWidthFromKey,
  sidebarWidthFromPointer,
  writeSidebarWidth,
} from "./chrome/sidebar.js";
import { createFileTree, clampTreeWidth, type TreeCommands } from "./explorer/file-tree.js";
import { createSearchPanel } from "./explorer/search-panel.js";
import { visibleBreadcrumbTargets } from "./explorer/tree-model.js";
import { createCodeView } from "./preview/code-view.js";
import { viewKind } from "./preview/editor-spec.js";
import type { PreviewCommands } from "./preview/preview-nav.js";
import { type FileState, type FileStore } from "./store.js";
import { WORKBENCH_CSS } from "./styles.generated.js";
import { followWorkspaceEvents } from "./workspace-events.js";

type ReactNs = typeof import("react");

type SlotContext = {
  slots: {
    inject(name: string, factory: () => unknown): void;
    register(slot: Record<string, unknown>, component: unknown): unknown;
  };
};

type ToolCallViewProps = {
  toolName: string;
  block?: unknown;
};

function savedSidebarWidth(): number {
  try {
    return readSidebarWidth(window.localStorage);
  } catch {
    return DEFAULT_SIDEBAR_WIDTH;
  }
}

function toolLabelKey(name: string) {
  if (name === "read") return "toolRead" as const;
  if (name === "edit") return "toolEdit" as const;
  return "toolWrite" as const;
}

export function createWorkbenchUi(React: ReactNs, store: FileStore, i18n: LocaleStore) {
  const h = React.createElement;
  const { Fragment } = React;
  const CodeView = createCodeView(React, i18n);
  const SearchPanel = createSearchPanel(React, store, i18n);
  const { WorkspaceTreePanel, readTreeWidth, writeTreeWidth } = createFileTree(React, store, i18n);

  function useFileState(): FileState {
    return React.useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot);
  }

  function useLocale() {
    const locale = React.useSyncExternalStore(i18n.subscribe, i18n.getSnapshot, i18n.getSnapshot);
    return { locale, t: i18n.t, setLocale: i18n.setLocale };
  }

  function FileDrawer() {
    const state = useFileState();
    const { t } = useLocale();
    const [width, setWidth] = React.useState(savedSidebarWidth);
    const [treeWidth, setTreeWidth] = React.useState(readTreeWidth);
    const [treeVisible, setTreeVisible] = React.useState(true);
    const [revealPath, setRevealPath] = React.useState("");
    const [copied, setCopied] = React.useState(false);
    const [pathCopied, setPathCopied] = React.useState(false);
    const [searchOpen, setSearchOpen] = React.useState(false);
    const previewCommands = React.useRef<PreviewCommands | null>(null);
    const treeCommands = React.useRef<TreeCommands | null>(null);
    const sidebarRef = React.useRef<HTMLElement | null>(null);

    const setTreeOpen = (next: boolean) => {
      setTreeVisible(next);
    };

    const showTreeAt = (path: string) => {
      setTreeOpen(true);
      setRevealPath(path);
    };

    React.useEffect(() => {
      const onKey = (event: KeyboardEvent) => {
        const action = shortcutAction(event, state);
        if (!action) return;
        if (action.type === "search") {
          event.preventDefault();
          if (!state.visible) store.show();
          setSearchOpen(true);
          return;
        }
        if (action.type === "toggle") {
          event.preventDefault();
          if (state.visible) store.hide();
          else store.show();
          return;
        }
        if (action.type === "toggleTree") {
          event.preventDefault();
          if (!state.visible) store.show();
          setTreeVisible((current) => !current);
          return;
        }
        if (action.type === "find") {
          if (!(event.target instanceof Node) || !sidebarRef.current?.contains(event.target)) return;
          event.preventDefault();
          previewCommands.current?.find();
          return;
        }
        if (action.type === "gotoLine") {
          if (!(event.target instanceof Node) || !sidebarRef.current?.contains(event.target)) return;
          event.preventDefault();
          previewCommands.current?.goToLine();
          return;
        }
        event.preventDefault();
        if (action.type === "hide") {
          if (treeCommands.current?.consumeEscape()) return;
          if (searchOpen) setSearchOpen(false);
          else store.hide();
        }
        else if (action.type === "close") store.close(action.path);
        else void store.activate(action.path);
      };
      window.addEventListener("keydown", onKey);
      return () => window.removeEventListener("keydown", onKey);
    }, [state.visible, state.active, state.open, searchOpen]);

    React.useEffect(() => followWorkspaceEvents(() => {
      store.noteDiskChange();
      if (store.getSnapshot().active) void store.reload();
    }), []);

    React.useEffect(() => {
      document.body.classList.toggle("dsh-wb-sidebar-open", state.visible);
      document.body.style.setProperty("--dsh-wb-sidebar-width", `${width}px`);
      writeSidebarWidth(window.localStorage, width);
      return () => {
        document.body.classList.remove("dsh-wb-sidebar-open");
      };
    }, [state.visible, width]);

    const resizeStart = (event: React.PointerEvent<HTMLDivElement>) => {
      event.preventDefault();
      const onMove = (move: PointerEvent) => {
        setWidth(sidebarWidthFromPointer(move.clientX, window.innerWidth));
      };
      const onUp = () => {
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("pointerup", onUp);
      };
      window.addEventListener("pointermove", onMove);
      window.addEventListener("pointerup", onUp, { once: true });
    };

    if (!state.visible) return null;

    const payload = state.payload;
    const lineCount = payload?.content.split("\n").length ?? 0;
    const meta = !state.path
      ? t("workspaceTitle")
      : state.loading
      ? t("reading")
      : state.error
        ? t("readError")
        : t(payload && viewKind(payload.source) === "diff" ? "linesDiff" : "linesWorkspace", { count: lineCount });

    const node = (
      <>
        <style>{WORKBENCH_CSS}</style>
        <aside ref={sidebarRef} className="dsh-wb-sidebar" style={{ width: `${width}px` }} aria-label={t("ariaWorkspace")}>
          <div
            className="dsh-wb-resize-handle"
            role="separator"
            aria-label={t("resize")}
            aria-orientation="vertical"
            aria-valuemin={MIN_SIDEBAR_WIDTH}
            aria-valuemax={MAX_SIDEBAR_WIDTH}
            aria-valuenow={width}
            tabIndex={0}
            title={t("resetWidth")}
            onPointerDown={resizeStart}
            onDoubleClick={() => setWidth(DEFAULT_SIDEBAR_WIDTH)}
            onKeyDown={(event) => {
              if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
              event.preventDefault();
              setWidth((current) => sidebarWidthFromKey(current, event.key));
            }}
          />
          {searchOpen ? <SearchPanel onClose={() => setSearchOpen(false)} /> : null}
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
                  <Icon name={treeVisible ? "panelClose" : "panelOpen"} />
                </button>
                <button
                  className="dsh-wb-button dsh-wb-icon-button"
                  type="button"
                  aria-label={t("refresh")}
                  title={t("refresh")}
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
                  <Icon name="copy" />
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
                  <Icon name="copy" />
                </button>
                <span className="dsh-wb-meta">{meta}</span>
              </nav>
            ) : null}
          <div className={`dsh-wb-main${treeVisible ? "" : " is-tree-hidden"}`}>
            <main className="dsh-wb-code">
              {state.path ? <CodeView state={state} commandsRef={previewCommands} /> : <div className="dsh-wb-empty"><div className="dsh-wb-empty-icon"><EmptyFileIcon /></div><strong>{t("openFile")}</strong><span>{t("selectFile")}</span></div>}
            </main>
            {treeVisible ? (
              <WorkspaceTreePanel
                width={treeWidth}
                revealPath={revealPath}
                commandsRef={treeCommands}
                onResize={(next) => {
                  const value = clampTreeWidth(next);
                  setTreeWidth(value);
                  writeTreeWidth(value);
                }}
              />
            ) : null}
          </div>
          <footer className="dsh-wb-foot">
            <span className="dsh-wb-dot" />
            <span>{t("footerBrand")}</span>
            <span>{t(payload && viewKind(payload.source) === "diff" ? "footerDiff" : "footerView")}</span>
          </footer>
        </aside>
      </>
    );
    return node;
  }

  function WorkbenchToggle() {
    const state = useFileState();
    const { t } = useLocale();
    const label = state.visible ? t("hidePanel") : t("showPanel");
    return (
      <button
        className="dsh-wb-toggle"
        type="button"
        aria-label={label}
        aria-expanded={state.visible}
        data-open={state.visible ? "true" : "false"}
        title={`${label} · ${t("shortcutHint")}`}
        onClick={() => (state.visible ? store.hide() : store.show())}
      >
        <span className="dsh-wb-toggle-icon" aria-hidden="true" />
      </button>
    );
  }

  function FileToolRow({ toolName, block }: ToolCallViewProps) {
    const { t } = useLocale();
    const filePath = filePathFromBlock(block);
    const settled = Boolean(block && typeof block === "object" && "kind" in block);
    const failed = settled && Boolean((block as { isError?: boolean }).isError);
    const status = failed ? t("statusError") : settled ? t("statusDone") : t("statusRunning");
    return (
      <div className="dsh-wb-tool-row" data-tool={toolName}>
        <style>{WORKBENCH_CSS}</style>
        <span className="dsh-wb-tool-name">{t(toolLabelKey(toolName))}</span>
        <span className="dsh-wb-tool-sep">·</span>
        {filePath ? (
          <button
            className="dsh-wb-tool-path"
            data-dsh-wb-mode={toolName === "write" || toolName === "edit" ? "diff" : "view"}
            type="button"
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              void store.open(filePath, toolName === "write" || toolName === "edit" ? "diff" : "view");
            }}
          >
            {filePath}
          </button>
        ) : (
          <span className="dsh-wb-tool-fallback">{t("file")}</span>
        )}
        <span className="dsh-wb-tool-status" data-kind={failed ? "error" : settled ? "ok" : undefined}>{status}</span>
      </div>
    );
  }

  return {
    FileDrawer,
    WorkbenchToggle,
    WorkbenchRoot() {
      return <><FileDrawer /><WorkbenchToggle /></>;
    },
    FileToolRow,
    apply(ctx: SlotContext) {
      ctx.slots.inject("tool.call.toolview", function* () {
        for (const key of FILE_TOOLS) {
          yield ctx.slots.register(
            { name: "tool.call.toolview", key, locale: "conversation", priority: -1 },
            FileToolRow,
          );
        }
      });
    },
  };
}
