import { gotoLine, openSearchPanel } from "@codemirror/search";
import { EditorView } from "@codemirror/view";

export type PreviewCommands = {
  find(): boolean;
  goToLine(): boolean;
  revealLine(line: number): void;
  save(): boolean;
};

export function clampPreviewLine(line: number, lineCount: number): number {
  if (!Number.isFinite(line) || lineCount < 1) return 1;
  return Math.min(lineCount, Math.max(1, Math.floor(line)));
}

export function revealEditorLine(view: EditorView, line: number): void {
  const target = view.state.doc.line(clampPreviewLine(line, view.state.doc.lines));
  view.dispatch({
    selection: { anchor: target.from },
    effects: EditorView.scrollIntoView(target.from, { y: "center" }),
  });
}

export function createPreviewCommands(view: EditorView, save?: () => void): PreviewCommands {
  return {
    find() {
      return openSearchPanel(view);
    },
    goToLine() {
      gotoLine(view);
      return true;
    },
    revealLine(line) {
      revealEditorLine(view, line);
    },
    save() {
      if (!save) return false;
      save();
      return true;
    },
  };
}
