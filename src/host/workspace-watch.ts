import { readdirSync, watch } from "node:fs";
import { join } from "node:path";
import { WATCH_IGNORED } from "./change-pump.js";

export type WorkspaceWatchHandle = {
  close(): void;
};

export type WorkspaceWatchIo = {
  watch(
    path: string,
    options: { recursive: boolean },
    listener: (event: string, filename: string | Buffer | null) => void,
  ): { on(event: string, fn: () => void): void; unref(): void; close(): void };
  readDir(root: string): readonly { name: string; isDirectory: boolean }[];
};

const nodeIo: WorkspaceWatchIo = {
  watch(path, options, listener) {
    return watch(path, options, listener);
  },
  readDir(root) {
    return readdirSync(root, { withFileTypes: true }).map((entry) => ({
      name: entry.name,
      isDirectory: entry.isDirectory(),
    }));
  },
};

export function startWorkspaceWatch(
  root: string,
  onChange: (filename: string | null) => void,
  io: WorkspaceWatchIo = nodeIo,
): WorkspaceWatchHandle {
  const watchers: { close(): void }[] = [];
  const listen = (dir: string, recursive: boolean) => {
    try {
      const watcher = io.watch(dir, { recursive }, (_event, filename) => {
        onChange(filename != null ? String(filename) : null);
      });
      watcher.on("error", () => {});
      watcher.unref();
      watchers.push(watcher);
    } catch {
      // Recursive watching is not available on every platform.
    }
  };

  listen(root, false);
  let entries: readonly { name: string; isDirectory: boolean }[] = [];
  try {
    entries = io.readDir(root);
  } catch {
    return { close() { for (const watcher of watchers) watcher.close(); } };
  }
  for (const entry of entries) {
    if (!entry.isDirectory || WATCH_IGNORED.has(entry.name)) continue;
    listen(join(root, entry.name), true);
  }
  return {
    close() {
      for (const watcher of watchers) watcher.close();
    },
  };
}
