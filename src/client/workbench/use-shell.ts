import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { DEFAULT_SIDEBAR_WIDTH, sidebarUsesDrawer, sidebarWidthForViewport, sidebarWidthFromKey, sidebarWidthFromPointer, readSidebarWidth, writeSidebarWidth } from "../chrome/sidebar.js";
import { startResizeDrag } from "../chrome/resize-drag.js";
import { clampTreeWidth, persistTreeWidth, savedTreeWidth, type TreeCommands } from "../explorer/file-tree.js";
import { readTreeVisible, writeTreeOpen, writeTreeVisible } from "../explorer/tree-model.js";
import type { PreviewCommands } from "../preview/preview-nav.js";
import type { DiffPanelCommands } from "../preview/diff-panel.js";
import type { DiffViewMode } from "../preview/code-mirror.js";
import type { FileState } from "../store.js";
import type { TabOpenKind } from "../chrome/tab-model.js";
import { normalizePath, WORKSPACE_API_PATH, type FileOpenMode, type ReviewChange } from "../../shared/types.js";
import { followWorkspaceEvents } from "../workspace-events.js";
import { fetchReview } from "../review/review-data.js";
import { lastWorkbenchSession, sessionIdFromEvent, workbenchShouldReset } from "../workspace-identity.js";
import { useWorkbenchServices } from "./runtime.js";
import { useWorkbenchTabs } from "./use-workbench-tabs.js";
import type { ReviewScope } from "../review/git-diff-panel.js";
import { reviewRefreshAction } from "./review-refresh.js";
import type { WorkbenchFileRequest, WorkbenchReviewRequest } from "../navigation.js";

function savedSidebarWidth(): number {
  try { return readSidebarWidth(window.localStorage); } catch { return DEFAULT_SIDEBAR_WIDTH; }
}

function currentViewportWidth(): number {
  return typeof window === "undefined" ? Number.MAX_SAFE_INTEGER : window.innerWidth;
}

function savedTreeVisible(): boolean {
  try { return readTreeVisible(window.localStorage); } catch { return false; }
}

function workspacePath(path: string, root: string): string {
  const value = normalizePath(path);
  const base = normalizePath(root).replace(/\/$/, "");
  if (base && (value === base || value.startsWith(`${base}/`))) return value.slice(base.length + 1);
  return value;
}

export function useWorkbenchShell({ native = false }: { native?: boolean } = {}) {
    const { store, i18n, navigation } = useWorkbenchServices();
    const state = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot) as FileState;
    const t = i18n.t;
    const [width, setWidth] = useState(savedSidebarWidth);
    const [viewportWidth, setViewportWidth] = useState(currentViewportWidth);
    const sidebarWidth = sidebarWidthForViewport(width, viewportWidth);
    const drawer = sidebarUsesDrawer(viewportWidth);
    const [pathCopied, setPathCopied] = useState(false);
    const [searchOpen, setSearchOpenState] = useState(false);
    const [searchMode, setSearchMode] = useState<"files" | "content">("files");
    const [diffMode, setDiffMode] = useState(false);
    const [diffView, setDiffView] = useState<DiffViewMode>("unified");
    const [reviewTabOpen, setReviewTabOpen] = useState(false);
    const [reviewChanges, setReviewChanges] = useState<ReviewChange[]>([]);
    const [reviewRevision, setReviewRevision] = useState(0);
    const [reviewUpdates, setReviewUpdates] = useState<Record<string, number>>({});
    const [reviewScope, setReviewScope] = useState<ReviewScope>("session");
    const [reviewRevealPath, setReviewRevealPath] = useState("");
    const [reviewRevealVersion, setReviewRevealVersion] = useState(0);
    const [treeVisible, setTreeVisible] = useState(savedTreeVisible);
    const [treeWidth, setTreeWidth] = useState(savedTreeWidth);
    const [revealPath, setRevealPath] = useState("");
    const [workspaceKey, setWorkspaceKey] = useState("");
    const [sessionId, setSessionId] = useState("");
    const [mounted, setMounted] = useState(native || state.visible);
    const [closing, setClosing] = useState(false);
    const [entered, setEntered] = useState(native || state.visible);
    const previewCommands = useRef<PreviewCommands | null>(null);
    const diffCommands = useRef<DiffPanelCommands | null>(null);
    const treeCommands = useRef<TreeCommands | null>(null);
    const latestReviewRequest = useRef(0);
    const latestFileRequest = useRef(0);
    const sidebarRef = useRef<HTMLElement | null>(null);
    const rootRef = useRef("");
    const sessionRef = useRef("");
    const reviewRequestRef = useRef(0);
    const workspaceKeyRef = useRef(workspaceKey);
    const searchRestoreRef = useRef<HTMLElement | null>(null);
    const sessionModeRequestRef = useRef(0);
    const reviewSessionRef = useRef("");
    const reviewUpdateVersionRef = useRef(0);
    const tabs = useWorkbenchTabs({
      activateFile: (path) => { void store.activate(path); },
      closeFile: (path, keepPanelOpen) => store.close(path, keepPanelOpen),
    });
    const { emptyTabOpen, setEmptyTabOpen, emptyFileTabs, emptyFilePaths, activeEmptyFileTab, setActiveEmptyFileTab, newFileTab, activateEmptyFileTab, closeEmptyFileTab, bindEmptyFilePath, replaceActiveEmptyFilePath } = tabs;
    workspaceKeyRef.current = workspaceKey;

    const setSearchOpen = useCallback((open: boolean) => {
      if (open) {
        const active = typeof document === "undefined" ? null : document.activeElement;
        searchRestoreRef.current = typeof HTMLElement !== "undefined" && active instanceof HTMLElement ? active : null;
        setSearchOpenState(true);
        return;
      }
      setSearchOpenState(false);
      const target = searchRestoreRef.current;
      searchRestoreRef.current = null;
      if (target) window.setTimeout(() => target.focus(), 0);
    }, []);

    const openTreeFile = useCallback((path: string, mode: FileOpenMode, line: number | undefined, kind: TabOpenKind) => {
      const previous = emptyFilePaths[activeEmptyFileTab];
      if (previous && previous !== path) {
        const draft = store.editorSession(previous);
        if (draft.baseline !== null && draft.content !== draft.baseline) {
          setActiveEmptyFileTab("");
          void store.open(path, mode, line, false, kind);
          return;
        }
      }
      const replacement = replaceActiveEmptyFilePath(path);
      if (!replacement) {
        setActiveEmptyFileTab("");
        void store.open(path, mode, line, false, kind);
        return;
      }
      if (replacement.previousPath && replacement.previousPath !== path && !replacement.shared) store.close(replacement.previousPath, true);
      void store.open(path, mode, line, false, "keep");
    }, [replaceActiveEmptyFilePath, setActiveEmptyFileTab, store, emptyFilePaths, activeEmptyFileTab]);

    const resetChrome = useCallback(() => {
      setDiffMode(false);
      setDiffView("unified");
      setReviewTabOpen(false);
      setReviewChanges([]);
      setReviewRevealPath("");
      setReviewUpdates({});
      tabs.reset();
      setRevealPath("");
      setSearchOpen(false);
      setPathCopied(false);
      writeTreeOpen(window.localStorage, []);
    }, [store, setSearchOpen]);

    const applyIdentity = useCallback((root: string, sessionId: string) => {
      const nextRoot = root || rootRef.current;
      store.setWorkspace(nextRoot);
      if (workbenchShouldReset(rootRef.current, nextRoot, sessionRef.current, sessionId)) resetChrome();
      if (nextRoot && nextRoot !== rootRef.current) {
        rootRef.current = nextRoot;
        workspaceKeyRef.current = nextRoot;
        setWorkspaceKey(nextRoot);
      }
      if (sessionId !== sessionRef.current) {
        sessionRef.current = sessionId;
        setSessionId(sessionId);
        setReviewUpdates({});
      }
    }, [resetChrome]);

    const syncWorkspace = useCallback(async () => {
      try {
        const response = await fetch(WORKSPACE_API_PATH);
        if (!response.ok) return;
        const next = (await response.json() as { root?: string }).root ?? "";
        if (next) applyIdentity(next, sessionRef.current);
      } catch { /* workspace identity is best effort */ }
    }, [applyIdentity]);

    useEffect(() => {
      // The legacy drawer uses this flag as its mount/visibility contract. In
      // the native Sidebar the host owns visibility, but the existing file
      // tree deliberately refreshes only while this flag is true.
      if (native && !state.visible) store.show();
    }, [native, state.visible, store]);

    useEffect(() => {
      applyIdentity(rootRef.current, lastWorkbenchSession());
      void syncWorkspace();
      const onWorkspaceChange = () => void syncWorkspace();
      const onSessionChange = (event: Event) => applyIdentity(rootRef.current, sessionIdFromEvent(event));
      window.addEventListener("dsh-wb-workspace-change", onWorkspaceChange);
      window.addEventListener("dsh-wb-session-change", onSessionChange);
      return () => {
        window.removeEventListener("dsh-wb-workspace-change", onWorkspaceChange);
        window.removeEventListener("dsh-wb-session-change", onSessionChange);
      };
    }, [applyIdentity, syncWorkspace]);

    useEffect(() => {
      if (!sessionId) return undefined;
      const sessionChanged = sessionId !== reviewSessionRef.current;
      reviewSessionRef.current = sessionId;
      const requestId = ++sessionModeRequestRef.current;
      let cancelled = false;
      void fetchReview(sessionId)
        .then((payload) => {
          if (cancelled || requestId !== sessionModeRequestRef.current) return;
          const hasDiff = (payload.changes?.length ?? 0) > 0;
          setReviewChanges(payload.changes ?? []);
          const action = reviewRefreshAction(sessionChanged, hasDiff);
          if (action) {
            setReviewTabOpen(action.openReview);
            setDiffMode(action.showDiff);
            if (action.openTree) setTreeOpen(true);
          }
        })
        .catch(() => {
          if (cancelled || requestId !== sessionModeRequestRef.current) return;
          setReviewChanges([]);
          const action = reviewRefreshAction(sessionChanged, false);
          if (action) {
            setDiffMode(action.showDiff);
            setReviewTabOpen(action.openReview);
          }
        });
      return () => { cancelled = true; };
    }, [sessionId, reviewRevision]);

    const setTreeOpen = (next: boolean) => {
      setTreeVisible(next);
      if (typeof window !== "undefined") writeTreeVisible(window.localStorage, next);
    };

    const createFileTab = () => {
      newFileTab();
      setDiffMode(false);
      setTreeOpen(true);
    };

    useEffect(() => {
      const onReviewRequest = async (request: WorkbenchReviewRequest) => {
        const requestId = ++reviewRequestRef.current;
        const rawPath = request.path ?? "";
        const path = workspacePath(rawPath, rootRef.current);
        if (requestId !== reviewRequestRef.current) return;
        if (!request.focus) return;
        const shouldFocusReview = native || !state.visible || !diffMode;
        setReviewScope("session");
        if (path) {
          setReviewRevealPath(path);
          setReviewRevealVersion((version) => version + 1);
        }
        if (shouldFocusReview) {
          setTreeOpen(true);
          setReviewTabOpen(true);
          setDiffMode(true);
          if (!native && !state.visible) store.show();
        }
      };
      const receive = (request: WorkbenchReviewRequest, version: number) => {
        latestReviewRequest.current = version;
        void onReviewRequest(request);
      };
      const unsubscribe = navigation.subscribe((request) => {
        if (request.kind !== "review") return false;
        receive(request, navigation.latest()?.version ?? latestReviewRequest.current + 1);
        return true;
      });
      const latest = navigation.latest();
      if (latest?.request.kind === "review" && latest.version > latestReviewRequest.current) {
        receive(latest.request, latest.version);
      }
      return unsubscribe;
    }, [diffMode, native, navigation, state.visible, store]);

    useEffect(() => {
      const onFileRequest = (request: WorkbenchFileRequest) => {
        if (!request.path) return;
        setEmptyTabOpen(false);
        setDiffMode(false);
        openTreeFile(workspacePath(request.path, rootRef.current), request.mode === "diff" ? "diff" : "view", request.line, "preview");
      };
      const receive = (request: WorkbenchFileRequest, version: number) => {
        latestFileRequest.current = version;
        onFileRequest(request);
      };
      const unsubscribe = navigation.subscribe((request) => {
        if (request.kind !== "file") return false;
        receive(request, navigation.latest()?.version ?? latestFileRequest.current + 1);
        return true;
      });
      const latest = navigation.latest();
      if (latest?.request.kind === "file" && latest.version > latestFileRequest.current) {
        receive(latest.request, latest.version);
      }
      return unsubscribe;
    }, [navigation, openTreeFile]);

    useEffect(() => {
      const path = activeEmptyFileTab ? emptyFilePaths[activeEmptyFileTab] : "";
      if (path && state.active !== path) void store.activate(path);
    }, [activeEmptyFileTab, emptyFilePaths, state.active, store]);

    useEffect(() => followWorkspaceEvents(({ paths }) => {
      if (paths.length > 0) {
        setReviewUpdates((current) => {
          const next = { ...current };
          for (const path of paths) next[workspacePath(path, rootRef.current)] = ++reviewUpdateVersionRef.current;
          return next;
        });
      } else {
        setReviewRevision((revision) => revision + 1);
      }
      store.noteDiskChange();
      if (store.getSnapshot().active) void store.reload();
    }, undefined, ({ path }) => {
      const updatePath = workspacePath(path, rootRef.current);
      setReviewUpdates((current) => ({ ...current, [updatePath]: ++reviewUpdateVersionRef.current }));
    }, () => {
      window.dispatchEvent(new Event("dsh-wb-activity-change"));
    }), [store]);

    useEffect(() => {
      if (native) return;
      if (state.visible) { setMounted(true); setClosing(false); return; }
      if (!mounted) return;
      setClosing(true);
      const timer = window.setTimeout(() => setMounted(false), 160);
      return () => window.clearTimeout(timer);
    }, [native, state.visible, mounted]);

    useEffect(() => {
      if (native) return;
      if (!state.visible) { setEntered(false); return; }
      if (!mounted) return;
      const frame = window.requestAnimationFrame(() => setEntered(true));
      return () => window.cancelAnimationFrame(frame);
    }, [native, state.visible, mounted]);

    useEffect(() => {
      if (native) return;
      const appRoot = document.getElementById("root");
      appRoot?.classList.add("dsh-wb-sidebar-transition");
      return () => {
        appRoot?.classList.remove("dsh-wb-sidebar-transition");
        appRoot?.classList.remove("dsh-wb-sidebar-open");
        appRoot?.classList.remove("dsh-wb-sidebar-drawer");
        appRoot?.style.removeProperty("--dsh-wb-sidebar-width");
      };
    }, [native]);

    useEffect(() => {
      const updateViewportWidth = () => setViewportWidth(window.innerWidth);
      window.addEventListener("resize", updateViewportWidth);
      return () => window.removeEventListener("resize", updateViewportWidth);
    }, []);

    useEffect(() => {
      if (native) return;
      const appRoot = document.getElementById("root");
      const open = state.visible && mounted && entered;
      appRoot?.classList.toggle("dsh-wb-sidebar-open", open);
      appRoot?.classList.toggle("dsh-wb-sidebar-drawer", open && drawer);
      appRoot?.style.setProperty("--dsh-wb-sidebar-width", `${sidebarWidth}px`);
      writeSidebarWidth(window.localStorage, width);
    }, [drawer, native, state.visible, mounted, entered, sidebarWidth, width]);

    const resizeStart = (event: React.PointerEvent<HTMLElement>) => {
      event.preventDefault();
      startResizeDrag(event.currentTarget, event.pointerId, (move) => {
        setWidth(sidebarWidthFromPointer(move.clientX, window.innerWidth));
      });
    };

    const showTreeAt = (path: string) => { setActiveEmptyFileTab(""); setTreeOpen(true); setDiffMode(false); setRevealPath(path); };
    const openReviewTab = () => { setActiveEmptyFileTab(""); setEmptyTabOpen(false); setReviewTabOpen(true); setDiffMode(true); setTreeOpen(true); };
    const closeReviewTab = () => { setReviewTabOpen(false); setDiffMode(false); };
    const resizeTree = (next: number) => { const value = clampTreeWidth(next); setTreeWidth(value); persistTreeWidth(value); };
    const handleTreeFileOpen = useCallback((path: string, mode: FileOpenMode, kind: TabOpenKind) => {
      openTreeFile(path, mode, undefined, kind);
    }, [openTreeFile]);
    return { state, t, width: sidebarWidth, drawer, setWidth, pathCopied, setPathCopied, searchOpen, setSearchOpen, searchMode, setSearchMode, diffMode, setDiffMode, diffView, setDiffView, reviewTabOpen, openReviewTab, closeReviewTab, reviewChanges, reviewRevealPath, reviewRevealVersion, reviewRevision, reviewUpdates, reviewScope, setReviewScope, emptyTabOpen, setEmptyTabOpen, emptyFileTabs, emptyFilePaths, activeEmptyFileTab, setActiveEmptyFileTab, newFileTab: createFileTab, activateEmptyFileTab, closeEmptyFileTab, bindEmptyFilePath, treeVisible, setTreeOpen, treeWidth, revealPath, treeCommands, previewCommands, diffCommands, mounted, closing, showTreeAt, resizeTree, handleTreeFileOpen, workspaceKey, sessionId, resizeStart, sidebarRef, sidebarWidthFromKey };
}
