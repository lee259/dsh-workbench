import { defaultKeymap, history, historyKeymap } from "@codemirror/commands";
import { css } from "@codemirror/lang-css";
import { html } from "@codemirror/lang-html";
import { javascript } from "@codemirror/lang-javascript";
import { json } from "@codemirror/lang-json";
import { markdown } from "@codemirror/lang-markdown";
import { python } from "@codemirror/lang-python";
import { xml } from "@codemirror/lang-xml";
import { HighlightStyle, StreamLanguage, ensureSyntaxTree, foldGutter, foldKeymap, syntaxHighlighting, syntaxTree } from "@codemirror/language";
import { c, cpp, csharp, dart, java, kotlin, scala } from "@codemirror/legacy-modes/mode/clike";
import { diff } from "@codemirror/legacy-modes/mode/diff";
import { dockerFile } from "@codemirror/legacy-modes/mode/dockerfile";
import { go } from "@codemirror/legacy-modes/mode/go";
import { julia } from "@codemirror/legacy-modes/mode/julia";
import { lua } from "@codemirror/legacy-modes/mode/lua";
import { octave } from "@codemirror/legacy-modes/mode/octave";
import { r } from "@codemirror/legacy-modes/mode/r";
import { swift } from "@codemirror/legacy-modes/mode/swift";
import { properties } from "@codemirror/legacy-modes/mode/properties";
import { ruby } from "@codemirror/legacy-modes/mode/ruby";
import { rust } from "@codemirror/legacy-modes/mode/rust";
import { shell } from "@codemirror/legacy-modes/mode/shell";
import { standardSQL } from "@codemirror/legacy-modes/mode/sql";
import { toml } from "@codemirror/legacy-modes/mode/toml";
import { yaml } from "@codemirror/legacy-modes/mode/yaml";
import { MergeView, unifiedMergeView } from "@codemirror/merge";
import { search, searchKeymap } from "@codemirror/search";
import { EditorState, StateEffect, type Extension } from "@codemirror/state";
import { EditorView, keymap, lineNumbers } from "@codemirror/view";
import { highlightTree, tagHighlighter, tags } from "@lezer/highlight";

export type CodeSelection = {
  from: number;
  to: number;
  left: number;
  top: number;
};

export type DiffViewMode = "unified" | "split";

const workbenchTheme = EditorView.theme({
  "&": {
    height: "100%",
    fontSize: "12px",
    color: "var(--dsh-wb-code-label)",
    backgroundColor: "transparent",
  },
  ".cm-scroller": {
    fontFamily: "var(--ds-font-family-code, ui-monospace, SFMono-Regular, Menlo, monospace)",
    lineHeight: "22px",
  },
  ".cm-gutters": {
    backgroundColor: "var(--dsw-alias-markdown-code-block)",
    border: "none",
    color: "var(--dsw-alias-label-tertiary)",
  },
  ".cm-content": {
    padding: "8px 0",
    color: "var(--dsh-wb-code-label)",
    caretColor: "var(--dsh-wb-code-label)",
  },
  ".cm-line": {
    color: "var(--dsh-wb-code-label)",
  },
  "&.cm-focused .cm-selectionBackground, ::selection": {
    backgroundColor: "var(--dsh-wb-code-selection-fill)",
  },
  "&.cm-focused .cm-cursor, .cm-dropCursor": {
    borderLeftColor: "var(--dsh-wb-code-label)",
  },
  ".cm-activeLine, .cm-activeLineGutter": {
    backgroundColor: "transparent",
  },
});

const workbenchHighlightStyle = HighlightStyle.define([
  { tag: tags.comment, color: "var(--dsh-wb-code-comment-label)", fontStyle: "italic" },
  { tag: [tags.keyword, tags.controlKeyword, tags.definitionKeyword, tags.operatorKeyword], color: "var(--dsh-wb-code-keyword-label)" },
  { tag: [tags.string, tags.special(tags.string), tags.regexp], color: "var(--dsh-wb-code-string-label)" },
  { tag: [tags.number, tags.bool, tags.null, tags.atom], color: "var(--dsh-wb-code-literal-label)" },
  { tag: [tags.typeName, tags.className], color: "var(--dsh-wb-code-type-label)" },
  { tag: tags.propertyName, color: "var(--dsh-wb-code-property-label)" },
  { tag: tags.function(tags.variableName), color: "var(--dsh-wb-code-function-label)" },
  { tag: tags.variableName, color: "var(--dsh-wb-code-variable-label)" },
  { tag: tags.operator, color: "var(--dsh-wb-code-operator-label)" },
  { tag: tags.tagName, color: "var(--dsh-wb-code-tag-label)" },
  { tag: tags.attributeName, color: "var(--dsh-wb-code-attribute-label)" },
  { tag: tags.heading, color: "var(--dsh-wb-code-tag-label)", fontStyle: "bold" },
  { tag: tags.emphasis, fontStyle: "italic" },
  { tag: tags.strong, fontStyle: "bold" },
  { tag: tags.link, color: "var(--dsh-wb-code-function-label)", textDecoration: "underline" },
  { tag: tags.meta, color: "var(--dsh-wb-code-meta-label)" },
  { tag: tags.invalid, color: "var(--dsh-wb-code-invalid-label)", fontStyle: "bold" },
]);

const reviewDiffHighlighter = tagHighlighter([
  { tag: tags.comment, class: "dsh-wb-code-review-token-comment" },
  { tag: [tags.keyword, tags.controlKeyword, tags.definitionKeyword, tags.operatorKeyword], class: "dsh-wb-code-review-token-keyword" },
  { tag: [tags.string, tags.special(tags.string), tags.regexp], class: "dsh-wb-code-review-token-string" },
  { tag: [tags.number, tags.bool, tags.null, tags.atom], class: "dsh-wb-code-review-token-literal" },
  { tag: [tags.typeName, tags.className], class: "dsh-wb-code-review-token-type" },
  { tag: tags.propertyName, class: "dsh-wb-code-review-token-property" },
  { tag: tags.function(tags.variableName), class: "dsh-wb-code-review-token-function" },
  { tag: tags.variableName, class: "dsh-wb-code-review-token-variable" },
  { tag: tags.operator, class: "dsh-wb-code-review-token-operator" },
  { tag: tags.tagName, class: "dsh-wb-code-review-token-tag" },
  { tag: tags.attributeName, class: "dsh-wb-code-review-token-attribute" },
  { tag: tags.heading, class: "dsh-wb-code-review-token-tag" },
  { tag: tags.emphasis, class: "dsh-wb-code-review-token-emphasis" },
  { tag: tags.strong, class: "dsh-wb-code-review-token-strong" },
  { tag: tags.link, class: "dsh-wb-code-review-token-link" },
  { tag: tags.meta, class: "dsh-wb-code-review-token-meta" },
  { tag: tags.invalid, class: "dsh-wb-code-review-token-invalid" },
]);

export type SyntaxHighlightRange = { from: number; to: number; className: string };

export function highlightSourceText(source: string, language: string | null): SyntaxHighlightRange[] {
  if (!language || !languageExtension(language).length || !source) return [];
  const state = EditorState.create({ doc: source, extensions: languageExtension(language) });
  const tree = ensureSyntaxTree(state, state.doc.length, 50) ?? syntaxTree(state);
  const ranges: SyntaxHighlightRange[] = [];
  highlightTree(tree, reviewDiffHighlighter, (from, to, className) => ranges.push({ from, to, className }));
  return ranges;
}

const diffTheme = EditorView.theme({
  "&.cm-merge-a .cm-changedLine, .cm-deletedChunk": {
    backgroundColor: "var(--dsh-wb-diff-delete-fill)",
  },
  "&.cm-merge-b .cm-changedLine, .cm-inlineChangedLine": {
    backgroundColor: "var(--dsh-wb-diff-add-fill)",
  },
  ".cm-changeGutter": {
    width: "4px",
    paddingLeft: "0",
  },
  "&.cm-merge-a .cm-changedLineGutter, .cm-deletedLineGutter": {
    backgroundColor: "var(--dsw-alias-state-error-primary)",
  },
  "&.cm-merge-b .cm-changedLineGutter": {
    backgroundColor: "var(--dsw-alias-state-success-primary)",
  },
  ".cm-collapsedLines": {
    color: "var(--dsw-alias-label-secondary)",
    background: "var(--dsh-wb-diff-neutral-fill)",
  },
});

function languageExtension(language: string | null): Extension[] {
  switch (language) {
    case "typescript":
      return [javascript({ typescript: true, jsx: true })];
    case "javascript":
      return [javascript({ jsx: true })];
    case "json":
      return [json()];
    case "css":
      return [css()];
    case "html":
      return [html()];
    case "xml":
      return [xml()];
    case "markdown":
      return [markdown()];
    case "python":
      return [python()];
    case "yaml":
      return [StreamLanguage.define(yaml)];
    case "ini":
      return [StreamLanguage.define(properties)];
    case "toml":
      return [StreamLanguage.define(toml)];
    case "bash":
      return [StreamLanguage.define(shell)];
    case "c":
      return [StreamLanguage.define(c)];
    case "cpp":
      return [StreamLanguage.define(cpp)];
    case "java":
      return [StreamLanguage.define(java)];
    case "matlab":
      return [StreamLanguage.define(octave)];
    case "r":
      return [StreamLanguage.define(r)];
    case "julia":
      return [StreamLanguage.define(julia)];
    case "lua":
      return [StreamLanguage.define(lua)];
    case "csharp":
      return [StreamLanguage.define(csharp)];
    case "kotlin":
      return [StreamLanguage.define(kotlin)];
    case "scala":
      return [StreamLanguage.define(scala)];
    case "swift":
      return [StreamLanguage.define(swift)];
    case "dart":
      return [StreamLanguage.define(dart)];
    case "go":
      return [StreamLanguage.define(go)];
    case "rust":
      return [StreamLanguage.define(rust)];
    case "ruby":
      return [StreamLanguage.define(ruby)];
    case "sql":
      return [StreamLanguage.define(standardSQL)];
    case "diff":
      return [StreamLanguage.define(diff)];
    case "dockerfile":
      return [StreamLanguage.define(dockerFile)];
    default:
      return [];
  }
}

export function createEditorExtensions(options: {
  language: string | null;
  original: string | null;
  diffView?: DiffViewMode;
  onSelectionChange?(selection: CodeSelection | null): void;
  onDocumentChange?(content: string): void;
  onSave?(): void;
  editable?: boolean;
}): Extension[] {
  const extensions: Extension[] = [
    history(),
    lineNumbers(),
    foldGutter(),
    search({ top: true }),
    keymap.of([
      ...(options.onSave ? [{
        key: "Mod-s",
        preventDefault: true,
        run: () => {
          options.onSave?.();
          return true;
        },
      }] : []),
      ...defaultKeymap,
      ...historyKeymap,
      ...foldKeymap,
      ...searchKeymap,
    ]),
    syntaxHighlighting(workbenchHighlightStyle),
    EditorView.editable.of(options.editable === true),
    EditorState.readOnly.of(options.editable !== true),
    workbenchTheme,
    ...languageExtension(options.language),
  ];
  if (options.onSelectionChange) {
    extensions.push(EditorView.updateListener.of((update) => {
      if (update.selectionSet) {
        const range = update.state.selection.main;
        if (range.empty) {
          options.onSelectionChange?.(null);
          return;
        }
        const coords = update.view.coordsAtPos(range.to);
        options.onSelectionChange?.(coords ? {
          from: range.from,
          to: range.to,
          left: Math.min(Math.max(coords.left + ((coords.right - coords.left) / 2), 80), window.innerWidth - 80),
          top: coords.top,
        } : null);
        return;
      }
      if (update.geometryChanged || update.viewportChanged) options.onSelectionChange?.(null);
    }));
  }
  if (options.onDocumentChange) {
    extensions.push(EditorView.updateListener.of((update) => {
      if (update.docChanged) options.onDocumentChange?.(update.state.doc.toString());
    }));
  }
  if (options.original != null && (options.diffView !== "split" || options.original === "")) {
    extensions.push(unifiedMergeView({
      original: options.original,
      gutter: true,
      highlightChanges: true,
      mergeControls: false,
      collapseUnchanged: { margin: 3, minSize: 6 },
    }));
    extensions.push(diffTheme);
  }
  if (options.diffView === "split") extensions.push(diffTheme);
  return extensions;
}

export function mountCodeEditor(parent: HTMLElement, doc: string, extensions: Extension[], options?: { language: string | null; original: string | null; diffView?: DiffViewMode; memory?: { state?: unknown; top?: number; left?: number } }): { view: EditorView; destroy(): void } {
  if (options?.original != null && options.original !== "" && options.diffView === "split") {
    const merge = new MergeView({
      a: {
        doc: options.original,
        extensions: createEditorExtensions({ language: options.language ?? null, original: null, editable: false, diffView: "split" }),
      },
      b: { doc, extensions },
      parent,
      gutter: true,
      highlightChanges: true,
      revertControls: undefined,
      collapseUnchanged: { margin: 3, minSize: 6 },
    });
    let syncingScroll = false;
    const syncScroll = (from: HTMLElement, to: HTMLElement) => {
      if (syncingScroll || to.scrollLeft === from.scrollLeft) return;
      syncingScroll = true;
      to.scrollLeft = from.scrollLeft;
      syncingScroll = false;
    };
    const syncLeft = () => syncScroll(merge.a.scrollDOM, merge.b.scrollDOM);
    const syncRight = () => syncScroll(merge.b.scrollDOM, merge.a.scrollDOM);
    merge.a.scrollDOM.addEventListener("scroll", syncLeft, { passive: true });
    merge.b.scrollDOM.addEventListener("scroll", syncRight, { passive: true });
    return {
      view: merge.b,
      destroy: () => {
        merge.a.scrollDOM.removeEventListener("scroll", syncLeft);
        merge.b.scrollDOM.removeEventListener("scroll", syncRight);
        merge.destroy();
      },
    };
  }
  const memory = options?.memory;
  const previous = memory?.state;
  const state = previous instanceof EditorState && previous.doc.toString() === doc
    ? previous.update({ effects: StateEffect.reconfigure.of(extensions) }).state
    : EditorState.create({ doc, extensions });
  const view = new EditorView({ parent, state });
  if (memory) view.requestMeasure({ read: () => null, write() {
    view.scrollDOM.scrollTop = memory.top ?? 0;
    view.scrollDOM.scrollLeft = memory.left ?? 0;
  } });
  return { view, destroy() {
    if (memory) {
      memory.state = view.state;
      memory.top = view.scrollDOM.scrollTop;
      memory.left = view.scrollDOM.scrollLeft;
    }
    view.destroy();
  } };
}
