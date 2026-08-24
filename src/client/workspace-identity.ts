import { WORKSPACE_API_PATH } from "../shared/types.js";

export type DshSessionSummary = {
  cwd?: string;
};

export type DshSessionList = {
  current?: string | { sessionId?: string };
  byId?: Record<string, DshSessionSummary | undefined>;
};

export type DshWorkspaceItem = {
  workspaceId?: string;
  path?: string;
  sessionIds?: readonly string[];
};

export type DshWorkspaceList = {
  items?: readonly DshWorkspaceItem[];
  recentWorkspaceId?: string;
};

export type DshSnapshotStore<T> = {
  getSnapshot(): T;
  subscribe(listener: () => void): () => void;
};

export type DshWorkspaceFaces = {
  sessions?: { list?: DshSnapshotStore<DshSessionList>; scope?(sessionId: string): unknown };
  workspaces?: { list?: DshSnapshotStore<DshWorkspaceList> };
};

export function currentSessionId(sessions?: DshSessionList): string {
  const current = sessions?.current;
  if (typeof current === "string") return current;
  return current && typeof current.sessionId === "string" ? current.sessionId : "";
}

export function workspacePathFromDsh(sessions?: DshSessionList, workspaces?: DshWorkspaceList): string | null {
  const currentId = currentSessionId(sessions);
  const cwd = currentId ? sessions?.byId?.[currentId]?.cwd : undefined;
  if (typeof cwd === "string" && cwd.trim()) return cwd.trim();

  const items = workspaces?.items ?? [];
  if (currentId) {
    const owned = items.find((item) => item.sessionIds?.includes(currentId));
    if (typeof owned?.path === "string" && owned.path.trim()) return owned.path.trim();
  }
  const recent = items.find((item) => item.workspaceId === workspaces?.recentWorkspaceId);
  if (typeof recent?.path === "string" && recent.path.trim()) return recent.path.trim();
  const first = items[0];
  return typeof first?.path === "string" && first.path.trim() ? first.path.trim() : null;
}

export function workspaceAbsolutePath(root: string, path: string): string {
  if (!root || /^(?:[A-Za-z]:[\\/]|[\\/])/.test(path)) return path;
  const separator = root.includes("\\") ? "\\" : "/";
  return `${root.replace(/[\\/]+$/, "")}${separator}${path.replace(/^[\\/]+/, "")}`;
}

export async function retargetWorkbenchRoot(
  root: string,
  io: {
    post(root: string): Promise<void>;
    notify(): void;
  } = {
    async post(next) {
      await fetch(WORKSPACE_API_PATH, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ root: next }),
      });
    },
    notify() {
      window.dispatchEvent(new Event("dsh-wb-workspace-change"));
    },
  },
): Promise<void> {
  try {
    await io.post(root);
  } catch {
    // Host may be unavailable during first paint.
  }
  io.notify();
}

function subscribeDshFaces(ctx: DshWorkspaceFaces, sync: () => void): () => void {
  const stops = [
    ctx.sessions?.list?.subscribe(sync),
    ctx.workspaces?.list?.subscribe(sync),
  ].filter((stop): stop is () => void => typeof stop === "function");
  sync();
  return () => {
    for (const stop of stops) stop();
  };
}

export function followDshWorkspace(ctx: DshWorkspaceFaces, onPath: (path: string) => void): () => void {
  let last = "";
  return subscribeDshFaces(ctx, () => {
    const next = workspacePathFromDsh(ctx.sessions?.list?.getSnapshot(), ctx.workspaces?.list?.getSnapshot());
    if (!next || next === last) return;
    last = next;
    onPath(next);
  });
}

export function workbenchShouldReset(
  previousRoot: string,
  nextRoot: string,
  previousSession = "",
  nextSession = "",
): boolean {
  const rootChanged = Boolean(previousRoot && nextRoot && previousRoot !== nextRoot);
  const sessionChanged = Boolean(previousSession && nextSession && previousSession !== nextSession);
  return rootChanged || sessionChanged;
}

export function followDshSession(ctx: DshWorkspaceFaces, onSession: (sessionId: string) => void): () => void {
  let last: string | undefined;
  return subscribeDshFaces(ctx, () => {
    const next = currentSessionId(ctx.sessions?.list?.getSnapshot());
    if (last === next) return;
    last = next;
    onSession(next);
  });
}

let lastSessionId = "";

export function lastWorkbenchSession(): string {
  return lastSessionId;
}

export function notifyWorkbenchSession(sessionId: string): void {
  lastSessionId = sessionId;
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent("dsh-wb-session-change", { detail: sessionId }));
}

export function sessionIdFromEvent(event: Event): string {
  return event instanceof CustomEvent && typeof event.detail === "string" ? event.detail : "";
}
