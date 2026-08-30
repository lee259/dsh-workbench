import { useCallback, useRef, useState } from "react";
import {
  activateEmptyFileTab as activateState,
  addEmptyFileTab,
  bindEmptyFileTab,
  clearActiveEmptyFileTab,
  closeEmptyFileTab as closeState,
  emptyFileTabs as createState,
  type EmptyFileTabs,
} from "./tab-model.js";

export type WorkbenchTabEffects = {
  activateFile?(path: string): void;
  closeFile?(path: string, keepPanelOpen: boolean): void;
};

export function useWorkbenchTabs(effects: WorkbenchTabEffects = {}) {
  const [emptyTabOpen, setEmptyTabOpen] = useState(false);
  const [state, setState] = useState<EmptyFileTabs>(createState);
  const nextId = useRef(0);
  const stateRef = useRef(state);
  const effectsRef = useRef(effects);
  stateRef.current = state;
  effectsRef.current = effects;

  const emptyFileTabs = state.ids;
  const emptyFilePaths = state.paths;
  const activeEmptyFileTab = state.activeId;

  const updateState = useCallback((update: (current: EmptyFileTabs) => EmptyFileTabs) => {
    const next = update(stateRef.current);
    stateRef.current = next;
    setState(next);
  }, []);

  const setActiveEmptyFileTab = useCallback((id: string) => {
    updateState((current) => id ? activateState(current, id) : clearActiveEmptyFileTab(current));
  }, [updateState]);

  const newFileTab = useCallback(() => {
    const id = `empty-file-${++nextId.current}`;
    updateState((current) => addEmptyFileTab(current, id));
    setEmptyTabOpen(false);
  }, [updateState]);

  const activateEmptyFileTab = useCallback((id: string) => {
    const current = stateRef.current;
    const path = current.paths[id];
    if (current.ids.includes(id) && path) effectsRef.current.activateFile?.(path);
    updateState((next) => activateState(next, id));
    setEmptyTabOpen(false);
  }, [updateState]);

  const closeEmptyFileTab = useCallback((id: string, keepPanelOpen = false) => {
    const current = stateRef.current;
    const path = current.paths[id];
    const next = closeState(current, id);
    if (path) effectsRef.current.closeFile?.(path, keepPanelOpen);
    updateState(() => next);
    const nextPath = next.activeId ? next.paths[next.activeId] : "";
    if (nextPath) effectsRef.current.activateFile?.(nextPath);
  }, [updateState]);

  const bindEmptyFilePath = useCallback((path: string) => {
    updateState((current) => bindEmptyFileTab(current, path));
  }, [updateState]);

  const bindActiveEmptyFilePath = useCallback((path: string): boolean => {
    const current = stateRef.current;
    if (!current.activeId || !current.ids.includes(current.activeId)) return false;
    updateState((next) => bindEmptyFileTab(next, path));
    return true;
  }, [updateState]);

  const replaceActiveEmptyFilePath = useCallback((path: string): { previousPath: string; shared: boolean } | null => {
    const current = stateRef.current;
    const id = current.activeId;
    if (!id || !current.ids.includes(id)) return null;
    const previousPath = current.paths[id] ?? "";
    const shared = Boolean(previousPath) && current.ids.some((otherId) => otherId !== id && current.paths[otherId] === previousPath);
    updateState((next) => bindEmptyFileTab(next, path));
    return { previousPath, shared };
  }, [updateState]);

  const reset = useCallback(() => {
    updateState(createState);
    setEmptyTabOpen(false);
  }, [updateState]);

  return {
    emptyTabOpen,
    setEmptyTabOpen,
    emptyFileTabs,
    emptyFilePaths,
    activeEmptyFileTab,
    setActiveEmptyFileTab,
    newFileTab,
    activateEmptyFileTab,
    closeEmptyFileTab,
    bindEmptyFilePath,
    bindActiveEmptyFilePath,
    replaceActiveEmptyFilePath,
    reset,
  };
}
