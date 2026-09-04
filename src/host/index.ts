import type { IncomingMessage, ServerResponse } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { resolve } from "node:path";
import { toFilePayload } from "./file-preview.js";
import { sendJson } from "./http.js";
import { createPathIdentity } from "./path-identity.js";
import { ACTIVITY_API_PATH, CONTENT_SEARCH_API_PATH, EVENTS_API_PATH, FILES_API_PATH, FILE_API_PATH, FILE_ASSET_API_PATH, GIT_DIFF_API_PATH, GIT_STATUS_API_PATH, MAX_IMAGE_PREVIEW_BYTES, normalizePath, REVIEW_API_PATH, WORKSPACE_API_PATH, type FileOpenMode, type GitFileDiff } from "../shared/types.js";
import { completeSessionDiffs, reviewDiffCounts } from "../shared/review-diff.js";
import { countDiffLines } from "../shared/line-diff.js";
import { isTextPreviewPath } from "../shared/preview-policy.js";
import { createChangePump } from "./change-pump.js";
import { createWorkspace, type Workspace } from "./workspace.js";
import { startWorkspaceWatch, type WorkspaceWatchHandle } from "./workspace-watch.js";
import { WriteHistory, type SessionEvent } from "./write-history.js";
import { ActivityStore } from "./activity.js";
import { gitDiffFile, gitDiffFiles, gitStatus, type GitDiffScope } from "./git-diff.js";

type WebServer = {
  register(route: {
    kind: "exact" | "prefix";
    path: string;
    handler: (req: IncomingMessage, res: ServerResponse) => void | Promise<void>;
  }): () => void;
};

type SessionLike = {
  id: string;
  cwd?: string;
  header?: { cwd?: string };
  snapshotEvents?(): readonly SessionEvent[];
  events?: readonly SessionEvent[];
};

type HostContext = {
  webServer: WebServer;
  sessions?: {
    list(): SessionLike[];
  };
  on: {
    (event: "session/event", handler: (session: SessionLike, event: SessionEvent) => void): unknown;
    (event: "session/created", handler: (session: SessionLike) => void): unknown;
  };
};

export const name = "dsh-workbench";
export const inject = ["sessions", "webServer"];

function sessionRootOf(session: SessionLike): string | null {
  const value = session.header?.cwd ?? session.cwd;
  return typeof value === "string" && value.trim() ? resolve(value.trim()) : null;
}

function replayEventsOf(session: SessionLike): readonly SessionEvent[] {
  return session.snapshotEvents?.() ?? session.events ?? [];
}

async function readJson(req: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  const raw = Buffer.concat(chunks).toString("utf8").trim();
  return raw ? JSON.parse(raw) : {};
}

export function apply(ctx: HostContext): void {
  let root = resolve(process.cwd());
  let paths = createPathIdentity(root);
  let workspace: Workspace = createWorkspace({ root, paths });
  const identify = (path: string) => {
    const located = paths.identify(path);
    return located.ok ? located.display : normalizePath(path);
  };
  const history = new WriteHistory(identify);
  const activity = new ActivityStore(identify);
  const pump = createChangePump();
  let watchHandle: WorkspaceWatchHandle | null = null;
  const eventClients = new Set<ServerResponse>();
  const broadcastWrite = (path: string) => {
    const data = JSON.stringify({ path });
    for (const client of eventClients) client.write(`event: write\ndata: ${data}\n\n`);
  };
  const broadcastActivity = () => {
    for (const client of eventClients) client.write("event: activity\ndata: {}\n\n");
  };
  const startWatch = () => {
    watchHandle?.close();
    watchHandle = startWorkspaceWatch(root, (filename) => {
      pump.notify(filename);
    });
  };
  const ensureWatch = () => {
    if (!watchHandle) startWatch();
  };
  const setRoot = async (next: string): Promise<string | null> => {
    const resolved = resolve(next.trim());
    if (resolved === root) return root;
    try {
      const info = await stat(resolved);
      if (!info.isDirectory()) return null;
    } catch {
      return null;
    }
    root = resolved;
    paths = createPathIdentity(root);
    workspace = createWorkspace({ root, paths });
    if (watchHandle) startWatch();
    pump.notify(".");
    return root;
  };

  ctx.webServer.register({
    kind: "exact",
    path: FILES_API_PATH,
    handler: async (req, res) => {
      const url = new URL(req.url ?? "/", "http://dsh.local");
      const query = (url.searchParams.get("q") ?? "").trim().toLowerCase();
      if (query) return sendJson(res, 200, { directories: [], files: await workspace.list(query) });
      const tree = await workspace.tree();
      sendJson(res, 200, {
        directories: tree.directories,
        files: tree.files,
      });
    },
  });

  ctx.webServer.register({
    kind: "exact",
    path: FILE_API_PATH,
    handler: async (req, res) => {
      if (req.method === "POST") {
        try {
          const body = await readJson(req) as { path?: unknown; content?: unknown; expected?: unknown };
          if (typeof body.path !== "string" || typeof body.content !== "string" || typeof body.expected !== "string") return sendJson(res, 400, { error: "missing_path" });
          const saved = await workspace.write(body.path, body.content, body.expected);
          if (!saved.ok) return sendJson(res, saved.status, { error: saved.error });
          pump.notify(saved.path);
          return sendJson(res, 200, saved);
        } catch {
          return sendJson(res, 400, { error: "missing_path" });
        }
      }
      if (req.method && req.method !== "GET") return sendJson(res, 405, { error: "missing_path" });
      const requested = new URL(req.url ?? "/", "http://dsh.local").searchParams.get("path") ?? "";
      const modeParam = new URL(req.url ?? "/", "http://dsh.local").searchParams.get("mode");
      const mode: FileOpenMode = modeParam === "view" || modeParam === "diff" ? modeParam : "auto";
      const disk = await workspace.read(requested);
      if (!disk.ok) return sendJson(res, disk.status, { error: disk.error });
      sendJson(res, 200, toFilePayload(disk, history.get(disk.path), mode));
    },
  });

  ctx.webServer.register({
    kind: "exact",
    path: CONTENT_SEARCH_API_PATH,
    handler: async (req, res) => {
      const query = new URL(req.url ?? "/", "http://dsh.local").searchParams.get("q") ?? "";
      sendJson(res, 200, { hits: await workspace.searchContent(query) });
    },
  });

  ctx.webServer.register({
    kind: "exact",
    path: ACTIVITY_API_PATH,
    handler: (_req, res) => sendJson(res, 200, { records: activity.getAll() }),
  });

  ctx.webServer.register({
    kind: "exact",
    path: REVIEW_API_PATH,
    handler: async (req, res) => {
      const query = new URL(req.url ?? "/", "http://dsh.local").searchParams;
      const sessionId = query.get("session") ?? undefined;
      const requestedPath = query.get("path");
      const sessions = history.reviewSessions(root);
      const selectedSession = sessionId ?? sessions.at(-1) ?? null;
      if (requestedPath) {
        const path = normalizePath(requestedPath);
        let file: GitFileDiff | null = null;
        try { file = await gitDiffFile(root, "uncommitted", path); } catch { /* Git is optional */ }
        if (!file) {
          const change = history.getReview(selectedSession ?? undefined, root).find((item) => normalizePath(item.path) === path);
          if (change) {
            const disk = await workspace.read(change.path);
            if (disk.ok) {
              const payload = toFilePayload(disk, history.get(disk.path), "diff");
              file = { path: disk.path, before: payload.before, content: payload.content, ...countDiffLines(payload.before, payload.content) };
            }
          }
        }
        sendJson(res, 200, { file, sessionId: selectedSession });
        return;
      }
      const changes = [];
      const sessionFiles: GitFileDiff[] = [];
      for (const change of history.getReview(selectedSession ?? undefined, root).filter((change) => isTextPreviewPath(change.path))) {
        const disk = await workspace.read(change.path);
        if (!disk.ok) {
          changes.push(change);
          const revision = history.get(change.path);
          if (revision?.source === "dsh-write") sessionFiles.push({ path: change.path, before: revision.before, content: revision.content, ...countDiffLines(revision.before, revision.content) });
          continue;
        }
        const payload = toFilePayload(disk, history.get(disk.path), "diff");
        const counts = countDiffLines(payload.before, payload.content);
        changes.push({ ...change, ...counts });
        sessionFiles.push({ path: disk.path, before: payload.before, content: payload.content, ...counts });
      }
      let worktreeFiles: GitFileDiff[] = [];
      try { worktreeFiles = await gitDiffFiles(root, "uncommitted"); } catch { /* Git is optional */ }
      const files = completeSessionDiffs(worktreeFiles, sessionFiles);
      sendJson(res, 200, { changes, files, counts: reviewDiffCounts(files), sessions, sessionId: selectedSession });
    },
  });

  ctx.webServer.register({
    kind: "exact",
    path: WORKSPACE_API_PATH,
    handler: async (req, res) => {
      if (req.method && req.method !== "GET" && req.method !== "POST") {
        return sendJson(res, 405, { error: "missing_path" });
      }
      if (req.method !== "POST") return sendJson(res, 200, { root });
      try {
        const body = await readJson(req) as { root?: unknown };
        const next = typeof body.root === "string" ? body.root : "";
        if (!next.trim()) return sendJson(res, 400, { error: "missing_path" });
        const applied = await setRoot(next);
        if (!applied) return sendJson(res, 400, { error: "file_not_found" });
        sendJson(res, 200, { root: applied });
      } catch {
        sendJson(res, 400, { error: "missing_path" });
      }
    },
  });

  ctx.webServer.register({
    kind: "exact",
    path: EVENTS_API_PATH,
    handler: (req, res) => {
      res.statusCode = 200;
      res.setHeader("content-type", "text/event-stream; charset=utf-8");
      res.setHeader("cache-control", "no-cache");
      res.setHeader("connection", "keep-alive");
      res.write(":\n\n");
      eventClients.add(res);
      ensureWatch();
      const stop = pump.subscribe((changedPaths) => {
        res.write(`event: change\ndata: ${JSON.stringify({ paths: changedPaths })}\n\n`);
      });
      req.on("close", () => {
        eventClients.delete(res);
        stop();
      });
    },
  });

  ctx.webServer.register({
    kind: "exact",
    path: FILE_ASSET_API_PATH,
    handler: async (req, res) => {
      const requested = new URL(req.url ?? "/", "http://dsh.local").searchParams.get("path") ?? "";
      const located = workspace.resolve(requested);
      if (!located.ok) return sendJson(res, located.status, { error: located.error });
      try {
        const info = await stat(located.absolute);
        if (!info.isFile() || info.size > MAX_IMAGE_PREVIEW_BYTES) return sendJson(res, 413, { error: "not_previewable" });
        const content = await readFile(located.absolute);
        const extension = located.relative.toLowerCase().split(".").pop() ?? "";
        const types: Record<string, string> = { png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg", gif: "image/gif", webp: "image/webp", svg: "image/svg+xml", avif: "image/avif", bmp: "image/bmp", ico: "image/x-icon" };
        const type = types[extension];
        if (!type) return sendJson(res, 415, { error: "not_previewable" });
        res.statusCode = 200;
        res.setHeader("content-type", type);
        res.setHeader("cache-control", "no-cache");
        res.end(content);
      } catch {
        sendJson(res, 404, { error: "file_not_found" });
      }
    },
  });

  ctx.webServer.register({
    kind: "exact",
    path: GIT_STATUS_API_PATH,
    handler: async (_req, res) => {
      try { sendJson(res, 200, await gitStatus(root)); }
      catch { sendJson(res, 200, { branch: "", staged: 0, unstaged: 0, untracked: 0 }); }
    },
  });

  ctx.webServer.register({
    kind: "exact",
    path: GIT_DIFF_API_PATH,
    handler: async (req, res) => {
      const scope = new URL(req.url ?? "/", "http://dsh.local").searchParams.get("scope");
      if (scope !== "uncommitted" && scope !== "unstaged" && scope !== "staged") return sendJson(res, 400, { error: "missing_path" });
      try { sendJson(res, 200, { files: await gitDiffFiles(root, scope as GitDiffScope) }); }
      catch { sendJson(res, 200, { files: [] }); }
    },
  });

  const rememberRoot = (session: SessionLike) => {
    const sessionRoot = sessionRootOf(session);
    if (sessionRoot) history.noteSessionRoot(String(session.id), sessionRoot);
  };

  const hydrate = (session: SessionLike) => {
    rememberRoot(session);
    const events = replayEventsOf(session);
    history.replay(events, String(session.id));
    activity.replay(events, String(session.id));
  };

  for (const session of ctx.sessions?.list() ?? []) hydrate(session);
  ctx.on("session/created", hydrate);
  ctx.on("session/event", (session, event) => {
    rememberRoot(session);
    const revision = history.record(event, String(session.id));
    if (revision?.source === "dsh-write") broadcastWrite(revision.path);
    if (activity.record(event, String(session.id))) broadcastActivity();
  });
}
