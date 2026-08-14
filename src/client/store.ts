import { FILE_API_PATH, normalizePath, type FileOpenMode, type FilePayload } from "../shared/types.js";

export type FileState = {
  open: string[];
  active: string;
  path: string;
  loading: boolean;
  payload: FilePayload | null;
  error: string;
  visible: boolean;
};

export type FileLoader = (path: string, mode?: FileOpenMode) => Promise<FilePayload>;

export type FileStore = {
  getSnapshot(): FileState;
  subscribe(listener: () => void): () => void;
  open(path: string, mode?: FileOpenMode): Promise<void>;
  activate(path: string, mode?: FileOpenMode): Promise<void>;
  close(path?: string): void;
  reload(): Promise<void>;
  show(): void;
  hide(): void;
};

const empty: FileState = {
  open: [],
  active: "",
  path: "",
  loading: false,
  payload: null,
  error: "",
  visible: false,
};

export async function fetchWorkspaceFile(path: string, mode: FileOpenMode = "auto"): Promise<FilePayload> {
  const response = await fetch(`${FILE_API_PATH}?path=${encodeURIComponent(path)}&mode=${mode}`);
  const payload = await response.json() as FilePayload & { error?: string };
  if (!response.ok) throw new Error(payload.error || "read_failed");
  return payload;
}

function payloadForMode(payload: FilePayload, mode: FileOpenMode): FilePayload {
  if (mode !== "view" || payload.source !== "dsh-write") return payload;
  return { ...payload, source: "workspace", before: null };
}

function withActive(open: string[], active: string, rest: Omit<FileState, "open" | "active" | "path" | "visible">): FileState {
  return { ...rest, open, active, path: active, visible: true };
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

  const remember = (path: string): string[] => (
    state.open.includes(path) ? state.open : [...state.open, path]
  );

  const loadActive = async (path: string, mode: FileOpenMode = "auto") => {
    const id = requestId + 1;
    requestId = id;
    set({ ...withActive(remember(path), path, { loading: true, payload: null, error: "" }), visible: true });
    try {
      const payload = payloadForMode(await load(path, mode), mode);
      if (requestId !== id) return;
      set({ ...withActive(state.open, path, { loading: false, payload, error: "" }), visible: true });
    } catch (error) {
      if (requestId !== id) return;
      set({ ...withActive(state.open, path, {
        loading: false,
        payload: null,
        error: error instanceof Error ? error.message : "read_failed",
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
    open(path, mode = "auto") {
      const key = normalizePath(path);
      modes.set(key, mode);
      return loadActive(key, mode);
    },
    activate(path, mode = "auto") {
      const key = normalizePath(path);
      if (!state.open.includes(key) || state.active === key) return Promise.resolve();
      modes.set(key, mode);
      return loadActive(key, mode);
    },
    reload() {
      if (!state.active) return Promise.resolve();
      return loadActive(state.active, modes.get(state.active) ?? "auto");
    },
    close(path) {
      if (path == null || path === "") {
        requestId += 1;
        modes.clear();
        set(empty);
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
      if (state.active !== key) {
        set({ ...state, open });
        return;
      }
      const next = open[open.length - 1] ?? "";
      set(withActive(open, next, { loading: true, payload: null, error: "" }));
      void loadActive(next);
    },
    show() {
      if (!state.visible) set({ ...state, visible: true });
    },
    hide() {
      if (state.visible) set({ ...state, visible: false });
    },
  };
}
