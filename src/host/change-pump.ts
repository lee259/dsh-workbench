export const WATCH_IGNORED = new Set([
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

export function shouldIgnoreWatchPath(filename: string | null | undefined): boolean {
  if (!filename) return false;
  return filename.replace(/\\/g, "/").split("/").some((part) => WATCH_IGNORED.has(part));
}

export function createChangePump(options: {
  delay?: number;
  schedule?: (fn: () => void, ms: number) => unknown;
  cancel?: (id: unknown) => void;
} = {}) {
  const delay = options.delay ?? 160;
  const schedule = options.schedule ?? ((fn, ms) => setTimeout(fn, ms));
  const cancel = options.cancel ?? ((id) => clearTimeout(id as ReturnType<typeof setTimeout>));
  let timer: unknown;
  const listeners = new Set<() => void>();

  return {
    notify(filename?: string | null) {
      if (shouldIgnoreWatchPath(filename)) return;
      if (timer != null) cancel(timer);
      timer = schedule(() => {
        timer = undefined;
        for (const listener of listeners) listener();
      }, delay);
    },
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
}
