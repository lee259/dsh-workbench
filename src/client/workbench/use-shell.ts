import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { shortcutAction } from "../chrome/shortcuts.js";
import { DEFAULT_SIDEBAR_WIDTH, sidebarWidthFromKey, sidebarWidthFromPointer, readSidebarWidth, writeSidebarWidth } from "../chrome/sidebar.js";
import { clampTreeWidth, persistTreeWidth, savedTreeWidth, type TreeCommands } from "../explorer/file-tree.js";
import { readTreeVisible, writeTreeOpen, writeTreeVisible } from "../explorer/tree-model.js";
import type { PreviewCommands } from "../preview/preview-nav.js";
import type { FileState } from "../store.js";
import { WORKSPACE_API_PATH } from "../../shared/types.js";
import { followWorkspaceEvents } from "../workspace-events.js";
import { lastWorkbenchSession, sessionIdFromEvent, workbenchShouldReset } from "../workspace-identity.js";
import { useWorkbenchServices } from "./runtime.js";

function savedSidebarWidth(): number {
  try { return readSidebarWidth(window.localStorage); } catch { return DEFAULT_SIDEBAR_WIDTH; }
}

function savedTreeVisible(): boolean {
  try { return readTreeVisible(window.localStorage); } catch { return true; }
}

export function useWorkbenchShell() {
    const { store, i18n } = useWorkbenchServices();
    const state = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot) as FileState;
    const t = i18n.t;
    const [width, setWidth] = useState(savedSidebarWidth);
    const [pathCopied, setPathCopied] = useState(false);
    const [searchOpen, setSearchOpenState] = useState(false);
    const [searchMode, setSearchMode] = useState<"files" | "content">("files");
    const [diffMode, setDiffMode] = useState(false);
    const [treeVisible, setTreeVisible] = useState(savedTreeVisible);
    const [treeWidth, setTreeWidth] = useState(savedTreeWidth);
    const [revealPath, setRevealPath] = useState("");
    const [workspaceKey, setWorkspaceKey] = useState("");
    const [sessionId, setSessionId] = useState("");
    const [mounted, setMounted] = useState(state.visible);
    const [closing, setClosing] = useState(false);
    const previewCommands = useRef<PreviewCommands | null>(null);
    const treeCommands = useRef<TreeCommands | null>(null);
    const sidebarRef = useRef<HTMLElement | null>(null);
    const rootRef = useRef("");
    const sessionRef = useRef("");
    const workspaceKeyRef = useRef(workspaceKey);
    const searchRestoreRef = useRef<HTMLElement | null>(null);
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

    const resetChrome = useCallback(() => {
      store.close();
      setDiffMode(false);
      setRevealPath("");
      setSearchOpen(false);
      setPathCopied(false);
      writeTreeOpen(window.localStorage, []);
    }, [store, setSearchOpen]);

    const applyIdentity = useCallback((root: string, sessionId: string) => {
      const nextRoot = root || rootRef.current;
      if (workbenchShouldReset(rootRef.current, nextRoot)) resetChrome();
      if (nextRoot && nextRoot !== rootRef.current) {
        rootRef.current = nextRoot;
        workspaceKeyRef.current = nextRoot;
        setWorkspaceKey(nextRoot);
      }
      if (sessionId !== sessionRef.current) {
        sessionRef.current = sessionId;
        setSessionId(sessionId);
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

    const setTreeOpen = (next: boolean) => {
      setTreeVisible(next);
      writeTreeVisible(window.localStorage, next);
    };

    useEffect(() => {
      const onReviewRequest = () => {
        setTreeOpen(true);
        setDiffMode(true);
        if (!state.visible) store.show();
      };
      window.addEventListener("dsh-wb-review-request", onReviewRequest);
      return () => window.removeEventListener("dsh-wb-review-request", onReviewRequest);
    }, [state.visible, store]);

    useEffect(() => {
      const onKey = (event: KeyboardEvent) => {
        const action = shortcutAction(event, state);
        if (!action) return;
        if (action.type === "search" || action.type === "contentSearch") { event.preventDefault(); if (!state.visible) store.show(); setSearchMode(action.type === "contentSearch" ? "content" : "files"); setSearchOpen(true); return; }
        if (action.type === "toggle") { event.preventDefault(); if (state.visible) store.hide(); else store.show(); return; }
        if (action.type === "toggleTree") { event.preventDefault(); if (!state.visible) store.show(); setTreeOpen(!treeVisible); return; }
        if (action.type === "find") {
          if (!(event.target instanceof Node) || !sidebarRef.current?.contains(event.target)) return;
          event.preventDefault(); previewCommands.current?.find(); return;
        }
        if (action.type === "gotoLine") {
          if (!(event.target instanceof Node) || !sidebarRef.current?.contains(event.target)) return;
          event.preventDefault(); previewCommands.current?.goToLine(); return;
        }
        event.preventDefault();
        if (action.type === "hide") {
          if (searchOpen) setSearchOpen(false);
          else if (treeCommands.current?.consumeEscape()) return;
          else store.hide();
        } else if (action.type === "close") store.close(action.path);
        else void store.activate(action.path);
      };
      window.addEventListener("keydown", onKey);
      return () => window.removeEventListener("keydown", onKey);
    }, [state.visible, state.active, state.open, searchOpen, store, treeVisible]);

    useEffect(() => followWorkspaceEvents(() => {
      store.noteDiskChange();
      if (store.getSnapshot().active) void store.reload();
    }, undefined, ({ path }) => {
      void store.open(path, "diff", undefined, true, "keep");
    }), [store]);

    useEffect(() => {
      if (state.visible) { setMounted(true); setClosing(false); return; }
      if (!mounted) return;
      setClosing(true);
      const timer = window.setTimeout(() => setMounted(false), 160);
      return () => window.clearTimeout(timer);
    }, [state.visible, mounted]);

    useEffect(() => {
      document.body.classList.add("dsh-wb-sidebar-transition");
      return () => { document.body.classList.remove("dsh-wb-sidebar-transition"); document.body.classList.remove("dsh-wb-sidebar-open"); };
    }, []);

    useEffect(() => {
      document.body.classList.toggle("dsh-wb-sidebar-open", state.visible);
      document.body.style.setProperty("--dsh-wb-sidebar-width", `${width}px`);
      writeSidebarWidth(window.localStorage, width);
    }, [state.visible, width]);

    const resizeStart = (event: { preventDefault(): void }) => {
      event.preventDefault();
      const onMove = (move: PointerEvent) => setWidth(sidebarWidthFromPointer(move.clientX, window.innerWidth));
      const onUp = () => { window.removeEventListener("pointermove", onMove); window.removeEventListener("pointerup", onUp); };
      window.addEventListener("pointermove", onMove);
      window.addEventListener("pointerup", onUp, { once: true });
    };

    const showTreeAt = (path: string) => { setTreeOpen(true); setDiffMode(false); setRevealPath(path); };
    const resizeTree = (next: number) => { const value = clampTreeWidth(next); setTreeWidth(value); persistTreeWidth(value); };
    return { state, t, width, setWidth, pathCopied, setPathCopied, searchOpen, setSearchOpen, searchMode, setSearchMode, diffMode, setDiffMode, treeVisible, setTreeOpen, treeWidth, revealPath, treeCommands, previewCommands, mounted, closing, showTreeAt, resizeTree, workspaceKey, sessionId, resizeStart, sidebarRef, sidebarWidthFromKey };
}
