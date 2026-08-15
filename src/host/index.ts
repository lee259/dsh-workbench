import type { IncomingMessage, ServerResponse } from "node:http";
import { toFilePayload } from "./file-preview.js";
import { sendJson } from "./http.js";
import { createPathIdentity } from "./path-identity.js";
import { ACTIVITY_API_PATH, EVENTS_API_PATH, FILES_API_PATH, FILE_API_PATH, normalizePath, type FileOpenMode } from "../shared/types.js";
import { createChangePump } from "./change-pump.js";
import { createWorkspace } from "./workspace.js";
import { startWorkspaceWatch } from "./workspace-watch.js";
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

export function apply(ctx: HostContext): void {
  const paths = createPathIdentity(process.cwd());
  const workspace = createWorkspace({ root: process.cwd(), paths });
  const history = new WriteHistory((path) => {
    const located = paths.identify(path);
    return located.ok ? located.display : normalizePath(path);
  });
  const activity = new ActivityStore((path) => {
    const located = paths.identify(path);
    return located.ok ? located.display : normalizePath(path);
  });
  const pump = createChangePump();
  let watching = false;
  const ensureWatch = () => {
    if (watching) return;
    watching = true;
    startWorkspaceWatch(process.cwd(), (filename) => {
      pump.notify(filename);
    });
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
    path: EVENTS_API_PATH,
    handler: (req, res) => {
      res.statusCode = 200;
      res.setHeader("content-type", "text/event-stream; charset=utf-8");
      res.setHeader("cache-control", "no-cache");
      res.setHeader("connection", "keep-alive");
      res.write(":\n\n");
      ensureWatch();
      const stop = pump.subscribe(() => {
        res.write("event: change\ndata: {}\n\n");
      });
      req.on("close", stop);
    },
  });

  const hydrate = (session: SessionLike) => {
    if (session.events) history.replay(session.events, String(session.id));
    if (session.events) activity.replay(session.events, String(session.id));
  };

  for (const session of ctx.sessions?.list() ?? []) hydrate(session);
  ctx.on("session/created", hydrate);
  ctx.on("session/event", (session, event) => {
    history.record(event, String(session.id));
    activity.record(event, String(session.id));
  });
}
