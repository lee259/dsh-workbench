import type { IncomingMessage, ServerResponse } from "node:http";
import { toFilePayload } from "./file-preview.js";
import { sendJson } from "./http.js";
import { createPathIdentity } from "./path-identity.js";
import { ACTIVITY_API_PATH, FILE_API_PATH, normalizePath, type FileOpenMode } from "../shared/types.js";
import { createWorkspace } from "./workspace.js";
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
