import type { ComponentType } from "react";
import type { FileState } from "../store.js";
import { EmptyFileIcon } from "../chrome/icons.js";
import type { PreviewCommands } from "../preview/preview-nav.js";
import type { TreeCommands } from "../explorer/file-tree.js";
import type { FileOpenMode } from "../../shared/types.js";
import { ReviewRail } from "../review/review-panel.js";
import { useWorkbenchServices } from "./runtime.js";

type CodeViewProps = {
  state: FileState;
  commandsRef: { current: PreviewCommands | null };
};

type SearchPanelProps = {
  onClose: () => void;
};

type WorkspaceTreePanelProps = {
  width: number;
  onResize: (width: number) => void;
  revealPath?: string;
  commandsRef?: { current: TreeCommands | null };
  openMode?: FileOpenMode;
};

export function WorkbenchBody({
    state,
    sessionId,
    diffMode,
    treeWidth,
    revealPath,
    treeCommands,
    resizeTree,
    previewCommands,
    searchOpen,
    setSearchOpen,
    CodeView,
    WorkspaceTreePanel,
    SearchPanel,
  }: {
    state: FileState;
    sessionId: string;
    diffMode: boolean;
    treeWidth: number;
    revealPath: string;
    treeCommands: { current: TreeCommands | null };
    resizeTree(width: number): void;
    previewCommands: { current: PreviewCommands | null };
    searchOpen: boolean;
    setSearchOpen(open: boolean): void;
    CodeView: ComponentType<CodeViewProps>;
    WorkspaceTreePanel: ComponentType<WorkspaceTreePanelProps>;
    SearchPanel: ComponentType<SearchPanelProps>;
  }) {
    const { store, i18n } = useWorkbenchServices();
    const t = i18n.t;
    return (
      <>
        <div className="dsh-wb-main">
          <main className="dsh-wb-code">
            {state.path ? (
              <CodeView state={state} commandsRef={previewCommands} />
            ) : (
              <div className="dsh-wb-empty">
                <div className="dsh-wb-empty-icon"><EmptyFileIcon /></div>
                <strong>{t("openFile")}</strong>
                <span>{t("selectFile")}</span>
              </div>
            )}
          </main>
          <div className="dsh-wb-rail" hidden={!diffMode}>
            <ReviewRail store={store} sessionId={sessionId} width={treeWidth} onResize={resizeTree} />
          </div>
          <div className="dsh-wb-rail" hidden={diffMode}>
            <WorkspaceTreePanel width={treeWidth} revealPath={revealPath} commandsRef={treeCommands} onResize={resizeTree} />
          </div>
        </div>
        {searchOpen ? (
          <div className="dsh-wb-search-overlay">
            <SearchPanel onClose={() => setSearchOpen(false)} />
          </div>
        ) : null}
      </>
    );
}
