import type { IncomingMessage, ServerResponse } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { resolve } from "node:path";
import { reviewCountsFor, toFilePayload } from "./file-preview.js";
import { sendJson } from "./http.js";
import { createPathIdentity } from "./path-identity.js";
import { ACTIVITY_API_PATH, EVENTS_API_PATH, FILES_API_PATH, FILE_API_PATH, FILE_ASSET_API_PATH, MAX_IMAGE_PREVIEW_BYTES, normalizePath, REVIEW_API_PATH, WORKSPACE_API_PATH, type FileOpenMode } from "../shared/types.js";
import { createChangePump } from "./change-pump.js";
import { createWorkspace, type Workspace } from "./workspace.js";
import { startWorkspaceWatch, type WorkspaceWatchHandle } from "./workspace-watch.js";
import { WriteHistory, type SessionEvent } from "./write-history.js";
import { ActivityStore } from "./activity.js";

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
    path: ACTIVITY_API_PATH,
    handler: (_req, res) => sendJson(res, 200, { records: activity.getAll() }),
  });

  ctx.webServer.register({
    kind: "exact",
    path: REVIEW_API_PATH,
    handler: async (req, res) => {
      const sessionId = new URL(req.url ?? "/", "http://dsh.local").searchParams.get("session") ?? undefined;
      const sessions = history.reviewSessions(root);
      const selectedSession = sessionId ?? sessions.at(-1) ?? null;
      const changes = [];
      for (const change of history.getReview(selectedSession ?? undefined, root)) {
        const disk = await workspace.read(change.path);
        if (!disk.ok) {
          changes.push(change);
          continue;
        }
        changes.push({ ...change, ...reviewCountsFor(disk, history.get(disk.path)) });
      }
      sendJson(res, 200, { changes, sessions, sessionId: selectedSession });
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
      const stop = pump.subscribe(() => {
        res.write("event: change\ndata: {}\n\n");
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

  const rememberRoot = (session: SessionLike) => {
    const sessionRoot = sessionRootOf(session);
    if (sessionRoot) history.noteSessionRoot(String(session.id), sessionRoot);
  };

  const hydrate = (session: SessionLike) => {
    rememberRoot(session);
    if (session.events) history.replay(session.events, String(session.id));
    if (session.events) activity.replay(session.events, String(session.id));
  };

  for (const session of ctx.sessions?.list() ?? []) hydrate(session);
  ctx.on("session/created", hydrate);
  ctx.on("session/event", (session, event) => {
    rememberRoot(session);
    const revision = history.record(event, String(session.id));
    if (revision?.source === "dsh-write") broadcastWrite(revision.path);
    activity.record(event, String(session.id));
  });
}
