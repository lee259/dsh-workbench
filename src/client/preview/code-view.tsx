import { useCallback, useEffect, useRef, useState } from "react";
import { createEditorExtensions, mountCodeEditor, type CodeSelection, type DiffViewMode } from "./code-mirror.js";
import { editorSpec } from "./editor-spec.js";
import { createPreviewCommands, type PreviewCommands } from "./preview-nav.js";
import type { FileState } from "../store.js";
import { saveWorkspaceFile } from "../store.js";
import { FILE_ASSET_API_PATH } from "../../shared/types.js";
import { previewKind } from "./preview-kind.js";
import { renderMarkdown } from "./markdown-preview.js";
import { buildReviewNoteReference, buildSelectionReference } from "./selection-reference.js";
import DOMPurify from "dompurify";
import { createPortal } from "../react-bridge.js";

import { useWorkbenchServices } from "../workbench/runtime.js";

export function CodeView({
    state,
    commandsRef,
    sessionId,
    diffView,
  }: {
    state: FileState;
    commandsRef?: { current: PreviewCommands | null };
    sessionId?: string;
    diffView?: DiffViewMode;
  }) {
    const { i18n, references, store } = useWorkbenchServices();
    const t = i18n.t;
    const hostRef = useRef<HTMLDivElement | null>(null);
    const editorRef = useRef<ReturnType<typeof mountCodeEditor> | null>(null);
    const [markdownSource, setMarkdownSource] = useState(false);
    const [selection, setSelection] = useState<CodeSelection | null>(null);
    const [editing, setEditing] = useState(false);
    const [draft, setDraft] = useState("");
    const [saveError, setSaveError] = useState("");
    const path = state.payload?.path;
    const revision = state.payload?.revision;
    const content = state.payload?.content;
    const [seenPath, setSeenPath] = useState(path);
    const [seenRevision, setSeenRevision] = useState(revision);
    const [seenContent, setSeenContent] = useState(content);
    if (path !== seenPath) {
      setSeenPath(path);
      setMarkdownSource(false);
      setSelection(null);
      setEditing(false);
      setSaveError("");
    }
    if (revision !== seenRevision) {
      setSeenRevision(revision);
      setSelection(null);
    }
    if (content !== seenContent) {
      setSeenContent(content);
      setSelection(null);
    }
    if (state.loading && selection) setSelection(null);

    const onSelectionChange = useCallback((next: CodeSelection | null) => setSelection(next), []);
    const onDocumentChange = useCallback((next: string) => setDraft(next), []);

    useEffect(() => {
      const host = hostRef.current;
      const payload = state.payload;
      if (!host || !payload || state.loading || state.error) return undefined;
      const spec = editorSpec(payload);
      const resolvedDiffView = spec.original !== null && (spec.original === "" || payload.content === "") ? "unified" : diffView;
      const editor = mountCodeEditor(host, editing ? draft : payload.content, createEditorExtensions({
        language: spec.language,
        original: spec.original,
        diffView: resolvedDiffView,
        onSelectionChange,
        onDocumentChange,
        editable: editing,
      }), { language: spec.language, original: spec.original, diffView: resolvedDiffView });
      editorRef.current = editor;
      if (commandsRef) commandsRef.current = createPreviewCommands(editor.view);
      if (state.line) createPreviewCommands(editor.view).revealLine(state.line);
      return () => {
        editor.destroy();
        editorRef.current = null;
        if (commandsRef) commandsRef.current = null;
      };
    }, [state.payload, state.loading, state.error, markdownSource, editing, diffView, onSelectionChange, onDocumentChange]);

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
    const payload = state.payload;
    const kind = previewKind(payload.path);
    const isMarkdown = kind === "markdown" && payload.source !== "dsh-write";
    const canEdit = payload.source === "workspace" && kind !== "image";
    const save = async () => {
      try {
        await saveWorkspaceFile(payload.path, draft, payload.content);
        setEditing(false);
        setSaveError("");
        window.dispatchEvent(new Event("dsh-wb-workspace-change"));
        await store.reload();
      } catch (error) {
        setSaveError(error instanceof Error ? error.message : "read_failed");
      }
    };
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
    if (isMarkdown && !markdownSource && !editing) {
      return (
        <div className="dsh-wb-preview-shell">
          <div className="dsh-wb-preview-toolbar">
            {canEdit ? <button className="dsh-wb-markdown-toggle" type="button" onClick={() => { setDraft(payload.content); setEditing(true); }}>{t("editFile")}</button> : null}
            {toggle}
          </div>
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
    const selectionReference = !editing && selection
      ? buildSelectionReference(state.payload.path, state.payload.content, selection.from, selection.to)
      : null;
    const reviewNoteReference = !editing && selection && payload.source === "dsh-write"
      ? buildReviewNoteReference(payload.path, payload.content, selection.from, selection.to)
      : null;
    return (
      <div className="dsh-wb-preview-shell">
        {toggle || canEdit ? <div className="dsh-wb-preview-toolbar">
          {canEdit ? (editing ? <>
            <button className="dsh-wb-markdown-toggle" type="button" onClick={() => { setEditing(false); setSaveError(""); }}>{t("cancelEdit")}</button>
            <button className="dsh-wb-markdown-toggle" type="button" onClick={() => void save()}>{t("saveFile")}</button>
          </> : <button className="dsh-wb-markdown-toggle" type="button" onClick={() => { setDraft(state.payload?.content ?? ""); setEditing(true); }}>{t("editFile")}</button>) : null}
          {toggle}
        </div> : null}
        <div className="dsh-wb-cm" ref={hostRef} />
        {saveError ? <div className="dsh-wb-error">{t(saveError)}</div> : null}
        {selection && selectionReference && references ? createPortal(
          <div className="dsh-wb-selection-actions" style={{ left: selection.left, top: selection.top }}>
            <button
              className="dsh-wb-selection-reference"
              type="button"
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => {
                if (references.appendText(selectionReference, sessionId)) setSelection(null);
              }}
            >
              {t("referenceSelectionAction")}
            </button>
            {reviewNoteReference ? <button
              className="dsh-wb-selection-reference"
              type="button"
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => {
                if (references.appendText(t("reviewNoteTemplate", { reference: reviewNoteReference }), sessionId)) setSelection(null);
              }}
            >
              {t("addReviewNote")}
            </button> : null}
          </div>,
          document.body,
        ) : null}
      </div>
    );
}
