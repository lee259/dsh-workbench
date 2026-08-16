import {
  DEFAULT_SIDEBAR_WIDTH,
  MAX_SIDEBAR_WIDTH,
  MIN_SIDEBAR_WIDTH,
  sidebarWidthFromKey,
} from "../chrome/sidebar.js";
import { WorkspaceTreePanel, clampTreeWidth, persistTreeWidth, savedTreeWidth } from "../explorer/file-tree.js";
import { SearchPanel } from "../explorer/search-panel.js";
import { CodeView } from "../preview/code-view.js";
import { viewKind } from "../preview/editor-spec.js";
import { WorkbenchBody } from "./body.js";
import { WorkbenchHeader } from "./header.js";
import { WorkbenchStyles } from "./styles.js";
import { useWorkbenchShell } from "./use-shell.js";

export function WorkbenchDrawer() {
  const { state, t, width, setWidth, treeWidth, treeVisible, revealPath, copied, setCopied, pathCopied, setPathCopied, searchOpen, setSearchOpen, mounted, closing, previewCommands, treeCommands, setTreeOpen, showTreeAt, resizeStart, sidebarRef, sidebarWidthFromKey, setTreeWidth } = useWorkbenchShell(savedTreeWidth, persistTreeWidth);

  if (!mounted) return null;

  const payload = state.payload;
  const lineCount = payload?.content.split("\n").length ?? 0;
  const meta = !state.path
    ? t("workspaceTitle")
    : state.loading
    ? t("reading")
    : state.error
      ? t("readError")
      : t(payload && viewKind(payload.source) === "diff" ? "linesDiff" : "linesWorkspace", { count: lineCount });

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
        <WorkbenchHeader state={state} treeVisible={treeVisible} setTreeOpen={setTreeOpen} setSearchOpen={setSearchOpen} showTreeAt={showTreeAt} payload={payload} meta={meta} copied={copied} setCopied={setCopied} pathCopied={pathCopied} setPathCopied={setPathCopied} />
        <WorkbenchBody
          state={state}
          payload={payload}
          treeVisible={treeVisible}
          treeWidth={treeWidth}
          revealPath={revealPath}
          treeCommands={treeCommands}
          previewCommands={previewCommands}
          searchOpen={searchOpen}
          setSearchOpen={setSearchOpen}
          onResizeTree={(next) => {
            const value = clampTreeWidth(next);
            setTreeWidth(value);
            persistTreeWidth(value);
          }}
          CodeView={CodeView}
          WorkspaceTreePanel={WorkspaceTreePanel}
          SearchPanel={SearchPanel}
        />
      </aside>
    </>
  );
}
