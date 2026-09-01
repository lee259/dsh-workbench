import { readdir, readFile, stat, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { createPathIdentity, type PathIdentity } from "./path-identity.js";
import { MAX_IMAGE_PREVIEW_BYTES, MAX_PREVIEW_BYTES, type ContentSearchHit, type WorkspaceErrorCode, type WorkspaceFile, type WorkspaceTree } from "../shared/types.js";

export type WorkspaceError = {
  ok: false;
  status: 400 | 404 | 409 | 413;
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
  readDir(absolute: string): Promise<readonly { name: string; isFile: boolean; isDirectory: boolean }[]>;
  writeFile?(absolute: string, content: string): Promise<void>;
};

const nodeReader: DiskReader = {
  async stat(absolute) {
    const info = await stat(absolute);
    return { isFile: info.isFile(), size: info.size };
  },
  readFile(absolute) {
    return readFile(absolute, "utf8");
  },
  async readDir(absolute) {
    const entries = await readdir(absolute, { withFileTypes: true });
    return entries.map((entry) => ({ name: entry.name, isFile: entry.isFile(), isDirectory: entry.isDirectory() }));
  },
  writeFile(absolute, content) {
    return writeFile(absolute, content, "utf8");
  },
};

export type Workspace = {
  resolve(requested: string): { ok: true; absolute: string; relative: string } | WorkspaceError;
  read(requested: string): Promise<DiskFile | WorkspaceError>;
  write(requested: string, content: string, expected: string): Promise<DiskFile | WorkspaceError>;
  list(query?: string, limit?: number): Promise<WorkspaceFile[]>;
  tree(limit?: number): Promise<WorkspaceTree>;
  searchContent(query: string, limit?: number): Promise<ContentSearchHit[]>;
};

export function createWorkspace(options: {
  root: string;
  paths?: PathIdentity;
  fs?: DiskReader;
  maxBytes?: number;
  imageMaxBytes?: number;
}): Workspace {
  const paths = options.paths ?? createPathIdentity(resolve(options.root));
  const reader = options.fs ?? nodeReader;
  const maxBytes = options.maxBytes ?? MAX_PREVIEW_BYTES;
  const imageMaxBytes = options.imageMaxBytes ?? MAX_IMAGE_PREVIEW_BYTES;
  const root = resolve(options.root);
  const ignoredDirectories = new Set([
    ".git",
    ".next",
    ".turbo",
    ".cache",
    ".pnpm-store",
    ".yarn",
    ".venv",
    "vendor",
    "node_modules",
    "lib",
    "dist",
    "build",
    "coverage",
  ]);

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
        const extension = located.relative.toLowerCase().split(".").pop() ?? "";
        const isImage = ["png", "jpg", "jpeg", "gif", "webp", "svg", "avif", "bmp", "ico"].includes(extension);
        if (!info.isFile || info.size > (isImage ? imageMaxBytes : maxBytes)) {
          return { ok: false, status: 413, error: "not_previewable" };
        }
        const content = await reader.readFile(located.absolute);
        return { ok: true, path: located.relative, content, size: info.size };
      } catch {
        return { ok: false, status: 404, error: "file_not_found" };
      }
    },
    async write(requested, content, expected) {
      const located = resolvePath(requested);
      if (!located.ok) return located;
      if (!reader.writeFile) return { ok: false, status: 404, error: "file_not_found" };
      try {
        const info = await reader.stat(located.absolute);
        if (!info.isFile || info.size > maxBytes) return { ok: false, status: 413, error: "not_previewable" };
        if (await reader.readFile(located.absolute) !== expected) return { ok: false, status: 409, error: "file_changed" } as WorkspaceError;
        await reader.writeFile(located.absolute, content);
        return { ok: true, path: located.relative, content, size: Buffer.byteLength(content) };
      } catch {
        return { ok: false, status: 404, error: "file_not_found" };
      }
    },
    async tree(limit = 1000) {
      const files: WorkspaceFile[] = [];
      const directories: string[] = [];
      const visit = async (absolute: string, relativePath: string): Promise<void> => {
        if (files.length >= limit) return;
        let entries;
        try {
          entries = await reader.readDir(absolute);
        } catch {
          return;
        }
        for (const entry of [...entries].sort((left, right) => left.name.localeCompare(right.name))) {
          if (files.length >= limit) return;
          const childAbsolute = join(absolute, entry.name);
          const childRelative = relativePath ? `${relativePath}/${entry.name}` : entry.name;
          if (entry.isDirectory) {
            if (ignoredDirectories.has(entry.name)) continue;
            directories.push(childRelative);
            await visit(childAbsolute, childRelative);
          } else if (entry.isFile) {
            let size = 0;
            try {
              size = (await reader.stat(childAbsolute)).size;
            } catch {
              continue;
            }
            files.push({ path: childRelative, size });
          }
        }
      };
      await visit(root, "");
      return {
        files: files.sort((a, b) => a.path.localeCompare(b.path)),
        directories: directories.sort((a, b) => a.localeCompare(b)),
      };
    },
    async list(query = "", limit = 100) {
      const needle = query.trim().toLowerCase();
      const matches: string[] = [];
      const visit = async (absolute: string, relativePath: string): Promise<void> => {
        let entries;
        try {
          entries = await reader.readDir(absolute);
        } catch {
          return;
        }
        for (const entry of entries) {
          const childAbsolute = join(absolute, entry.name);
          const childRelative = relativePath ? `${relativePath}/${entry.name}` : entry.name;
          if (entry.isDirectory) {
            if (!ignoredDirectories.has(entry.name)) await visit(childAbsolute, childRelative);
          } else if (entry.isFile && (!needle || childRelative.toLowerCase().includes(needle))) {
            matches.push(childRelative);
          }
        }
      };
      await visit(root, "");
      const paths = matches.sort((left, right) => left.localeCompare(right)).slice(0, limit);
      const files = await Promise.all(paths.map(async (path): Promise<WorkspaceFile | undefined> => {
        try {
          return { path, size: (await reader.stat(join(root, path))).size };
        } catch {
          return undefined;
        }
      }));
      return files.filter((file): file is WorkspaceFile => file != null);
    },
    async searchContent(query, limit = 200) {
      const needle = query.trim().toLowerCase();
      if (!needle) return [];
      const hits: ContentSearchHit[] = [];
      const visit = async (absolute: string, relativePath: string): Promise<void> => {
        if (hits.length >= limit) return;
        let entries;
        try { entries = await reader.readDir(absolute); } catch { return; }
        for (const entry of entries) {
          if (hits.length >= limit) return;
          const childAbsolute = join(absolute, entry.name);
          const childRelative = relativePath ? `${relativePath}/${entry.name}` : entry.name;
          if (entry.isDirectory) {
            if (!ignoredDirectories.has(entry.name)) await visit(childAbsolute, childRelative);
            continue;
          }
          if (!entry.isFile) continue;
          let info;
          try { info = await reader.stat(childAbsolute); } catch { continue; }
          if (info.size > maxBytes) continue;
          let content;
          try { content = await reader.readFile(childAbsolute); } catch { continue; }
          const lines = content.split("\n");
          for (let index = 0; index < lines.length && hits.length < limit; index += 1) {
            const text = lines[index] ?? "";
            const column = text.toLowerCase().indexOf(needle);
            if (column >= 0) hits.push({ path: childRelative, line: index + 1, column, text: text.trim() });
          }
        }
      };
      await visit(root, "");
      return hits;
    },
  };
}
