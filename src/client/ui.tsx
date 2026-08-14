import type { LocaleStore } from "../shared/i18n.js";
import { FILE_TOOLS } from "../shared/types.js";
import { createEditorExtensions, mountCodeEditor } from "./code-mirror.js";
import { editorSpec, viewKind } from "./editor-spec.js";
import { WORKBENCH_CSS } from "./styles.generated.js";
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
    React.useEffect(() => {
      if (!state.path) return undefined;
      const onKey = (event: KeyboardEvent) => {
        if (event.key === "Escape") store.close();
      };
      window.addEventListener("keydown", onKey);
      return () => window.removeEventListener("keydown", onKey);
    }, [state.path]);

    React.useEffect(() => {
      document.body.classList.toggle("dsh-wb-sidebar-open", Boolean(state.path));
      return () => document.body.classList.remove("dsh-wb-sidebar-open");
    }, [state.path]);

    if (!state.path) return null;

    const payload = state.payload;
    const lineCount = payload?.content.split("\n").length ?? 0;
    const meta = state.loading
      ? t("reading")
      : state.error
        ? t("readError")
        : t(payload && viewKind(payload.source) === "diff" ? "linesDiff" : "linesWorkspace", { count: lineCount });

    const node = (
      <>
        <style>{WORKBENCH_CSS}</style>
        <aside className="dsh-wb-sidebar" aria-label={t("ariaWorkspace")}>
          <header className="dsh-wb-head">
            <div className="dsh-wb-icon">{fileExtension(state.path)}</div>
            <div className="dsh-wb-title">
              <strong>{state.path.split("/").pop() || t("workspaceTitle")}</strong>
              <span>{state.path}</span>
            </div>
            <div className="dsh-wb-actions">
              <button
                className="dsh-wb-button dsh-wb-icon-button"
                type="button"
                title={t("copy")}
                onClick={() => payload && navigator.clipboard?.writeText(payload.content)}
              >
                □
              </button>
              <button className="dsh-wb-button dsh-wb-icon-button" type="button" title={t("close")} onClick={() => store.close()}>
                ×
              </button>
            </div>
          </header>
          <div className="dsh-wb-meta-bar">
            <span className="dsh-wb-meta">{meta}</span>
          </div>
          <main className="dsh-wb-code">
            <CodeView state={state} />
          </main>
          <footer className="dsh-wb-foot">
            <span className="dsh-wb-dot" />
            <span>DSH Workbench</span>
            <span>{t("footerHint")}</span>
          </footer>
        </aside>
      </>
    );
    return node;
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
            type="button"
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              void store.open(filePath);
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
