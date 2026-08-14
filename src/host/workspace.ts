import { readFile, stat } from "node:fs/promises";
import { resolve } from "node:path";
import { createPathIdentity, type PathIdentity } from "./path-identity.js";
import { MAX_PREVIEW_BYTES, type WorkspaceErrorCode } from "../shared/types.js";

export type WorkspaceError = {
  ok: false;
  status: 400 | 404 | 413;
  error: WorkspaceErrorCode;
};

export type DiskFile = {
  ok: true;
  path: string;
  content: string;
  size: number;
};

export type FileStat = {
  isFile: boolean;
  size: number;
};

export type DiskReader = {
  stat(absolute: string): Promise<FileStat>;
  readFile(absolute: string): Promise<string>;
};

const nodeReader: DiskReader = {
  async stat(absolute) {
    const info = await stat(absolute);
    return { isFile: info.isFile(), size: info.size };
  },
  readFile(absolute) {
    return readFile(absolute, "utf8");
  },
};

export type Workspace = {
  resolve(requested: string): { ok: true; absolute: string; relative: string } | WorkspaceError;
  read(requested: string): Promise<DiskFile | WorkspaceError>;
};

export function createWorkspace(options: {
  root: string;
  paths?: PathIdentity;
  fs?: DiskReader;
  maxBytes?: number;
}): Workspace {
  const paths = options.paths ?? createPathIdentity(resolve(options.root));
  const reader = options.fs ?? nodeReader;
  const maxBytes = options.maxBytes ?? MAX_PREVIEW_BYTES;

  function resolvePath(requested: string): { ok: true; absolute: string; relative: string } | WorkspaceError {
    const located = paths.identify(requested);
    if (!located.ok) return located;
    return { ok: true, absolute: located.absolute, relative: located.display };
  }

  return {
    resolve: resolvePath,
    async read(requested) {
      const located = resolvePath(requested);
      if (!located.ok) return located;

      try {
        const info = await reader.stat(located.absolute);
        if (!info.isFile || info.size > maxBytes) {
          return { ok: false, status: 413, error: "not_previewable" };
        }
        const content = await reader.readFile(located.absolute);
        return { ok: true, path: located.relative, content, size: info.size };
      } catch {
        return { ok: false, status: 404, error: "file_not_found" };
      }
    },
  };
}
