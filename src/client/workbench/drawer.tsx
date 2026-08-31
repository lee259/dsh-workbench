import {
  DEFAULT_SIDEBAR_WIDTH,
  MAX_SIDEBAR_WIDTH,
  MIN_SIDEBAR_WIDTH,
} from "../chrome/sidebar.js";
import { SearchPanel } from "../explorer/search-panel.js";
import { WorkspaceTreePanel } from "../explorer/file-tree.js";
import { CodeView } from "../preview/code-view.js";
import { viewKind } from "../preview/editor-spec.js";
import { countDiffLines } from "../preview/line-diff.js";
import type { LocaleStore } from "../../shared/i18n.js";
import type { FileState } from "../store.js";
import { WorkbenchBody } from "./body.js";
import { WorkbenchHeader } from "./header.js";
import { useWorkbenchShell } from "./use-shell.js";

function previewMeta(state: FileState, t: LocaleStore["t"]): string {
  if (!state.path) return t("workspaceTitle");
  if (state.loading) return t("reading");
  if (state.error) return t("readError");
  const payload = state.payload;
  if (payload && viewKind(payload.source) === "diff") {
    return t("linesDiff", countDiffLines(payload.before, payload.content));
  }
  return t("linesWorkspace", { count: payload?.content.split("\n").length ?? 0 });
}

export function WorkbenchDrawer() {
  const { state, t, width, setWidth, pathCopied, setPathCopied, searchOpen, setSearchOpen, searchMode, diffMode, setDiffMode, reviewTabOpen, openReviewTab, closeReviewTab, reviewChanges, reviewRevealPath, reviewRevision, reviewScope, setReviewScope, emptyTabOpen, setEmptyTabOpen, emptyFileTabs, emptyFilePaths, activeEmptyFileTab, setActiveEmptyFileTab, newFileTab, activateEmptyFileTab, closeEmptyFileTab, treeVisible, setTreeOpen, treeWidth, revealPath, treeCommands, previewCommands, diffCommands, mounted, closing, showTreeAt, resizeTree, handleTreeFileOpen, workspaceKey, sessionId, resizeStart, sidebarRef, sidebarWidthFromKey } = useWorkbenchShell();

  if (!mounted) return null;

  return (
    <>
      <aside
        ref={sidebarRef}
        className="dsh-wb-sidebar"
        data-state={closing ? "closing" : "open"}
        style={{ width: `${width}px` }}
        aria-label={t("ariaWorkspace")}
      >
        <div
          className="dsh-wb-resize-handle"
          role="separator"
          aria-label={t("resize")}
          aria-orientation="vertical"
          aria-valuemin={MIN_SIDEBAR_WIDTH}
          aria-valuemax={MAX_SIDEBAR_WIDTH}
          aria-valuenow={width}
          tabIndex={0}
          onPointerDown={resizeStart}
          onDoubleClick={() => setWidth(DEFAULT_SIDEBAR_WIDTH)}
          onKeyDown={(event) => {
            if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
            event.preventDefault();
            setWidth((current) => sidebarWidthFromKey(current, event.key));
          }}
        />
        <WorkbenchHeader
          state={state}
          diffMode={diffMode}
          setDiffMode={setDiffMode}
          reviewTabOpen={reviewTabOpen}
          openReviewTab={openReviewTab}
          closeReviewTab={closeReviewTab}
          emptyTabOpen={emptyTabOpen}
          setEmptyTabOpen={setEmptyTabOpen}
          emptyFileTabs={emptyFileTabs}
          emptyFilePaths={emptyFilePaths}
          activeEmptyFileTab={activeEmptyFileTab}
          setActiveEmptyFileTab={setActiveEmptyFileTab}
          newFileTab={newFileTab}
          activateEmptyFileTab={activateEmptyFileTab}
          closeEmptyFileTab={closeEmptyFileTab}
          treeVisible={treeVisible}
          setTreeOpen={setTreeOpen}
          setSearchOpen={setSearchOpen}
          showTreeAt={showTreeAt}
          meta={previewMeta(state, t)}
          pathCopied={pathCopied}
          setPathCopied={setPathCopied}
        />
        <WorkbenchBody
          key={workspaceKey}
          state={state}
          sessionId={sessionId}
          reviewRevealPath={reviewRevealPath}
          reviewRevision={reviewRevision}
          reviewChanges={reviewChanges}
          reviewScope={reviewScope}
          setReviewScope={setReviewScope}
          diffCommands={diffCommands}
          diffMode={diffMode}
          emptyTabOpen={emptyTabOpen}
          activeEmptyFileTab={activeEmptyFileTab}
          activeEmptyFilePath={emptyFilePaths[activeEmptyFileTab] ?? ""}
          setEmptyTabOpen={setEmptyTabOpen}
          openReviewTab={openReviewTab}
          newFileTab={newFileTab}
          setDiffMode={setDiffMode}
          treeVisible={treeVisible}
          treeWidth={treeWidth}
          revealPath={revealPath}
          treeCommands={treeCommands}
          resizeTree={resizeTree}
          onFileOpen={handleTreeFileOpen}
          previewCommands={previewCommands}
          searchOpen={searchOpen}
          searchMode={searchMode}
          setSearchOpen={setSearchOpen}
          CodeView={CodeView}
          WorkspaceTreePanel={WorkspaceTreePanel}
          SearchPanel={SearchPanel}
        />
      </aside>
    </>
  );
}
