import type { LocaleStore } from "../../shared/i18n.js";
import { createEditorExtensions, mountCodeEditor } from "./code-mirror.js";
import { editorSpec } from "./editor-spec.js";
import { createPreviewCommands, type PreviewCommands } from "./preview-nav.js";
import type { FileState } from "../store.js";

type ReactNs = typeof import("react");

export function createCodeView(React: ReactNs, i18n: LocaleStore) {
  const h = React.createElement;
  function CodeView({
    state,
    commandsRef,
  }: {
    state: FileState;
    commandsRef?: { current: PreviewCommands | null };
  }) {
    const t = i18n.t;
    React.useSyncExternalStore(i18n.subscribe, i18n.getSnapshot, i18n.getSnapshot);
    const hostRef = React.useRef<HTMLDivElement | null>(null);
    const editorRef = React.useRef<ReturnType<typeof mountCodeEditor> | null>(null);

    React.useEffect(() => {
      const host = hostRef.current;
      const payload = state.payload;
      if (!host || !payload || state.loading || state.error) return undefined;
      const spec = editorSpec(payload);
      const editor = mountCodeEditor(host, payload.content, createEditorExtensions({ language: spec.language, original: spec.original }));
      editorRef.current = editor;
      if (commandsRef) commandsRef.current = createPreviewCommands(editor.view);
      if (state.line) createPreviewCommands(editor.view).revealLine(state.line);
      return () => {
        editor.destroy();
        editorRef.current = null;
        if (commandsRef) commandsRef.current = null;
      };
    }, [state.payload, state.loading, state.error]);

    React.useEffect(() => {
      if (!state.line || !editorRef.current) return;
      createPreviewCommands(editorRef.current.view).revealLine(state.line);
    }, [state.line, state.payload]);

    if (state.loading) return <div className="dsh-wb-empty"><div><strong>{t("loadingTitle")}</strong><span>{t("loadingHint")}</span></div></div>;
    if (state.error) return <div className="dsh-wb-error">{t(state.error)}</div>;
    if (!state.payload) return null;
    return <div className="dsh-wb-cm" ref={hostRef} />;
  }
  return CodeView;
}
