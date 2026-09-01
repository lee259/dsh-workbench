import { useEffect, useRef, type ComponentType } from "react";
import type { FileState } from "../store.js";
import { EmptyFileIcon, Icon } from "../chrome/icons.js";
import type { PreviewCommands } from "../preview/preview-nav.js";
import type { TreeCommands } from "../explorer/file-tree.js";
import type { FileOpenMode, ReviewScope } from "../../shared/types.js";
import type { TabOpenKind } from "../chrome/tab-model.js";
import { DiffPanel, type DiffPanelCommands } from "../preview/diff-panel.js";
import { useWorkbenchServices } from "./runtime.js";

type CodeViewProps = {
  state: FileState;
  commandsRef: { current: PreviewCommands | null };
  sessionId?: string;
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
  sessionId?: string;
  reviewRevision?: number;
  reviewUpdates?: Readonly<Record<string, number>>;
  reviewScope?: ReviewScope;
  onFileOpen?(path: string, mode: FileOpenMode, kind: TabOpenKind): void;
};

function EmptyTabChooser({
    onReview,
    onFile,
  }: {
    onReview(): void;
    onFile(): void;
  }) {
    const { i18n } = useWorkbenchServices();
    return (
      <div className="dsh-wb-empty-tab">
        <button type="button" className="dsh-wb-empty-tab-option" onClick={onReview}>
          <Icon name="commit" />
          <span>{i18n.t("reviewTab")}</span>
        </button>
        <button type="button" className="dsh-wb-empty-tab-option" onClick={onFile}>
          <Icon name="folder" />
          <span>{i18n.t("file")}</span>
        </button>
      </div>
    );
}

export function WorkbenchBody({
    state,
    sessionId,
    reviewRevealPath,
    reviewRevealVersion,
    reviewRevision,
    reviewUpdates,
    reviewScope,
    onGitCountsChange,
    diffCommands,
    diffMode,
    emptyTabOpen,
    activeEmptyFileTab,
    activeEmptyFilePath,
    setEmptyTabOpen,
    openReviewTab,
    newFileTab,
    setDiffMode,
    treeVisible,
    treeWidth,
    revealPath,
    treeCommands,
    resizeTree,
    onFileOpen,
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
    reviewRevealPath?: string;
    reviewRevealVersion: number;
    reviewRevision: number;
    reviewUpdates: Readonly<Record<string, number>>;
    reviewScope: ReviewScope;
    onGitCountsChange(counts: { additions: number; deletions: number }): void;
    diffCommands: { current: DiffPanelCommands | null };
    diffMode: boolean;
    emptyTabOpen: boolean;
    activeEmptyFileTab: string;
    activeEmptyFilePath: string;
    setEmptyTabOpen(open: boolean): void;
    openReviewTab(): void;
    newFileTab(): void;
    setDiffMode(next: boolean): void;
    treeVisible: boolean;
    treeWidth: number;
    revealPath: string;
    treeCommands: { current: TreeCommands | null };
    resizeTree(width: number): void;
    onFileOpen(path: string, mode: FileOpenMode, kind: TabOpenKind): void;
    previewCommands: { current: PreviewCommands | null };
    searchOpen: boolean;
    searchMode: "files" | "content";
    setSearchOpen(open: boolean): void;
    CodeView: ComponentType<CodeViewProps>;
    WorkspaceTreePanel: ComponentType<WorkspaceTreePanelProps>;
    SearchPanel: ComponentType<SearchPanelProps>;
  }) {
    const { i18n } = useWorkbenchServices();
    const t = i18n.t;
    const treeVisibleNow = treeVisible && !emptyTabOpen;
    const treeRailRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
      treeRailRef.current?.toggleAttribute("inert", !treeVisibleNow);
    }, [treeVisibleNow]);
    return (
      <>
        <div className={`dsh-wb-main${diffMode ? " is-diff" : ""}`}>
          <div className="dsh-wb-code-column">
            <main className="dsh-wb-code">
              {emptyTabOpen ? (
                <EmptyTabChooser
                  onReview={openReviewTab}
                  onFile={newFileTab}
                />
              ) : activeEmptyFileTab && !activeEmptyFilePath ? (
                <div className="dsh-wb-empty"><strong>{t("openFile")}</strong><span>{t("selectFile")}</span></div>
              ) : activeEmptyFileTab && state.path !== activeEmptyFilePath ? (
                <div className="dsh-wb-empty"><strong>{t("reading")}</strong></div>
              ) : diffMode ? (
                <DiffPanel ref={diffCommands} sessionId={sessionId} revealPath={reviewRevealPath} revealVersion={reviewRevealVersion} revision={reviewRevision} scope={reviewScope} updates={reviewUpdates} onCountsChange={onGitCountsChange} />
              ) : state.path ? (
                <CodeView state={state} commandsRef={previewCommands} sessionId={sessionId} />
              ) : (
                <div className="dsh-wb-empty">
                  <div className="dsh-wb-empty-icon"><EmptyFileIcon /></div>
                  <strong>{t("openFile")}</strong>
                  <span>{t("selectFile")}</span>
                </div>
              )}
            </main>
          </div>
          <div
            ref={treeRailRef}
            className={`dsh-wb-rail ${treeVisibleNow ? "is-open" : "is-closed"}`}
            aria-hidden={!treeVisibleNow}
            style={{ width: treeVisibleNow ? treeWidth : 0 }}
          >
            <WorkspaceTreePanel
              width={treeWidth}
              revealPath={revealPath}
              commandsRef={treeCommands}
              onResize={resizeTree}
              openMode={diffMode ? "diff" : "view"}
              sessionId={sessionId}
              reviewRevision={reviewRevision}
              reviewUpdates={reviewUpdates}
              reviewScope={reviewScope}
              onFileOpen={onFileOpen}
            />
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
