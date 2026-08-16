import type { ComponentType } from "react";
import type { FileState } from "../store.js";
import { EmptyFileIcon } from "../chrome/icons.js";
import { viewKind } from "../preview/editor-spec.js";
import type { PreviewCommands } from "../preview/preview-nav.js";
import type { TreeCommands } from "../explorer/file-tree.js";
import { useWorkbenchServices } from "./runtime.js";

type CodeViewProps = {
  state: FileState;
  commandsRef: { current: PreviewCommands | null };
};

type WorkspaceTreePanelProps = {
  width: number;
  onResize: (width: number) => void;
  revealPath?: string;
  commandsRef?: { current: TreeCommands | null };
};

type SearchPanelProps = {
  onClose: () => void;
};

export function WorkbenchBody({
    state,
    payload,
    treeVisible,
    treeWidth,
    revealPath,
    treeCommands,
    previewCommands,
    searchOpen,
    setSearchOpen,
    onResizeTree,
    CodeView,
    WorkspaceTreePanel,
    SearchPanel,
  }: {
    state: FileState;
    payload: FileState["payload"];
    treeVisible: boolean;
    treeWidth: number;
    revealPath: string;
    treeCommands: { current: TreeCommands | null };
    previewCommands: { current: PreviewCommands | null };
    searchOpen: boolean;
    setSearchOpen(open: boolean): void;
    onResizeTree(width: number): void;
    CodeView: ComponentType<CodeViewProps>;
    WorkspaceTreePanel: ComponentType<WorkspaceTreePanelProps>;
    SearchPanel: ComponentType<SearchPanelProps>;
  }) {
    const { i18n } = useWorkbenchServices();
    const t = i18n.t;
    return <>
      <div className={`dsh-wb-main${treeVisible ? "" : " is-tree-hidden"}`}>
        <main className="dsh-wb-code">
          {state.path ? <CodeView state={state} commandsRef={previewCommands} /> : <div className="dsh-wb-empty"><div className="dsh-wb-empty-icon"><EmptyFileIcon /></div><strong>{t("openFile")}</strong><span>{t("selectFile")}</span></div>}
        </main>
        {treeVisible ? <WorkspaceTreePanel width={treeWidth} revealPath={revealPath} commandsRef={treeCommands} onResize={onResizeTree} /> : null}
      </div>
      {searchOpen ? <div className="dsh-wb-search-overlay"><SearchPanel onClose={() => setSearchOpen(false)} /></div> : null}
      <footer className="dsh-wb-foot">
        <span>{t(payload && viewKind(payload.source) === "diff" ? "footerDiff" : "footerView")}</span>
      </footer>
    </>;
}
