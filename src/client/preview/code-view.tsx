import { useCallback, useEffect, useRef, useState } from "react";
import { createEditorExtensions, mountCodeEditor, type CodeSelection, type DiffViewMode } from "./code-mirror.js";
import { editorSpec } from "./editor-spec.js";
import { createPreviewCommands, type PreviewCommands } from "./preview-nav.js";
import type { FileState } from "../store.js";
import { saveWorkspaceFile } from "../store.js";
import { FILE_ASSET_API_PATH } from "../../shared/types.js";
import { previewKind } from "./preview-kind.js";
import { renderMarkdown } from "./markdown-preview.js";
import { hasMarkdownOutline, markdownOutline } from "./markdown-outline.js";
import { canSaveWorkspacePreview, shouldRefreshPreview } from "./preview-state.js";
import { buildReviewNoteReference, buildSelectionReference } from "./selection-reference.js";
import { Icon } from "../chrome/icons.js";
import { WorkbenchTooltip } from "../chrome/tooltip.js";
import DOMPurify from "dompurify";
import { createPortal } from "../react-bridge.js";

import { useWorkbenchServices } from "../workbench/runtime.js";

type SaveState = "idle" | "saving" | "saved" | "failed";

export function CodeView({ state, commandsRef, sessionId, diffView }: {
  state: FileState;
  commandsRef?: { current: PreviewCommands | null };
  sessionId?: string;
  diffView?: DiffViewMode;
}) {
  const { i18n, references, store } = useWorkbenchServices();
  const t = i18n.t;
  const hostRef = useRef<HTMLDivElement | null>(null);
  const editorRef = useRef<ReturnType<typeof mountCodeEditor> | null>(null);
  const markdownRef = useRef<HTMLElement | null>(null);
  const saveRef = useRef<() => void>(() => {});
  const [markdownSource, setMarkdownSource] = useState(false);
  const [outlineOpen, setOutlineOpen] = useState(false);
  const [selection, setSelection] = useState<CodeSelection | null>(null);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const [saveState, setSaveState] = useState<SaveState>("idle");
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
    setOutlineOpen(false);
    setSelection(null);
    setEditing(false);
    setSaveState("idle");
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
  const onDocumentChange = useCallback((next: string) => {
    setDraft(next);
    setSaveState("idle");
    setSaveError("");
  }, []);
  const payload = state.payload;
  const kind = payload ? previewKind(payload.path) : "code";
  const isMarkdown = payload != null && kind === "markdown" && payload.source !== "dsh-write";
  const canEdit = payload != null && payload.source === "workspace" && kind !== "image";
  const dirty = editing && payload != null && draft !== payload.content;

  const startEditing = () => {
    if (!payload) return;
    setDraft(payload.content);
    setEditing(true);
    setSaveState("idle");
    setSaveError("");
    if (isMarkdown) setMarkdownSource(true);
  };
  const cancelEditing = () => {
    if (!payload) return;
    setDraft(payload.content);
    setEditing(false);
    setSaveState("idle");
    setSaveError("");
    if (isMarkdown) setMarkdownSource(false);
  };
  const save = async () => {
    if (!payload || !canSaveWorkspacePreview(payload.source, kind, editing) || saveState === "saving") return;
    setSaveState("saving");
    try {
      await saveWorkspaceFile(payload.path, draft, payload.content);
      setEditing(false);
      setSaveState("saved");
      setSaveError("");
      if (isMarkdown) setMarkdownSource(false);
      window.dispatchEvent(new Event("dsh-wb-workspace-change"));
      await store.reload();
    } catch (error) {
      setSaveState("failed");
      setSaveError(error instanceof Error ? error.message : "read_failed");
    }
  };
  saveRef.current = () => { void save(); };
  const refresh = () => {
    if (!shouldRefreshPreview(dirty, !dirty || window.confirm(t("refreshUnsavedConfirm")))) return;
    setEditing(false);
    setSaveState("idle");
    setSaveError("");
    if (isMarkdown) setMarkdownSource(false);
    void store.reload();
  };
  useEffect(() => {
    const host = hostRef.current;
    if (!host || !payload || state.loading || state.error) return undefined;
    const spec = editorSpec(payload);
    const resolvedDiffView = spec.original !== null && (spec.original === "" || payload.content === "") ? "unified" : diffView;
    const editor = mountCodeEditor(host, editing ? draft : payload.content, createEditorExtensions({
      language: spec.language,
      original: spec.original,
      diffView: resolvedDiffView,
      onSelectionChange,
      onDocumentChange,
      onSave: editing && canEdit ? () => saveRef.current() : undefined,
      editable: editing,
    }), { language: spec.language, original: spec.original, diffView: resolvedDiffView });
    editorRef.current = editor;
    if (commandsRef) commandsRef.current = createPreviewCommands(editor.view, editing && canEdit ? () => saveRef.current() : undefined);
    if (state.line) createPreviewCommands(editor.view).revealLine(state.line);
    return () => {
      editor.destroy();
      editorRef.current = null;
      if (commandsRef) commandsRef.current = null;
    };
  }, [payload, state.loading, state.error, markdownSource, editing, diffView, onSelectionChange, onDocumentChange, canEdit, commandsRef, state.line]);

  useEffect(() => {
    if (!state.line || !editorRef.current) return;
    createPreviewCommands(editorRef.current.view).revealLine(state.line);
  }, [state.line, payload]);

  useEffect(() => {
    if (!outlineOpen) return undefined;
    const close = (event: KeyboardEvent) => { if (event.key === "Escape") setOutlineOpen(false); };
    document.addEventListener("keydown", close);
    return () => document.removeEventListener("keydown", close);
  }, [outlineOpen]);

  if (state.loading) return <div className="dsh-wb-empty"><div><strong>{t("loadingTitle")}</strong><span>{t("loadingHint")}</span></div></div>;
  if (state.error === "not_previewable") return <div className="dsh-wb-empty dsh-wb-preview-unavailable"><strong>{t("not_previewable")}</strong><span>{t("notPreviewableHint")}</span></div>;
  if (state.error === "file_too_large") return <div className="dsh-wb-empty dsh-wb-preview-unavailable"><strong>{t("file_too_large")}</strong><span>{t("fileTooLargeHint")}</span></div>;
  if (state.error) return <div className="dsh-wb-error">{t(state.error)}</div>;
  if (!payload) return null;

  const outline = isMarkdown ? markdownOutline(editing ? draft : payload.content) : [];
  const previewContent = editing ? draft : payload.content;
  const toolbar = isMarkdown || canEdit ? (
    <div className="dsh-wb-preview-toolbar">
      {isMarkdown ? <div className="dsh-wb-preview-modes" role="group" aria-label={t("viewOptions")}>
        <button className={`dsh-wb-preview-mode${!markdownSource ? " is-active" : ""}`} type="button" aria-pressed={!markdownSource} onClick={() => setMarkdownSource(false)}>{t("preview")}</button>
        <button className={`dsh-wb-preview-mode${markdownSource ? " is-active" : ""}`} type="button" aria-pressed={markdownSource} onClick={() => setMarkdownSource(true)}>{t("source")}</button>
      </div> : null}
      <div className="dsh-wb-preview-actions">
        {editing ? <>
          {dirty ? <span className="dsh-wb-dirty-dot" title={t("unsavedChanges")} aria-label={t("unsavedChanges")} /> : null}
          <button className="dsh-wb-preview-text-action" type="button" onClick={cancelEditing}>{t("cancelEdit")}</button>
          <button className="dsh-wb-preview-text-action is-primary" type="button" disabled={saveState === "saving"} onClick={() => void save()}>{t("saveFile")}</button>
        </> : canEdit ? <WorkbenchTooltip label={t("editFile")}><button className="dsh-wb-button dsh-wb-icon-button dsh-wb-preview-icon" type="button" aria-label={t("editFile")} onClick={startEditing}><Icon name="edit" /></button></WorkbenchTooltip> : null}
        {canEdit ? <WorkbenchTooltip label={t("refreshFile")}><button className="dsh-wb-button dsh-wb-icon-button dsh-wb-preview-icon" type="button" aria-label={t("refreshFile")} onClick={refresh}><Icon name="refresh" /></button></WorkbenchTooltip> : null}
        {saveState === "saving" ? <span className="dsh-wb-preview-status">{t("savingFile")}</span> : null}
        {saveState === "saved" ? <span className="dsh-wb-preview-status">{t("fileSaved")}</span> : null}
        {saveState === "failed" ? <span className="dsh-wb-preview-status is-error">{t("saveFile")}</span> : null}
      </div>
    </div>
  ) : null;

  if (kind === "image" && payload.source !== "dsh-write") return <div className="dsh-wb-preview-shell">
    {toolbar}
    <div className="dsh-wb-image-preview"><img src={`${FILE_ASSET_API_PATH}?path=${encodeURIComponent(payload.path)}&revision=${payload.revision}`} alt={payload.path} /></div>
  </div>;

  if (isMarkdown && !markdownSource) {
    return <div className="dsh-wb-preview-shell">
      {toolbar}
      <article ref={markdownRef} className="dsh-wb-markdown-preview" dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(renderMarkdown(previewContent, payload.path), { USE_PROFILES: { html: true } }) }} />
      {hasMarkdownOutline(outline) ? <div className="dsh-wb-markdown-outline">
        {outlineOpen ? <div className="dsh-wb-markdown-outline-menu" role="menu">
          {outline.map((item, index) => <button key={`${item.level}-${item.label}-${index}`} type="button" className="dsh-wb-markdown-outline-item" style={{ paddingLeft: `${8 + Math.max(0, item.level - 1) * 10}px` }} onClick={() => {
            const target = markdownRef.current?.querySelectorAll("h1, h2, h3, h4, h5, h6")[index] as HTMLElement | undefined;
            target?.scrollIntoView({ behavior: "smooth", block: "start" });
            target?.classList.add("dsh-wb-markdown-heading-flash");
            window.setTimeout(() => target?.classList.remove("dsh-wb-markdown-heading-flash"), 1200);
            setOutlineOpen(false);
          }}><span>{item.label}</span></button>)}
        </div> : null}
        <WorkbenchTooltip label={t("markdownOutline")}><button className="dsh-wb-button dsh-wb-icon-button dsh-wb-outline-button" type="button" aria-label={t("markdownOutline")} aria-expanded={outlineOpen} onClick={() => setOutlineOpen((open) => !open)}><Icon name="outline" /></button></WorkbenchTooltip>
      </div> : null}
      {saveError ? <div className="dsh-wb-error">{t(saveError)}</div> : null}
    </div>;
  }

  const selectionReference = !editing && selection ? buildSelectionReference(payload.path, payload.content, selection.from, selection.to) : null;
  const reviewNoteReference = !editing && selection && payload.source === "dsh-write" ? buildReviewNoteReference(payload.path, payload.content, selection.from, selection.to) : null;
  return <div className="dsh-wb-preview-shell">
    {toolbar}
    <div className="dsh-wb-cm" ref={hostRef} />
    {saveError ? <div className="dsh-wb-error">{t(saveError)}</div> : null}
    {selection && selectionReference && references ? createPortal(
      <div className="dsh-wb-selection-actions" style={{ left: selection.left, top: selection.top }}>
        <button className="dsh-wb-selection-reference" type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => { if (references.appendText(selectionReference, sessionId)) setSelection(null); }}>{t("referenceSelectionAction")}</button>
        {reviewNoteReference ? <button className="dsh-wb-selection-reference" type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => { if (references.appendText(t("reviewNoteTemplate", { reference: reviewNoteReference }), sessionId)) setSelection(null); }}>{t("addReviewNote")}</button> : null}
      </div>, document.body,
    ) : null}
  </div>;
}
