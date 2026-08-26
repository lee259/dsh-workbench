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
  closeFile?(path: string): void;
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

  const setActiveEmptyFileTab = useCallback((id: string) => {
    setState((current) => id ? activateState(current, id) : clearActiveEmptyFileTab(current));
  }, []);

  const newFileTab = useCallback(() => {
    const id = `empty-file-${++nextId.current}`;
    setState((current) => addEmptyFileTab(current, id));
    setEmptyTabOpen(false);
  }, []);

  const activateEmptyFileTab = useCallback((id: string) => {
    const current = stateRef.current;
    const path = current.paths[id];
    if (current.ids.includes(id) && path) effectsRef.current.activateFile?.(path);
    setState((current) => activateState(current, id));
    setEmptyTabOpen(false);
  }, []);

  const closeEmptyFileTab = useCallback((id: string) => {
    const path = stateRef.current.paths[id];
    if (path) effectsRef.current.closeFile?.(path);
    setState((current) => closeState(current, id));
  }, []);

  const bindEmptyFilePath = useCallback((path: string) => {
    setState((current) => bindEmptyFileTab(current, path));
  }, []);

  const reset = useCallback(() => {
    setState(createState());
    setEmptyTabOpen(false);
  }, []);

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
    reset,
  };
}
