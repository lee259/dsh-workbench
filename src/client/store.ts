import { CONTENT_SEARCH_API_PATH, FILE_API_PATH, FILES_API_PATH, normalizePath, type ContentSearchHit, type FileOpenMode, type FilePayload, type WorkspaceFile, type WorkspaceTree } from "../shared/types.js";
import { nextOpenTabs, type TabOpenKind } from "./chrome/tab-model.js";
import { viewKind, type ViewKind } from "./preview/editor-spec.js";

export type FileState = {
  open: string[];
  active: string;
  path: string;
  line: number | null;
  loading: boolean;
  payload: FilePayload | null;
  error: string;
  visible: boolean;
  reveal: number;
  disk: number;
  views: Record<string, ViewKind>;
  preview: string;
};

export type FileLoader = (path: string, mode?: FileOpenMode) => Promise<FilePayload>;

export type FileStore = {
  getSnapshot(): FileState;
  subscribe(listener: () => void): () => void;
  open(path: string, mode?: FileOpenMode, line?: number, reveal?: boolean, kind?: TabOpenKind): Promise<void>;
  activate(path: string, mode?: FileOpenMode, line?: number): Promise<void>;
  pin(path: string): void;
  close(path?: string): void;
  reload(): Promise<void>;
  show(): void;
  hide(): void;
  noteDiskChange(): void;
};

const empty: FileState = {
  open: [],
  active: "",
  path: "",
  line: null,
  loading: false,
  payload: null,
  error: "",
  visible: false,
  reveal: 0,
  disk: 0,
  views: {},
  preview: "",
};

export async function fetchWorkspaceFile(path: string, mode: FileOpenMode = "auto"): Promise<FilePayload> {
  const response = await fetch(`${FILE_API_PATH}?path=${encodeURIComponent(path)}&mode=${mode}`);
  const payload = await response.json() as FilePayload & { error?: string };
  if (!response.ok) throw new Error(payload.error || "read_failed");
  return payload;
}

export async function fetchWorkspaceFiles(query = ""): Promise<WorkspaceFile[]> {
  const response = await fetch(`${FILES_API_PATH}?q=${encodeURIComponent(query)}`);
  const payload = await response.json() as { files?: WorkspaceFile[]; error?: string };
  if (!response.ok) throw new Error(payload.error || "read_failed");
  return payload.files ?? [];
}

export async function fetchWorkspaceTree(): Promise<WorkspaceTree> {
  const response = await fetch(FILES_API_PATH);
  const payload = await response.json() as WorkspaceTree & { error?: string };
  if (!response.ok) throw new Error(payload.error || "read_failed");
  return { files: payload.files ?? [], directories: payload.directories ?? [] };
}

export async function searchWorkspaceContent(query: string): Promise<ContentSearchHit[]> {
  const response = await fetch(`${CONTENT_SEARCH_API_PATH}?q=${encodeURIComponent(query)}`);
  const payload = await response.json() as { hits?: ContentSearchHit[]; error?: string };
  if (!response.ok) throw new Error(payload.error || "read_failed");
  return payload.hits ?? [];
}

function payloadForMode(payload: FilePayload, mode: FileOpenMode): FilePayload {
  if (mode !== "view" || payload.source !== "dsh-write") return payload;
  return { ...payload, source: "workspace", before: null };
}

function withActive(open: string[], active: string, rest: Omit<FileState, "open" | "active" | "path" | "visible">): FileState {
  return { ...rest, open, active, path: active, visible: true };
}

function replaceKey(items: readonly string[], from: string, to: string): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const item of items) {
    const mapped = item === from ? to : item;
    if (seen.has(mapped)) continue;
    seen.add(mapped);
    result.push(mapped);
  }
  return result;
}

export function createFileStore(load: FileLoader = fetchWorkspaceFile): FileStore {
  let state = empty;
  let requestId = 0;
  const modes = new Map<string, FileOpenMode>();
  const listeners = new Set<() => void>();

  const emit = () => {
    for (const listener of listeners) listener();
  };

  const set = (next: FileState) => {
    state = next;
    emit();
  };

  const loadActive = async (path: string, mode: FileOpenMode = "auto", line: number | null = null, bumpReveal = false, kind?: TabOpenKind) => {
    const id = requestId + 1;
    requestId = id;
    const tabs = kind != null
      ? nextOpenTabs(state.open, state.preview, path, kind)
      : { open: state.open.includes(path) ? state.open : [...state.open, path], preview: state.preview };
    const reveal = bumpReveal ? state.reveal + 1 : state.reveal;
    const disk = state.disk;
    const views = { ...state.views };
    if (state.preview && state.preview !== tabs.preview) delete views[state.preview];
    set({ ...withActive(tabs.open, path, { loading: true, payload: null, error: "", line, reveal, disk, views, preview: tabs.preview }), visible: true });
    try {
      const payload = payloadForMode(await load(path, mode), mode);
      if (requestId !== id) return;
      // Adopt the host-normalized path as the canonical tab key, so an
      // absolute path clicked in the conversation lands on the same relative
      // path the workspace tree uses.
      const canonical = normalizePath(payload.path) || path;
      const migrated = canonical !== path;
      const open = migrated ? replaceKey(state.open, path, canonical) : state.open;
      const preview = migrated && state.preview === path ? canonical : state.preview;
      const views = { ...state.views };
      if (migrated && views[path] !== undefined) {
        views[canonical] = views[path];
        delete views[path];
      }
      views[canonical] = viewKind(payload.source);
      if (migrated && modes.has(path)) {
        modes.set(canonical, modes.get(path) as FileOpenMode);
        modes.delete(path);
      }
      set({ ...withActive(open, canonical, {
        loading: false,
        payload: { ...payload, path: canonical },
        error: "",
        line,
        reveal,
        disk,
        views,
        preview,
      }), visible: true });
    } catch (error) {
      if (requestId !== id) return;
      set({ ...withActive(state.open, path, {
        loading: false,
        payload: null,
        error: error instanceof Error ? error.message : "read_failed",
        line,
        reveal,
        disk,
        views,
        preview: state.preview,
      }), visible: true });
    }
  };

  return {
    getSnapshot: () => state,
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    open(path, mode = "auto", line, reveal = true, kind = "keep") {
      const key = normalizePath(path);
      const target = line ?? null;
      modes.set(key, mode);
      if (state.active === key && state.payload && !state.loading && target != null) {
        const tabs = nextOpenTabs(state.open, state.preview, key, kind);
        set({
          ...state,
          open: tabs.open,
          preview: tabs.preview,
          line: target,
          visible: true,
          reveal: reveal ? state.reveal + 1 : state.reveal,
        });
        return Promise.resolve();
      }
      return loadActive(key, mode, target, reveal, kind);
    },
    pin(path) {
      const key = normalizePath(path);
      if (state.preview !== key) return;
      set({ ...state, preview: "" });
    },
    activate(path, mode, line) {
      const key = normalizePath(path);
      if (!state.open.includes(key)) return Promise.resolve();
      if (state.active === key) {
        if (line != null && line !== state.line) set({ ...state, line });
        return Promise.resolve();
      }
      const nextMode = mode ?? modes.get(key) ?? "auto";
      modes.set(key, nextMode);
      return loadActive(key, nextMode, line ?? null);
    },
    reload() {
      if (!state.active) return Promise.resolve();
      return loadActive(state.active, modes.get(state.active) ?? "auto", state.line);
    },
    close(path) {
      if (path == null || path === "") {
        requestId += 1;
        modes.clear();
        set({ ...empty, visible: state.visible, disk: state.disk });
        return;
      }
      const key = normalizePath(path);
      modes.delete(key);
      const open = state.open.filter((item) => item !== key);
      if (open.length === 0) {
        requestId += 1;
        set(empty);
        return;
      }
      const preview = state.preview === key ? "" : state.preview;
      if (state.active !== key) {
        const views = { ...state.views };
        delete views[key];
        set({ ...state, open, views, preview });
        return;
      }
      const next = open[open.length - 1] ?? "";
      const views = { ...state.views };
      delete views[key];
      set(withActive(open, next, { loading: true, payload: null, error: "", line: null, reveal: state.reveal, disk: state.disk, views, preview }));
      void loadActive(next, modes.get(next) ?? "auto");
    },
    show() {
      if (!state.visible) set({ ...state, visible: true });
    },
    hide() {
      if (state.visible) set({ ...state, visible: false });
    },
    noteDiskChange() {
      set({ ...state, disk: state.disk + 1 });
    },
  };
}
