import { css } from "@codemirror/lang-css";
import { html } from "@codemirror/lang-html";
import { javascript } from "@codemirror/lang-javascript";
import { json } from "@codemirror/lang-json";
import { markdown } from "@codemirror/lang-markdown";
import { python } from "@codemirror/lang-python";
import { xml } from "@codemirror/lang-xml";
import { StreamLanguage, defaultHighlightStyle, foldGutter, foldKeymap, syntaxHighlighting } from "@codemirror/language";
import { c, cpp, java } from "@codemirror/legacy-modes/mode/clike";
import { diff } from "@codemirror/legacy-modes/mode/diff";
import { dockerFile } from "@codemirror/legacy-modes/mode/dockerfile";
import { go } from "@codemirror/legacy-modes/mode/go";
import { properties } from "@codemirror/legacy-modes/mode/properties";
import { ruby } from "@codemirror/legacy-modes/mode/ruby";
import { rust } from "@codemirror/legacy-modes/mode/rust";
import { shell } from "@codemirror/legacy-modes/mode/shell";
import { standardSQL } from "@codemirror/legacy-modes/mode/sql";
import { toml } from "@codemirror/legacy-modes/mode/toml";
import { yaml } from "@codemirror/legacy-modes/mode/yaml";
import { unifiedMergeView } from "@codemirror/merge";
import { search, searchKeymap } from "@codemirror/search";
import { EditorState, type Extension } from "@codemirror/state";
import { EditorView, keymap, lineNumbers } from "@codemirror/view";

const workbenchTheme = EditorView.theme({
  "&": {
    height: "100%",
    fontSize: "12px",
    backgroundColor: "transparent",
  },
  ".cm-scroller": {
    fontFamily: "var(--ds-font-family-code, ui-monospace, SFMono-Regular, Menlo, monospace)",
    lineHeight: "22px",
  },
  ".cm-gutters": {
    backgroundColor: "transparent",
    border: "none",
    color: "var(--dsw-alias-label-tertiary)",
  },
  ".cm-content": {
    padding: "8px 0",
  },
  ".cm-activeLine, .cm-activeLineGutter": {
    backgroundColor: "transparent",
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
}): Extension[] {
  const extensions: Extension[] = [
    lineNumbers(),
    foldGutter(),
    search({ top: true }),
    keymap.of([...foldKeymap, ...searchKeymap]),
    syntaxHighlighting(defaultHighlightStyle, { fallback: true }),
    EditorView.editable.of(false),
    EditorState.readOnly.of(true),
    workbenchTheme,
    ...languageExtension(options.language),
  ];
  if (options.original != null) {
    extensions.push(unifiedMergeView({
      original: options.original,
      gutter: true,
      highlightChanges: true,
      mergeControls: false,
      collapseUnchanged: { margin: 3, minSize: 6 },
    }));
  }
  return extensions;
}

export function mountCodeEditor(parent: HTMLElement, doc: string, extensions: Extension[]): { view: EditorView; destroy(): void } {
  const view = new EditorView({
    parent,
    state: EditorState.create({ doc, extensions }),
  });
  return { view, destroy: () => view.destroy() };
}
