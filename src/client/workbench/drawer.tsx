import {
  DEFAULT_SIDEBAR_WIDTH,
  MAX_SIDEBAR_WIDTH,
  MIN_SIDEBAR_WIDTH,
  sidebarWidthFromKey,
} from "../chrome/sidebar.js";
import { SearchPanel } from "../explorer/search-panel.js";
import { WorkspaceTreePanel } from "../explorer/file-tree.js";
import { CodeView } from "../preview/code-view.js";
import { viewKind } from "../preview/editor-spec.js";
import { countDiffLines } from "../preview/line-diff.js";
import { WorkbenchBody } from "./body.js";
import { WorkbenchHeader } from "./header.js";
import { WorkbenchStyles } from "./styles.js";
import { useWorkbenchShell } from "./use-shell.js";

export function WorkbenchDrawer() {
  const { state, t, width, setWidth, pathCopied, setPathCopied, searchOpen, setSearchOpen, diffMode, setDiffMode, treeWidth, revealPath, treeCommands, previewCommands, mounted, closing, showTreeAt, resizeTree, workspaceKey, sessionId, resizeStart, sidebarRef, sidebarWidthFromKey } = useWorkbenchShell();

  if (!mounted) return null;

  const payload = state.payload;
  const lineCount = payload?.content.split("\n").length ?? 0;
  const meta = !state.path
    ? t("workspaceTitle")
    : state.loading
    ? t("reading")
    : state.error
      ? t("readError")
      : payload && viewKind(payload.source) === "diff"
        ? t("linesDiff", countDiffLines(payload.before, payload.content))
        : t("linesWorkspace", { count: lineCount });

  return (
    <>
      <WorkbenchStyles />
      <aside ref={sidebarRef} className="dsh-wb-sidebar" data-state={closing ? "closing" : "open"} style={{ width: `${width}px` }} aria-label={t("ariaWorkspace")}>
        <div
          className="dsh-wb-resize-handle"
          role="separator"
          aria-label={t("resize")}
          aria-orientation="vertical"
          aria-valuemin={MIN_SIDEBAR_WIDTH}
          aria-valuemax={MAX_SIDEBAR_WIDTH}
          aria-valuenow={width}
          tabIndex={0}
          title={t("resetWidth")}
          onPointerDown={resizeStart}
          onDoubleClick={() => setWidth(DEFAULT_SIDEBAR_WIDTH)}
          onKeyDown={(event) => {
            if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
            event.preventDefault();
            setWidth((current) => sidebarWidthFromKey(current, event.key));
          }}
        />
        <WorkbenchHeader state={state} diffMode={diffMode} setDiffMode={setDiffMode} setSearchOpen={setSearchOpen} showTreeAt={showTreeAt} meta={meta} pathCopied={pathCopied} setPathCopied={setPathCopied} />
        <WorkbenchBody
          key={workspaceKey}
          state={state}
          sessionId={sessionId}
          diffMode={diffMode}
          treeWidth={treeWidth}
          revealPath={revealPath}
          treeCommands={treeCommands}
          resizeTree={resizeTree}
          previewCommands={previewCommands}
          searchOpen={searchOpen}
          setSearchOpen={setSearchOpen}
          CodeView={CodeView}
          WorkspaceTreePanel={WorkspaceTreePanel}
          SearchPanel={SearchPanel}
        />
      </aside>
    </>
  );
}
