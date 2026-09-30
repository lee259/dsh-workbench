import { writeClipboard } from "@deepseek-ai/dsh-client-ui-primitives";
import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { Icon, FileTypeIcon, TreeChevron } from "../chrome/icons.js";
import { startResizeDrag } from "../chrome/resize-drag.js";
import { WorkbenchTooltip } from "../chrome/tooltip.js";
import { clampTreeWidth, MAX_TREE_WIDTH, MIN_TREE_WIDTH } from "../explorer/tree-model.js";
import { fetchHarnessReview, fetchHarnessReviewDiff, type HarnessChangedFile, type HarnessReviewDiff, type HarnessReviewTurn } from "../review/review-data.js";
import { followWorkspaceEvents } from "../workspace-events.js";
import { HarnessReviewDiffContent } from "./harness-diff.js";
import { useWorkbenchServices, useWorkbenchSession } from "./runtime.js";

type ReviewFile = HarnessChangedFile & { seq: number; index: number; turn: HarnessReviewTurn["turn"]; live?: true; workspace?: true };
type ReviewTreeNode = { name: string; path: string; file?: ReviewFile; children: Map<string, ReviewTreeNode> };
type ReviewDiffState = { diff?: HarnessReviewDiff; loading: boolean; error?: boolean };
type DiffViewMode = "unified" | "split";

function reviewTree(files: ReviewFile[]): ReviewTreeNode[] {
  const roots = new Map<string, ReviewTreeNode>();
  for (const file of files) {
    const parts = file.path.split("/").filter(Boolean);
    let siblings = roots;
    let parentPath = "";
    parts.forEach((name, index) => {
      const path = parentPath ? `${parentPath}/${name}` : name;
      let node = siblings.get(name);
      if (!node) {
        node = { name, path, children: new Map() };
        siblings.set(name, node);
      }
      if (index === parts.length - 1) node.file = file;
      parentPath = path;
      siblings = node.children;
    });
  }
  const sort = (nodes: Map<string, ReviewTreeNode>) => [...nodes.values()].sort((a, b) => Number(Boolean(b.children.size)) - Number(Boolean(a.children.size)) || a.name.localeCompare(b.name));
  return sort(roots);
}

function filterReviewTree(nodes: ReviewTreeNode[], query: string): ReviewTreeNode[] {
  if (!query) return nodes;
  const normalized = query.toLocaleLowerCase();
  return nodes.flatMap((node) => {
    const children = filterReviewTree([...node.children.values()], query);
    return node.name.toLocaleLowerCase().includes(normalized) || node.path.toLocaleLowerCase().includes(normalized) || children.length
      ? [{ ...node, children: new Map(children.map((child) => [child.name, child])) }]
      : [];
  });
}

function visibleNodes(nodes: ReviewTreeNode[], collapsed: Set<string>, query: string): ReviewTreeNode[] {
  const result: ReviewTreeNode[] = [];
  const visit = (items: ReviewTreeNode[]) => items.forEach((node) => {
    result.push(node);
    if (node.children.size && (query || !collapsed.has(node.path))) visit([...node.children.values()]);
  });
  visit(nodes);
  return result;
}

function ReviewTree({ nodes, depth, selectedPath, focusedPath, collapsed, query, onToggle, onSelect, onKeyDown, rowRefs }: {
  nodes: ReviewTreeNode[];
  depth: number;
  selectedPath: string;
  focusedPath: string;
  collapsed: Set<string>;
  query: string;
  onToggle(path: string): void;
  onSelect(path: string): void;
  onKeyDown(event: KeyboardEvent<HTMLButtonElement>, node: ReviewTreeNode): void;
  rowRefs: React.MutableRefObject<Map<string, HTMLButtonElement>>;
}) {
  return <>{nodes.map((node) => {
    const isFolder = node.children.size > 0;
    const open = isFolder && (Boolean(query) || !collapsed.has(node.path));
    return <div className="dsh-wb-code-review-tree-node" key={node.path}>
      <button
        ref={(element) => { if (element) rowRefs.current.set(node.path, element); else rowRefs.current.delete(node.path); }}
        id={`dsh-wb-review-tree-${encodeURIComponent(node.path)}`}
        className={`dsh-wb-code-review-tree-row${node.file && node.path === selectedPath ? " is-active" : ""}${node.path === focusedPath ? " is-focused" : ""}${isFolder ? " is-folder" : ""}`}
        type="button"
        role="treeitem"
        style={{ paddingLeft: 7 + depth * 14 }}
        aria-level={depth + 1}
        aria-expanded={isFolder ? open : undefined}
        aria-selected={node.path === selectedPath}
        tabIndex={node.path === focusedPath ? 0 : -1}
        onKeyDown={(event) => onKeyDown(event, node)}
        onClick={() => isFolder ? onToggle(node.path) : onSelect(node.path)}
        title={node.path}
      >
        {isFolder ? <TreeChevron open={open} /> : <span className="dsh-wb-code-review-tree-indent" />}
        <FileTypeIcon path={node.path} directory={isFolder} open={open} />
        <span className="dsh-wb-code-review-tree-name">{node.name}</span>
        {node.file ? <span className="dsh-wb-code-review-tree-counts">
          {node.file.added > 0 ? <span className="is-add">+{node.file.added}</span> : null}
          {node.file.deleted > 0 ? <span className="is-delete">−{node.file.deleted}</span> : null}
        </span> : null}
      </button>
      {open ? <ReviewTree nodes={[...node.children.values()]} depth={depth + 1} selectedPath={selectedPath} focusedPath={focusedPath} collapsed={collapsed} query={query} onToggle={onToggle} onSelect={onSelect} onKeyDown={onKeyDown} rowRefs={rowRefs} /> : null}
    </div>;
  })}</>;
}

export function NativeReviewTab() {
  const { i18n } = useWorkbenchServices();
  const t = i18n.t;
  const sessionId = useWorkbenchSession();
  const [turns, setTurns] = useState<HarnessReviewTurn[]>([]);
  const [selectedPath, setSelectedPath] = useState("");
  const [collapsedFolders, setCollapsedFolders] = useState<Set<string>>(() => new Set());
  const [collapsedFiles, setCollapsedFiles] = useState<Set<string>>(() => new Set());
  const [loadingTurns, setLoadingTurns] = useState(false);
  const [error, setError] = useState(false);
  const [diffs, setDiffs] = useState<Record<string, ReviewDiffState>>({});
  const [diffView, setDiffView] = useState<DiffViewMode>("split");
  const [treeVisible, setTreeVisible] = useState(true);
  const [treeWidth, setTreeWidth] = useState(280);
  const [query, setQuery] = useState("");
  const [focusedPath, setFocusedPath] = useState("");
  const [copiedPath, setCopiedPath] = useState("");
  const [scrollRequest, setScrollRequest] = useState(0);
  const diffPanelRef = useRef<HTMLElement>(null);
  const fileRefs = useRef(new Map<string, HTMLElement>());
  const rowRefs = useRef(new Map<string, HTMLButtonElement>());

  useEffect(() => {
    let alive = true;
    const load = async () => {
      if (!sessionId) {
        setTurns([]);
        setSelectedPath("");
        setError(false);
        setLoadingTurns(false);
        return;
      }
      setLoadingTurns(true);
      try {
        const response = await fetchHarnessReview(sessionId);
        if (!alive) return;
        setTurns(response.turns);
        setSelectedPath((current) => response.turns.some((turn) => turn.files.some((file) => file.path === current)) ? current : "");
        setError(false);
      } catch {
        if (alive) setError(true);
      } finally {
        if (alive) setLoadingTurns(false);
      }
    };
    void load();
    const stop = followWorkspaceEvents(() => {}, undefined, () => { void load(); }, undefined, () => { void load(); });
    return () => { alive = false; stop(); };
  }, [sessionId]);

  const files = useMemo(() => {
    const latestByPath = new Map<string, ReviewFile>();
    for (const turn of [...turns].reverse()) {
      turn.files.forEach((file, index) => {
        if (!latestByPath.has(file.path)) latestByPath.set(file.path, { ...file, seq: turn.seq, index, turn: turn.turn, live: turn.live, workspace: turn.workspace });
      });
    }
    return [...latestByPath.values()];
  }, [turns]);
  const selectedFile = files.find((file) => file.path === selectedPath) ?? files[0];
  const additions = files.reduce((sum, file) => sum + file.added, 0);
  const deletions = files.reduce((sum, file) => sum + file.deleted, 0);
  const tree = useMemo(() => reviewTree(files), [files]);
  const filteredTree = useMemo(() => filterReviewTree(tree, query.trim()), [tree, query]);
  const visibleTreeNodes = useMemo(() => visibleNodes(filteredTree, collapsedFolders, query.trim()), [filteredTree, collapsedFolders, query]);
  const visiblePathSet = useMemo(() => new Set(visibleTreeNodes.map((node) => node.path)), [visibleTreeNodes]);
  const treeFocusedPath = visiblePathSet.has(focusedPath) ? focusedPath : visibleTreeNodes[0]?.path ?? "";

  useEffect(() => {
    if (!files.length || !sessionId) {
      setDiffs({});
      return;
    }
    const controller = new AbortController();
    setDiffs(Object.fromEntries(files.map((file) => [file.path, { loading: true }])));
    void Promise.all(files.map(async (file) => {
      try {
        const diff = await fetchHarnessReviewDiff(sessionId, file.seq, file.index, controller.signal);
        return [file.path, { diff, loading: false }] as const;
      } catch {
        return [file.path, { loading: false, error: !controller.signal.aborted }] as const;
      }
    })).then((entries) => { if (!controller.signal.aborted) setDiffs(Object.fromEntries(entries)); });
    return () => controller.abort();
  }, [files, sessionId]);

  useEffect(() => {
    const panel = diffPanelRef.current;
    const target = selectedPath ? fileRefs.current.get(selectedPath) : undefined;
    if (!panel || !target) return;
    const panelRect = panel.getBoundingClientRect();
    const targetRect = target.getBoundingClientRect();
    panel.scrollTo({ top: panel.scrollTop + targetRect.top - panelRect.top, behavior: "smooth" });
  }, [scrollRequest]);

  const selectFile = (path: string) => {
    setSelectedPath(path);
    setFocusedPath(path);
    setCollapsedFiles((current) => {
      if (!current.has(path)) return current;
      const next = new Set(current);
      next.delete(path);
      return next;
    });
    setScrollRequest((version) => version + 1);
  };
  const toggleFolder = (path: string) => {
    setFocusedPath(path);
    setCollapsedFolders((current) => {
      const next = new Set(current);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  };
  const toggleFile = (path: string) => setCollapsedFiles((current) => {
    const next = new Set(current);
    if (next.has(path)) next.delete(path);
    else next.add(path);
    return next;
  });
  const moveFocus = (path: string) => {
    setFocusedPath(path);
    rowRefs.current.get(path)?.focus();
  };
  const onTreeKeyDown = (event: KeyboardEvent<HTMLButtonElement>, node: ReviewTreeNode) => {
    const index = visibleTreeNodes.findIndex((item) => item.path === node.path);
    const next = visibleTreeNodes[index + (event.key === "ArrowDown" ? 1 : -1)];
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      if (next) moveFocus(next.path);
    } else if (event.key === "Home" || event.key === "End") {
      event.preventDefault();
      const target = event.key === "Home" ? visibleTreeNodes[0] : visibleTreeNodes.at(-1);
      if (target) moveFocus(target.path);
    } else if (event.key === "ArrowRight" && node.children.size && collapsedFolders.has(node.path)) {
      event.preventDefault();
      toggleFolder(node.path);
    } else if (event.key === "ArrowLeft") {
      event.preventDefault();
      if (node.children.size && !collapsedFolders.has(node.path)) toggleFolder(node.path);
      else {
        const parentPath = node.path.includes("/") ? node.path.slice(0, node.path.lastIndexOf("/")) : "";
        if (parentPath) moveFocus(parentPath);
      }
    } else if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      if (node.children.size) toggleFolder(node.path);
      else selectFile(node.path);
    }
  };
  const copyPath = async (path: string) => {
    if (!await writeClipboard(path)) return;
    setCopiedPath(path);
    window.setTimeout(() => setCopiedPath((current) => current === path ? "" : current), 1400);
  };
  const resizeTree = (clientX: number) => {
    const body = document.querySelector(".dsh-wb-code-review-body");
    if (!body) return;
    setTreeWidth(clampTreeWidth(body.getBoundingClientRect().right - clientX));
  };
  const allDiffsCollapsed = files.length > 0 && files.every((file) => collapsedFiles.has(file.path));
  const setAllDiffsCollapsed = (collapse: boolean) => setCollapsedFiles(collapse ? new Set(files.map((file) => file.path)) : new Set());

  return <section className="dsh-wb-code-review">
    <header className="dsh-wb-code-review-header">
      <div className="dsh-wb-review-meta">
        {files.length > 0 ? <>
          {files.length} {t("reviewFiles")}
          {additions > 0 ? <> · <b className="is-add">+{additions}</b></> : null}
          {deletions > 0 ? <>{additions > 0 ? " " : " · "}<b className="is-delete">−{deletions}</b></> : null}
        </> : null}
      </div>
      <div className="dsh-wb-code-review-tools">
        <WorkbenchTooltip label={t(allDiffsCollapsed ? "expandAllDiffs" : "collapseAllDiffs")}>
          <button className="dsh-wb-button dsh-wb-icon-button" type="button" aria-label={t(allDiffsCollapsed ? "expandAllDiffs" : "collapseAllDiffs")} disabled={!files.length} onClick={() => setAllDiffsCollapsed(!allDiffsCollapsed)}><Icon name={allDiffsCollapsed ? "expand-all" : "collapse-all"} /></button>
        </WorkbenchTooltip>
        <WorkbenchTooltip label={t(diffView === "split" ? "unifiedDiff" : "splitDiff")}>
          <button className="dsh-wb-button dsh-wb-icon-button" type="button" aria-label={t(diffView === "split" ? "unifiedDiff" : "splitDiff")} aria-pressed={diffView === "split"} onClick={() => setDiffView(diffView === "split" ? "unified" : "split")}><Icon name={diffView === "split" ? "unified" : "split"} /></button>
        </WorkbenchTooltip>
        <WorkbenchTooltip label={t(treeVisible ? "hideTree" : "showTree")}>
          <button className="dsh-wb-button dsh-wb-icon-button" type="button" aria-label={t(treeVisible ? "hideTree" : "showTree")} aria-pressed={treeVisible} onClick={() => setTreeVisible((visible) => !visible)}><Icon name={treeVisible ? "panel-closed" : "panel-open"} /></button>
        </WorkbenchTooltip>
      </div>
    </header>
    <div className="dsh-wb-code-review-body">
      <main className="dsh-wb-code-review-diff" ref={diffPanelRef}>
        {loadingTurns && files.length === 0 ? <div className="dsh-wb-code-review-empty">{t("reading")}</div> : error && files.length === 0 ? <div className="dsh-wb-code-review-empty">{t("reviewError")}</div> : !files.length ? <div className="dsh-wb-code-review-empty"><div><strong>{t("reviewEmpty")}</strong><span>{t("reviewEmptyHint")}</span></div></div> : files.map((file) => {
          const diffState = diffs[file.path];
          const isCollapsed = collapsedFiles.has(file.path);
          const copied = copiedPath === file.path;
          return <section className={`dsh-wb-code-review-file-section${isCollapsed ? " is-collapsed" : ""}`} key={file.path} ref={(element) => {
            if (element) fileRefs.current.set(file.path, element);
            else fileRefs.current.delete(file.path);
          }}>
            <div className="dsh-wb-code-review-file-head" onClick={() => toggleFile(file.path)}>
              <button className="dsh-wb-button dsh-wb-code-review-file-collapse" type="button" aria-label={t(isCollapsed ? "expandDiff" : "collapseDiff")} aria-expanded={!isCollapsed} onClick={(event) => { event.stopPropagation(); toggleFile(file.path); }}><TreeChevron open={!isCollapsed} /></button>
              <FileTypeIcon path={file.path} />
              <strong title={file.display}>{file.display}</strong>
              <span className="dsh-wb-code-review-file-counts">
                {file.added > 0 ? <span className="is-add">+{file.added}</span> : null}
                {file.deleted > 0 ? <span className="is-delete">−{file.deleted}</span> : null}
              </span>
              <div className="dsh-wb-code-review-file-actions">
                <WorkbenchTooltip label={t(copied ? "pathCopied" : "copyPath")}>
                  <button className="dsh-wb-button dsh-wb-icon-button" type="button" aria-label={t(copied ? "pathCopied" : "copyPath")} onClick={(event) => { event.stopPropagation(); void copyPath(file.path); }}><Icon name={copied ? "check" : "copy"} /></button>
                </WorkbenchTooltip>
              </div>
            </div>
            {!isCollapsed ? diffState?.loading ? <div className="dsh-wb-code-review-empty">{t("reading")}</div> : <HarnessReviewDiffContent diff={diffState?.diff ?? null} error={Boolean(diffState?.error)} t={t} diffView={diffView} /> : null}
          </section>;
        })}
      </main>
      {treeVisible ? <>
        <div className="dsh-wb-tree-resize dsh-wb-code-review-resize" role="separator" aria-label={t("resizeTree")} aria-orientation="vertical" aria-valuemin={MIN_TREE_WIDTH} aria-valuemax={MAX_TREE_WIDTH} aria-valuenow={treeWidth} tabIndex={0}
          onPointerDown={(event) => { event.preventDefault(); startResizeDrag(event.currentTarget, event.pointerId, (move) => resizeTree(move.clientX)); }}
          onKeyDown={(event) => {
            if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
            event.preventDefault();
            setTreeWidth((width) => clampTreeWidth(width + (event.key === "ArrowLeft" ? 16 : -16)));
          }}
        />
        <aside className="dsh-wb-code-review-files" style={{ width: treeWidth }} aria-label={t("reviewFileList")}>
          <div className="dsh-wb-code-review-files-head">{t("reviewFileList")}</div>
          <div className="dsh-wb-code-review-search">
            <Icon name="search" />
            <input value={query} aria-label={t("treeFilter")} placeholder={t("treeFilterPlaceholder")} onChange={(event) => setQuery(event.target.value)} onKeyDown={(event) => {
              if (event.key === "Escape" && query) { event.preventDefault(); event.stopPropagation(); setQuery(""); }
              if (event.key === "ArrowDown" && visibleTreeNodes[0]) { event.preventDefault(); moveFocus(visibleTreeNodes[0].path); }
            }} />
            {query ? <WorkbenchTooltip label={t("clearSearch")}><button className="dsh-wb-button dsh-wb-code-review-search-clear" type="button" aria-label={t("clearSearch")} onClick={() => setQuery("")}><Icon name="close" /></button></WorkbenchTooltip> : null}
          </div>
          <div className="dsh-wb-code-review-tree" role="tree" aria-label={t("reviewFileList")}>
            {!visibleTreeNodes.length && files.length ? <div className="dsh-wb-code-review-no-matches">{t("treeNoMatches")}</div> : null}
            <ReviewTree nodes={filteredTree} depth={0} selectedPath={selectedFile?.path ?? ""} focusedPath={treeFocusedPath} collapsed={collapsedFolders} query={query.trim()} onToggle={toggleFolder} onSelect={selectFile} onKeyDown={onTreeKeyDown} rowRefs={rowRefs} />
          </div>
        </aside>
      </> : null}
    </div>
  </section>;
}
