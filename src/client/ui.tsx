import type { LocaleStore } from "../shared/i18n.js";
import { FILE_TOOLS } from "../shared/types.js";
import { createEditorExtensions, mountCodeEditor } from "./code-mirror.js";
import { editorSpec, viewKind } from "./editor-spec.js";
import { WORKBENCH_CSS } from "./styles.generated.js";
import {
  DEFAULT_SIDEBAR_WIDTH,
  MAX_SIDEBAR_WIDTH,
  MIN_SIDEBAR_WIDTH,
  readSidebarWidth,
  sidebarWidthFromKey,
  sidebarWidthFromPointer,
  writeSidebarWidth,
} from "./sidebar.js";
import { shortcutAction } from "./shortcuts.js";
import type { FileState, FileStore } from "./store.js";
import { filePathFromBlock } from "./tool-path.js";

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

function fileExtension(path: string): string {
  const value = path.split(".").pop()?.toUpperCase() || "FILE";
  return value.length > 4 ? "FILE" : value;
}

function toolLabelKey(name: string) {
  if (name === "read") return "toolRead" as const;
  if (name === "edit") return "toolEdit" as const;
  return "toolWrite" as const;
}

export function createWorkbenchUi(React: ReactNs, store: FileStore, i18n: LocaleStore) {
  const h = React.createElement;
  const { Fragment } = React;

  function useFileState(): FileState {
    return React.useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot);
  }

  function useLocale() {
    const locale = React.useSyncExternalStore(i18n.subscribe, i18n.getSnapshot, i18n.getSnapshot);
    return { locale, t: i18n.t, setLocale: i18n.setLocale };
  }

  function CodeView({ state }: { state: FileState }) {
    const { t } = useLocale();
    const hostRef = React.useRef<HTMLDivElement | null>(null);
    React.useEffect(() => {
      const host = hostRef.current;
      const payload = state.payload;
      if (!host || !payload || state.loading || state.error) return undefined;
      const spec = editorSpec(payload);
      const editor = mountCodeEditor(
        host,
        payload.content,
        createEditorExtensions({ language: spec.language, original: spec.original }),
      );
      return () => editor.destroy();
    }, [state.payload, state.loading, state.error]);
    if (state.loading) {
      return (
        <div className="dsh-wb-empty">
          <div>
            <strong>{t("loadingTitle")}</strong>
            <span>{t("loadingHint")}</span>
          </div>
        </div>
      );
    }
    if (state.error) return <div className="dsh-wb-error">{t(state.error)}</div>;
    if (!state.payload) return null;
    return <div className="dsh-wb-cm" ref={hostRef} />;
  }

  function FileDrawer() {
    const state = useFileState();
    const { t } = useLocale();
    const [width, setWidth] = React.useState(savedSidebarWidth);
    const [copied, setCopied] = React.useState(false);
    const [pathCopied, setPathCopied] = React.useState(false);
    React.useEffect(() => {
      const onKey = (event: KeyboardEvent) => {
        const action = shortcutAction(event, state);
        if (!action) return;
        if (action.type === "toggle") {
          event.preventDefault();
          if (state.visible) store.hide();
          else store.show();
          return;
        }
        event.preventDefault();
        if (action.type === "hide") store.hide();
        else if (action.type === "close") store.close(action.path);
        else void store.activate(action.path);
      };
      window.addEventListener("keydown", onKey);
      return () => window.removeEventListener("keydown", onKey);
    }, [state.visible]);

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
        <aside className="dsh-wb-sidebar" style={{ width: `${width}px` }} aria-label={t("ariaWorkspace")}>
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
          <header className="dsh-wb-head">
            <div className="dsh-wb-icon">{state.path ? fileExtension(state.path) : "DSH"}</div>
            <div className="dsh-wb-title">
              <strong>{state.path?.split("/").pop() || t("workspaceTitle")}</strong>
              {state.path ? (
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
                  {state.path}
                </button>
              ) : null}
            </div>
            <div className="dsh-wb-actions">
              <button
                  className="dsh-wb-button dsh-wb-icon-button"
                  type="button"
                  aria-label={t("refresh")}
                  title={t("refresh")}
                onClick={() => void store.reload()}
              >
                ↻
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
                {copied ? "✓" : "□"}
              </button>
              <button className="dsh-wb-button dsh-wb-text-button dsh-wb-close-button" type="button" aria-label={t("close")} title={t("hidePanel")} onClick={() => store.hide()}>
                {t("close")}
              </button>
            </div>
          </header>
          {state.open.length > 0 ? (
            <nav className="dsh-wb-tabs" aria-label={t("openFiles")} role="tablist">
              {state.open.map((path) => (
                <div className={`dsh-wb-tab${path === state.active ? " is-active" : ""}`} key={path} role="presentation">
                  <button className="dsh-wb-tab-name" type="button" role="tab" aria-selected={path === state.active} title={path} onClick={() => void store.activate(path)}>
                    {path.split("/").pop() || path}
                  </button>
                  <button className="dsh-wb-tab-close" type="button" title={t("closeFile")} aria-label={`${t("closeFile")}: ${path}`} onClick={() => store.close(path)}>
                    ×
                  </button>
                </div>
              ))}
            </nav>
          ) : null}
          <div className="dsh-wb-meta-bar">
            <span className="dsh-wb-meta">{meta}</span>
          </div>
          <main className="dsh-wb-code">
            {state.path ? <CodeView state={state} /> : <div className="dsh-wb-empty">{t("selectFile")}</div>}
          </main>
          <footer className="dsh-wb-foot">
            <span className="dsh-wb-dot" />
            <span>DSH Workbench</span>
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
    if (state.visible) return null;
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
