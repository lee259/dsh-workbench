import { useEffect, useRef, type ComponentType } from "react";
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
  mode?: "files" | "content";
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
    treeVisible,
    treeWidth,
    revealPath,
    treeCommands,
    resizeTree,
    previewCommands,
    searchOpen,
    searchMode,
    setSearchOpen,
    CodeView,
    WorkspaceTreePanel,
    SearchPanel,
  }: {
    state: FileState;
    sessionId: string;
    diffMode: boolean;
    treeVisible: boolean;
    treeWidth: number;
    revealPath: string;
    treeCommands: { current: TreeCommands | null };
    resizeTree(width: number): void;
    previewCommands: { current: PreviewCommands | null };
    searchOpen: boolean;
    searchMode: "files" | "content";
    setSearchOpen(open: boolean): void;
    CodeView: ComponentType<CodeViewProps>;
    WorkspaceTreePanel: ComponentType<WorkspaceTreePanelProps>;
    SearchPanel: ComponentType<SearchPanelProps>;
  }) {
    const { store, i18n } = useWorkbenchServices();
    const t = i18n.t;
    const reviewVisible = treeVisible && diffMode;
    const treeVisibleNow = treeVisible && !diffMode;
    const reviewRailRef = useRef<HTMLDivElement | null>(null);
    const treeRailRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
      reviewRailRef.current?.toggleAttribute("inert", !reviewVisible);
    }, [reviewVisible]);

    useEffect(() => {
      treeRailRef.current?.toggleAttribute("inert", !treeVisibleNow);
    }, [treeVisibleNow]);
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
          <div
            ref={reviewRailRef}
            className={`dsh-wb-rail ${diffMode ? (treeVisible ? "is-open" : "is-closed") : "is-inactive"}`}
            aria-hidden={!reviewVisible}
            style={{ width: treeVisible ? treeWidth : 0 }}
          >
            <ReviewRail store={store} sessionId={sessionId} width={treeWidth} onResize={resizeTree} />
          </div>
          <div
            ref={treeRailRef}
            className={`dsh-wb-rail ${!diffMode ? (treeVisible ? "is-open" : "is-closed") : "is-inactive"}`}
            aria-hidden={!treeVisibleNow}
            style={{ width: treeVisible ? treeWidth : 0 }}
          >
            <WorkspaceTreePanel width={treeWidth} revealPath={revealPath} commandsRef={treeCommands} onResize={resizeTree} />
          </div>
        </div>
        {searchOpen ? (
          <div className="dsh-wb-search-overlay">
            <SearchPanel mode={searchMode} onClose={() => setSearchOpen(false)} />
          </div>
        ) : null}
      </>
    );
}
