export type EmptyFileTabs = {
  ids: string[];
  paths: Record<string, string>;
  activeId: string;
};

export function emptyFileTabs(): EmptyFileTabs {
  return { ids: [], paths: {}, activeId: "" };
}

export function addEmptyFileTab(state: EmptyFileTabs, id: string): EmptyFileTabs {
  return {
    ids: [...state.ids, id],
    paths: { ...state.paths, [id]: "" },
    activeId: id,
  };
}

export function activateEmptyFileTab(state: EmptyFileTabs, id: string): EmptyFileTabs {
  if (!state.ids.includes(id)) return state;
  return { ...state, activeId: id };
}

export function bindEmptyFileTab(state: EmptyFileTabs, path: string): EmptyFileTabs {
  if (!state.activeId || !state.ids.includes(state.activeId)) return state;
  return { ...state, paths: { ...state.paths, [state.activeId]: path } };
}

export function clearActiveEmptyFileTab(state: EmptyFileTabs): EmptyFileTabs {
  return { ...state, activeId: "" };
}

export function closeEmptyFileTab(state: EmptyFileTabs, id: string): EmptyFileTabs {
  if (!state.ids.includes(id)) return state;
  const ids = state.ids.filter((item) => item !== id);
  const paths = { ...state.paths };
  delete paths[id];
  return { ids, paths, activeId: state.activeId === id ? "" : state.activeId };
}
