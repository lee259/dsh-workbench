import type { LocaleStore } from "../../shared/i18n.js";
import type { WorkspaceTree as WorkspaceTreeData } from "../../shared/types.js";
import { FileTypeIcon, Icon, TreeChevron } from "../chrome/icons.js";
import { insertDraftText } from "./draft-insert.js";
import { highlightSegments, moveSearchFocus, treeSearchHits } from "./search-model.js";
import { fetchWorkspaceTree, type FileStore } from "../store.js";
import {
  DEFAULT_TREE_WIDTH,
  MAX_TREE_WIDTH,
  MIN_TREE_WIDTH,
  ancestorDirectories,
  clampTreeWidth,
  consumeTreeEscape,
  directoriesToReveal,
  emptyTree,
  flattenVisibleRows,
  mergeOpenDirectories,
  readTreeOpen,
  readTreeWidth,
  treeFileOpenMode,
  treeKeyAction,
  writeTreeOpen,
  writeTreeWidth,
} from "./tree-model.js";

type ReactNs = typeof import("react");

export type TreeCommands = {
  consumeEscape(): boolean;
};

function storage(): Pick<Storage, "getItem" | "setItem"> | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function savedTreeWidth(): number {
  const local = storage();
  return local ? readTreeWidth(local) : DEFAULT_TREE_WIDTH;
}

function savedTreeOpen(): string[] {
  const local = storage();
  return local ? readTreeOpen(local) : [];
}

function persistTreeOpen(value: string[]): void {
  const local = storage();
  if (local) writeTreeOpen(local, value);
}

function persistTreeWidth(value: number): void {
  const local = storage();
  if (local) writeTreeWidth(local, value);
}

export { clampTreeWidth };

export function createFileTree(React: ReactNs, store: FileStore, i18n: LocaleStore) {
  function useLocale() {
    React.useSyncExternalStore(i18n.subscribe, i18n.getSnapshot, i18n.getSnapshot);
    return i18n.t;
  }

  function WorkspaceTreePanel({
    width,
    onResize,
    revealPath = "",
    commandsRef,
  }: {
    width: number;
    onResize: (width: number) => void;
    revealPath?: string;
    commandsRef?: { current: TreeCommands | null };
  }) {
    const t = useLocale();
    const fileState = React.useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot);
    const [tree, setTree] = React.useState<WorkspaceTreeData>(emptyTree);
    const [query, setQuery] = React.useState("");
    const [open, setOpen] = React.useState<string[]>(savedTreeOpen);
    const [loading, setLoading] = React.useState(false);
    const [failed, setFailed] = React.useState(false);
    const [hitIndex, setHitIndex] = React.useState(0);
    const [focusedPath, setFocusedPath] = React.useState(fileState.active);
    const [locatePath, setLocatePath] = React.useState("");
    const [pendingReveal, setPendingReveal] = React.useState("");
    const lastReveal = React.useRef(0);
    const [contextMenu, setContextMenu] = React.useState<{ path: string; x: number; y: number } | null>(null);
    const listRef = React.useRef<HTMLDivElement | null>(null);
    const searchRef = React.useRef<HTMLInputElement | null>(null);
    const normalizedQuery = query.trim();
    const rows = flattenVisibleRows(tree, open);
    const hits = treeSearchHits(tree, normalizedQuery);
    const filtering = Boolean(normalizedQuery);

    const refreshTree = React.useCallback(() => {
      setLoading(true);
      setFailed(false);
      void fetchWorkspaceTree().then(setTree).catch(() => {
        setTree(emptyTree());
        setFailed(true);
      }).finally(() => setLoading(false));
    }, []);

    const expandTo = React.useCallback((path: string) => {
      if (!path) return;
      setOpen((current) => {
        const extra = tree.directories.includes(path) ? directoriesToReveal(path) : ancestorDirectories(path);
        const next = mergeOpenDirectories(current, extra);
        persistTreeOpen(next);
        return next;
      });
    }, [tree.directories]);

    const focusRow = (path: string) => {
      setFocusedPath(path);
      const node = listRef.current?.querySelector(`[data-path="${CSS.escape(path)}"]`);
      if (node instanceof HTMLElement) {
        node.focus();
        node.scrollIntoView({ block: "nearest" });
      }
    };

    const locate = (path: string) => {
      expandTo(path);
      setLocatePath(path);
      setQuery("");
      setHitIndex(0);
      setContextMenu(null);
    };

    const openFromTree = (path: string, kind: "preview" | "keep" = "preview") => {
      void store.open(path, treeFileOpenMode(), undefined, false, kind);
      setContextMenu(null);
    };

    React.useEffect(() => {
      if (fileState.visible) refreshTree();
    }, [fileState.visible, fileState.payload?.revision, fileState.disk, refreshTree]);

    React.useEffect(() => {
      if (fileState.reveal === lastReveal.current) return;
      lastReveal.current = fileState.reveal;
      if (fileState.active) setPendingReveal(fileState.active);
    }, [fileState.reveal, fileState.active]);

    React.useEffect(() => {
      const target = locatePath || revealPath || pendingReveal || fileState.active;
      if (target) expandTo(target);
    }, [locatePath, revealPath, pendingReveal, fileState.active, expandTo]);

    React.useEffect(() => {
      const target = locatePath || revealPath;
      if (!target) return;
      const frame = window.requestAnimationFrame(() => focusRow(target));
      return () => window.cancelAnimationFrame(frame);
    }, [locatePath, revealPath, tree, open]);

    React.useEffect(() => {
      if (!pendingReveal) return;
      let tries = 0;
      let frame = 0;
      const seek = () => {
        const node = listRef.current?.querySelector(`[data-path="${CSS.escape(pendingReveal)}"]`);
        if (node instanceof HTMLElement) {
          node.scrollIntoView({ block: "nearest" });
          return;
        }
        if (tries++ < 8) frame = window.requestAnimationFrame(seek);
      };
      frame = window.requestAnimationFrame(seek);
      return () => window.cancelAnimationFrame(frame);
    }, [pendingReveal]);

    React.useEffect(() => {
      const close = () => setContextMenu(null);
      window.addEventListener("click", close);
      return () => window.removeEventListener("click", close);
    }, []);

    React.useEffect(() => {
      if (!commandsRef) return;
      commandsRef.current = {
        consumeEscape() {
          const layer = consumeTreeEscape({ menu: contextMenu != null, query });
          if (layer === "menu") {
            setContextMenu(null);
            return true;
          }
          if (layer === "query") {
            setQuery("");
            setHitIndex(0);
            return true;
          }
          return false;
        },
      };
      return () => {
        commandsRef.current = null;
      };
    }, [commandsRef, contextMenu, query]);

    const toggleDirectory = (path: string) => {
      setOpen((current) => {
        const next = current.includes(path) ? current.filter((item) => item !== path) : [...current, path];
        persistTreeOpen(next);
        return next;
      });
    };

    const applyTreeAction = (path: string, kind: "directory" | "file", action: "toggle" | "open" | "move") => {
      if (action === "move") {
        focusRow(path);
        return;
      }
      if (kind === "directory" || action === "toggle") {
        toggleDirectory(path);
        setFocusedPath(path);
        return;
      }
      openFromTree(path);
    };

    const showContextMenu = (event: React.MouseEvent, path: string) => {
      event.preventDefault();
      event.stopPropagation();
      setContextMenu({ path, x: Math.min(event.clientX, Math.max(8, window.innerWidth - 178)), y: Math.min(event.clientY, Math.max(8, window.innerHeight - 124)) });
    };

    const onTreeKeyDown = (event: React.KeyboardEvent, path = focusedPath || fileState.active || rows[0]?.path) => {
      if (!path) return;
      const action = treeKeyAction(event.key, rows, path, open);
      if (!action) return;
      event.preventDefault();
      const row = rows.find((item) => item.path === action.path);
      applyTreeAction(action.path, row?.kind ?? "file", action.type);
    };

    const renderNodes = () => rows.map((item) => {
      const internal = item.kind === "directory";
      const isOpen = open.includes(item.path);
      const selected = item.path === fileState.active;
      const focused = item.path === focusedPath;
      return <button key={item.path} id={`dsh-wb-tree-row-${item.path}`} type="button" role="treeitem" tabIndex={focused ? 0 : -1}
        data-path={item.path} data-depth={item.depth} aria-level={item.depth + 1} aria-selected={selected} aria-expanded={internal ? isOpen : undefined}
        className={`dsh-wb-tree-row${selected ? " is-selected" : ""}${focused ? " is-focused" : ""}`} style={{ paddingLeft: `${6 + item.depth * 14}px` }} draggable={!internal}
        onDragStart={(event: React.DragEvent) => { if (!internal) { event.dataTransfer.setData("text/plain", item.path); event.dataTransfer.effectAllowed = "copy"; } }}
        onContextMenu={(event: React.MouseEvent) => showContextMenu(event, item.path)} onKeyDown={(event: React.KeyboardEvent) => onTreeKeyDown(event, item.path)}
        onFocus={() => setFocusedPath(item.path)} onDoubleClick={internal ? undefined : () => openFromTree(item.path, "keep")}
        onClick={internal ? () => toggleDirectory(item.path) : () => openFromTree(item.path)}>
        <TreeChevron open={isOpen} leaf={!internal} />
        <FileTypeIcon path={item.name} directory={internal} open={isOpen} />
        <span className="dsh-wb-tree-name">{item.name}</span>
      </button>;
    });

    const renderHits = () => hits.map((hit, index) => <button key={hit.path} id={`dsh-wb-tree-hit-${index}`} type="button" role="option"
      aria-selected={index === hitIndex} className={`dsh-wb-tree-hit${index === hitIndex ? " is-active" : ""}`} onMouseEnter={() => setHitIndex(index)} onClick={() => locate(hit.path)}>
      <FileTypeIcon path={hit.name} directory={tree.directories.includes(hit.path)} />
      <span className="dsh-wb-search-result-copy">
        <span className="dsh-wb-search-result-name">{highlightSegments(hit.name, normalizedQuery).map((segment, segmentIndex) => (
          segment.match ? <mark key={segmentIndex} className="dsh-wb-search-mark">{segment.text}</mark> : <span key={segmentIndex}>{segment.text}</span>
        ))}</span>
        {hit.parent ? <span className="dsh-wb-search-result-parent">{hit.parent}</span> : null}
      </span>
    </button>);

    const menuPath = contextMenu?.path ?? "";
    const menuIsDirectory = tree.directories.includes(menuPath);

    return <>
      <div className="dsh-wb-tree-resize" role="separator" aria-label={t("resizeTree")} aria-orientation="vertical"
        aria-valuemin={MIN_TREE_WIDTH} aria-valuemax={MAX_TREE_WIDTH} aria-valuenow={width} tabIndex={0}
        onPointerDown={(event: React.PointerEvent) => {
          event.preventDefault();
          const onMove = (move: PointerEvent) => onResize(window.innerWidth - move.clientX);
          const onUp = () => { window.removeEventListener("pointermove", onMove); window.removeEventListener("pointerup", onUp); };
          window.addEventListener("pointermove", onMove);
          window.addEventListener("pointerup", onUp, { once: true });
        }}
        onKeyDown={(event: React.KeyboardEvent) => {
          if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
          event.preventDefault();
          onResize(clampTreeWidth(width + (event.key === "ArrowLeft" ? 16 : -16)));
        }} />
      <aside className="dsh-wb-tree" style={{ width }} aria-label={t("workspaceTree")}>
        <div className="dsh-wb-tree-head">
          <div className="dsh-wb-tree-search">
            <Icon name="search" />
            <input ref={searchRef} value={query} aria-label={t("treeFilter")} aria-controls={filtering ? "dsh-wb-tree-hits" : undefined} placeholder={t("treeFilterPlaceholder")}
              onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
                setQuery(event.target.value);
                setHitIndex(0);
              }}
              onKeyDown={(event: React.KeyboardEvent) => {
                if (event.key === "Escape" && normalizedQuery) {
                  event.preventDefault();
                  event.stopPropagation();
                  setQuery("");
                  return;
                }
                if (event.key === "ArrowDown") {
                  event.preventDefault();
                  if (filtering && hits[0]) {
                    setHitIndex(0);
                    listRef.current?.querySelector<HTMLElement>(".dsh-wb-tree-hit")?.focus();
                    return;
                  }
                  if (rows[0]) focusRow(rows[0].path);
                }
                if (event.key === "Enter" && filtering && hits[hitIndex]) {
                  event.preventDefault();
                  locate(hits[hitIndex].path);
                }
              }} />
            {normalizedQuery ? <button type="button" className="dsh-wb-tree-search-clear" aria-label={t("clearSearch")} onClick={() => setQuery("")}><Icon name="close" /></button> : null}
          </div>
          <button type="button" className="dsh-wb-button dsh-wb-icon-button" aria-label={t("collapseFolders")} title={t("collapseFolders")} disabled={open.length === 0}
            onClick={() => {
              setOpen([]);
              persistTreeOpen([]);
            }}><Icon name="collapse" /></button>
          <button type="button" className="dsh-wb-button dsh-wb-icon-button dsh-wb-tree-refresh" aria-label={t("refresh")} title={t("refresh")} data-loading={loading ? "true" : "false"} onClick={refreshTree}><Icon name="refresh" /></button>
        </div>
        {filtering ? <div id="dsh-wb-tree-hits" className="dsh-wb-tree-hits" role="listbox" aria-label={t("treeFilter")} ref={listRef}
          onKeyDown={(event: React.KeyboardEvent) => {
            if (event.key === "ArrowDown" || event.key === "ArrowUp") {
              event.preventDefault();
              setHitIndex((current) => moveSearchFocus(hits.length, current, event.key === "ArrowDown" ? 1 : -1));
              return;
            }
            if (event.key === "Enter" && hits[hitIndex]) {
              event.preventDefault();
              locate(hits[hitIndex].path);
            }
          }}>
          <div className="dsh-wb-search-state">{hits.length === 0 ? t("treeNoMatches") : t("treeMatchCount", { count: hits.length })}</div>
          {renderHits()}
        </div> : <div className="dsh-wb-tree-list" role="tree" tabIndex={rows.length === 0 ? 0 : -1}
          aria-activedescendant={focusedPath ? `dsh-wb-tree-row-${focusedPath}` : undefined} ref={listRef}
          onKeyDown={(event: React.KeyboardEvent) => {
            if (event.target === event.currentTarget) onTreeKeyDown(event);
          }}>
          {failed ? <div className="dsh-wb-search-state">{t("searchError")}</div> : null}
          {!failed && rows.length === 0 && !loading ? <div className="dsh-wb-search-state">{t("treeEmpty")}</div> : null}
          {renderNodes()}
        </div>}
        {contextMenu ? <div className="dsh-wb-context-menu" role="menu" aria-label={t("fileMenu")} style={{ left: contextMenu.x, top: contextMenu.y }} onClick={(event: React.MouseEvent) => event.stopPropagation()}>
          <button type="button" role="menuitem" onClick={() => menuIsDirectory ? locate(menuPath) : openFromTree(menuPath, "keep")}>{t(menuIsDirectory ? "revealInTree" : "openFileAction")}</button>
          <button type="button" role="menuitem" onClick={() => { insertDraftText(document, menuPath); setContextMenu(null); }}>{t("insertPathAction")}</button>
          <button type="button" role="menuitem" onClick={() => { if (navigator.clipboard) void navigator.clipboard.writeText(menuPath); setContextMenu(null); }}>{t("copyPathAction")}</button>
          <button type="button" role="menuitem" onClick={() => { setContextMenu(null); refreshTree(); }}>{t("refresh")}</button>
        </div> : null}
      </aside>
    </>;
  }

  return {
    WorkspaceTreePanel,
    readTreeWidth: savedTreeWidth,
    writeTreeWidth: persistTreeWidth,
  };
}
