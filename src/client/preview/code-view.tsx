import { useEffect, useRef, useState } from "react";
import { createEditorExtensions, mountCodeEditor } from "./code-mirror.js";
import { editorSpec } from "./editor-spec.js";
import { createPreviewCommands, type PreviewCommands } from "./preview-nav.js";
import type { FileState } from "../store.js";
import { FILE_ASSET_API_PATH } from "../../shared/types.js";
import { previewKind } from "./preview-kind.js";
import { renderMarkdown } from "./markdown-preview.js";
import DOMPurify from "dompurify";

import { useWorkbenchServices } from "../workbench/runtime.js";

export function CodeView({
    state,
    commandsRef,
  }: {
    state: FileState;
    commandsRef?: { current: PreviewCommands | null };
  }) {
    const { i18n } = useWorkbenchServices();
    const t = i18n.t;
    const hostRef = useRef<HTMLDivElement | null>(null);
    const editorRef = useRef<ReturnType<typeof mountCodeEditor> | null>(null);
    const [markdownSource, setMarkdownSource] = useState(false);
    const path = state.payload?.path;
    const [seenPath, setSeenPath] = useState(path);
    if (path !== seenPath) {
      setSeenPath(path);
      setMarkdownSource(false);
    }

    useEffect(() => {
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
    }, [state.payload, state.loading, state.error, markdownSource]);

    useEffect(() => {
      if (!state.line || !editorRef.current) return;
      createPreviewCommands(editorRef.current.view).revealLine(state.line);
    }, [state.line, state.payload]);

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
    const kind = previewKind(state.payload.path);
    const isMarkdown = kind === "markdown" && state.payload.source !== "dsh-write";
    const toggle = isMarkdown ? (
      <button
        className="dsh-wb-markdown-toggle"
        type="button"
        onClick={() => setMarkdownSource((value) => !value)}
      >
        {t(markdownSource ? "markdownPreview" : "markdownSource")}
      </button>
    ) : null;
    if (kind === "image" && state.payload.source !== "dsh-write") {
      return (
        <div className="dsh-wb-image-preview">
          <img
            src={`${FILE_ASSET_API_PATH}?path=${encodeURIComponent(state.payload.path)}&revision=${state.payload.revision}`}
            alt={state.payload.path}
          />
        </div>
      );
    }
    if (isMarkdown && !markdownSource) {
      return (
        <div className="dsh-wb-preview-shell">
          <div className="dsh-wb-preview-toolbar">{toggle}</div>
          <article
            className="dsh-wb-markdown-preview"
            dangerouslySetInnerHTML={{
              __html: DOMPurify.sanitize(renderMarkdown(state.payload.content, state.payload.path), {
                USE_PROFILES: { html: true },
              }),
            }}
          />
        </div>
      );
    }
    return (
      <div className="dsh-wb-preview-shell">
        {toggle ? <div className="dsh-wb-preview-toolbar">{toggle}</div> : null}
        <div className="dsh-wb-cm" ref={hostRef} />
      </div>
    );
}
