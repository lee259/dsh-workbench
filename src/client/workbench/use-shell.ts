import * as React from "react";
import { shortcutAction } from "../chrome/shortcuts.js";
import { DEFAULT_SIDEBAR_WIDTH, sidebarWidthFromKey, sidebarWidthFromPointer, readSidebarWidth, writeSidebarWidth } from "../chrome/sidebar.js";
import type { TreeCommands } from "../explorer/file-tree.js";
import { readTreeVisible, writeTreeVisible } from "../explorer/tree-model.js";
import type { PreviewCommands } from "../preview/preview-nav.js";
import type { FileState } from "../store.js";
import { followWorkspaceEvents } from "../workspace-events.js";
import { useWorkbenchServices } from "./runtime.js";

function savedSidebarWidth(): number {
  try { return readSidebarWidth(window.localStorage); } catch { return DEFAULT_SIDEBAR_WIDTH; }
}

function savedTreeVisible(): boolean {
  try { return readTreeVisible(window.localStorage); } catch { return true; }
}

export function useWorkbenchShell(readTreeWidth: () => number, writeTreeWidth: (width: number) => void) {
    const { store, i18n } = useWorkbenchServices();
    const state = React.useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot) as FileState;
    const t = i18n.t;
    const [width, setWidth] = React.useState(savedSidebarWidth);
    const [treeWidth, setTreeWidth] = React.useState(readTreeWidth);
    const [treeVisible, setTreeVisible] = React.useState(savedTreeVisible);
    const [revealPath, setRevealPath] = React.useState("");
    const [copied, setCopied] = React.useState(false);
    const [pathCopied, setPathCopied] = React.useState(false);
    const [searchOpen, setSearchOpen] = React.useState(false);
    const [mounted, setMounted] = React.useState(state.visible);
    const [closing, setClosing] = React.useState(false);
    const previewCommands = React.useRef<PreviewCommands | null>(null);
    const treeCommands = React.useRef<TreeCommands | null>(null);
    const sidebarRef = React.useRef<HTMLElement | null>(null);

    const setTreeOpen = (next: boolean) => {
      setTreeVisible(next);
      try { writeTreeVisible(window.localStorage, next); } catch { /* storage may be unavailable */ }
    };
    const showTreeAt = (path: string) => { setTreeOpen(true); setRevealPath(path); };

    React.useEffect(() => {
      const onKey = (event: KeyboardEvent) => {
        const action = shortcutAction(event, state);
        if (!action) return;
        if (action.type === "search") { event.preventDefault(); if (!state.visible) store.show(); setSearchOpen(true); return; }
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
    }, [state.visible, state.active, state.open, searchOpen, treeVisible]);

    React.useEffect(() => followWorkspaceEvents(() => {
      store.noteDiskChange();
      if (store.getSnapshot().active) void store.reload();
    }), []);

    React.useEffect(() => {
      if (state.visible) { setMounted(true); setClosing(false); return; }
      if (!mounted) return;
      setClosing(true);
      const timer = window.setTimeout(() => setMounted(false), 160);
      return () => window.clearTimeout(timer);
    }, [state.visible, mounted]);

    React.useEffect(() => {
      document.body.classList.add("dsh-wb-sidebar-transition");
      return () => { document.body.classList.remove("dsh-wb-sidebar-transition"); document.body.classList.remove("dsh-wb-sidebar-open"); };
    }, []);

    React.useEffect(() => {
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

    return { state, t, width, setWidth, treeWidth, setTreeWidth, treeVisible, setTreeVisible, revealPath, copied, setCopied, pathCopied, setPathCopied, searchOpen, setSearchOpen, mounted, closing, previewCommands, treeCommands, setTreeOpen, showTreeAt, resizeStart, sidebarRef, sidebarWidthFromKey, writeTreeWidth };
}
