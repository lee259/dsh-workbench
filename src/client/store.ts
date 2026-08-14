import { FILE_API_PATH, normalizePath, type FilePayload } from "../shared/types.js";

export type FileState = {
  open: string[];
  active: string;
  path: string;
  loading: boolean;
  payload: FilePayload | null;
  error: string;
};

export type FileLoader = (path: string) => Promise<FilePayload>;

export type FileStore = {
  getSnapshot(): FileState;
  subscribe(listener: () => void): () => void;
  open(path: string): Promise<void>;
  activate(path: string): Promise<void>;
  close(path?: string): void;
};

const empty: FileState = {
  open: [],
  active: "",
  path: "",
  loading: false,
  payload: null,
  error: "",
};

export async function fetchWorkspaceFile(path: string): Promise<FilePayload> {
  const response = await fetch(`${FILE_API_PATH}?path=${encodeURIComponent(path)}`);
  const payload = await response.json() as FilePayload & { error?: string };
  if (!response.ok) throw new Error(payload.error || "read_failed");
  return payload;
}

function withActive(open: string[], active: string, rest: Omit<FileState, "open" | "active" | "path">): FileState {
  return { ...rest, open, active, path: active };
}

export function createFileStore(load: FileLoader = fetchWorkspaceFile): FileStore {
  let state = empty;
  let requestId = 0;
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

  const loadActive = async (path: string) => {
    const id = requestId + 1;
    requestId = id;
    set(withActive(remember(path), path, { loading: true, payload: null, error: "" }));
    try {
      const payload = await load(path);
      if (requestId !== id) return;
      set(withActive(state.open, path, { loading: false, payload, error: "" }));
    } catch (error) {
      if (requestId !== id) return;
      set(withActive(state.open, path, {
        loading: false,
        payload: null,
        error: error instanceof Error ? error.message : "read_failed",
      }));
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
    open(path) {
      return loadActive(normalizePath(path));
    },
    activate(path) {
      const key = normalizePath(path);
      if (!state.open.includes(key) || state.active === key) return Promise.resolve();
      return loadActive(key);
    },
    close(path) {
      if (path == null || path === "") {
        requestId += 1;
        set(empty);
        return;
      }
      const key = normalizePath(path);
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
  };
}
