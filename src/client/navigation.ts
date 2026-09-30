import type { FileOpenMode } from "../shared/types.js";

export type WorkbenchFileRequest = {
  kind: "file";
  path: string;
  mode: FileOpenMode;
  line?: number;
};

export type WorkbenchReviewRequest = {
  kind: "review";
  path?: string;
  focus: boolean;
};

export type WorkbenchNavigationRequest = WorkbenchFileRequest | WorkbenchReviewRequest;

export type WorkbenchNavigation = {
  openFile(path: string, mode: FileOpenMode, line?: number): boolean;
  openReview(path?: string, focus?: boolean): boolean;
  subscribe(listener: (request: WorkbenchNavigationRequest) => boolean | void): () => void;
  latest(): { version: number; request: WorkbenchNavigationRequest } | undefined;
};

export function createWorkbenchNavigation(): WorkbenchNavigation {
  const listeners = new Set<(request: WorkbenchNavigationRequest) => boolean | void>();
  let version = 0;
  let latest: WorkbenchNavigationRequest | undefined;
  const publish = (request: WorkbenchNavigationRequest): boolean => {
    latest = request;
    version += 1;
    let handled = false;
    for (const listener of listeners) handled = listener(request) === true || handled;
    return handled;
  };

  return {
    openFile(path, mode, line) {
      return publish({ kind: "file", path, mode, line });
    },
    openReview(path, focus = true) {
      return publish({ kind: "review", path, focus });
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    latest() {
      return latest ? { version, request: latest } : undefined;
    },
  };
}
