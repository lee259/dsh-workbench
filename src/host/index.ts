import type { IncomingMessage, ServerResponse } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { resolve } from "node:path";
import { toFilePayload } from "./file-preview.js";
import { sendJson } from "./http.js";
import { createPathIdentity } from "./path-identity.js";
import { EDITOR_BUNDLE_API_PATH, ACTIVITY_API_PATH, CONTENT_SEARCH_API_PATH, EVENTS_API_PATH, FILES_API_PATH, FILE_API_PATH, FILE_ASSET_API_PATH, GIT_DIFF_API_PATH, GIT_STATUS_API_PATH, MAX_IMAGE_PREVIEW_BYTES, normalizePath, REVIEW_API_PATH, SYSTEM_OPEN_API_PATH, WORKSPACE_API_PATH, type FileOpenMode, type GitFileDiff } from "../shared/types.js";
import { completeSessionDiffs, reviewDiffCounts, sortReviewFiles } from "../shared/review-diff.js";
import { countDiffLines, diffLines } from "../shared/line-diff.js";
import { isTextPreviewPath } from "../shared/preview-policy.js";
import { createChangePump } from "./change-pump.js";
import { createWorkspace, type Workspace } from "./workspace.js";
import { startWorkspaceWatch, type WorkspaceWatchHandle } from "./workspace-watch.js";
import { WriteHistory, type SessionEvent } from "./write-history.js";
import { ActivityStore } from "./activity.js";
import { gitDiffFile, gitDiffFiles, gitStatus, type GitDiffScope } from "./git-diff.js";
import { openInSystem } from "./system-open.js";

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

type NativeChangedFile = {
  path: string;
  display: string;
  added: number;
  deleted: number;
  binary?: true;
  oversized?: true;
};

type NativeChangesSummary = {
  turn: number;
  cwd: string;
  files: NativeChangedFile[];
  total: number;
  added: number;
  deleted: number;
};

type NativeDiff =
  | { kind: "text"; path: string; display: string; before: boolean; after: boolean; coarse: boolean; hunks: Array<{ oldStart: number; oldLines: number; newStart: number; newLines: number; lines: string[] }> }
  | { kind: "binary"; path: string; display: string }
  | { kind: "oversized"; path: string; display: string };

type WorkspaceChanges = {
  summary(sessionId: string, seq: number): NativeChangesSummary | undefined;
  diff(sessionId: string, seq: number, index: number, signal: AbortSignal): Promise<NativeDiff | undefined>;
};

type HostContext = {
  webServer: WebServer;
  workspaceChanges: WorkspaceChanges;
  sessions?: {
    list(): SessionLike[];
  };
  on: {
    (event: "session/event", handler: (session: SessionLike, event: SessionEvent) => void): unknown;
    (event: "session/created", handler: (session: SessionLike) => void): unknown;
  };
};

export const name = "dsh-workbench";
export const inject = ["sessions", "webServer", "workspaceChanges"];

function sessionRootOf(session: SessionLike): string | null {
  const value = session.header?.cwd ?? session.cwd;
  return typeof value === "string" && value.trim() ? resolve(value.trim()) : null;
}

function replayEventsOf(session: SessionLike): readonly SessionEvent[] {
  return session.snapshotEvents?.() ?? session.events ?? [];
}

function nativeDiffFromFile(file: GitFileDiff): NativeDiff {
  const rows = diffLines(file.before ?? "", file.content);
  const oldRows = rows.filter((row) => row.kind !== "add");
  const newRows = rows.filter((row) => row.kind !== "remove");
  return {
    kind: "text",
    path: file.path,
    display: file.path,
    before: file.before !== null,
    after: true,
    coarse: false,
    hunks: rows.length ? [{
      oldStart: oldRows[0]?.line ?? 0,
      oldLines: oldRows.length,
      newStart: newRows[0]?.line ?? 0,
      newLines: newRows.length,
      lines: rows.map((row) => `${row.kind === "add" ? "+" : row.kind === "remove" ? "-" : " "}${row.text}`),
    }] : [],
  };
}

async function readJson(req: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  const raw = Buffer.concat(chunks).toString("utf8").trim();
  return raw ? JSON.parse(raw) : {};
}

export function apply(ctx: HostContext): void {
  ctx.webServer.register({
    kind: "exact",
    path: EDITOR_BUNDLE_API_PATH,
    handler: async (_req, res) => {
      try {
        const content = await readFile(new URL("../client-editor.js", import.meta.url));
        res.statusCode = 200;
        res.setHeader("content-type", "text/javascript; charset=utf-8");
        res.setHeader("cache-control", "no-cache");
        res.setHeader("x-content-type-options", "nosniff");
        res.end(content);
      } catch { sendJson(res, 404, { error: "editor_bundle_missing" }); }
    },
  });
  let root = resolve(process.cwd());
  let paths = createPathIdentity(root);
  const pathIdentities = new Map([[root, paths]]);
  const sessionRoots = new Map<string, string>();
  let workspace: Workspace = createWorkspace({ root, paths });
  const workspacesByRoot = new Map([[root, workspace]]);
  const workspaceForSession = (sessionId?: string): Workspace => {
    const sessionRoot = sessionId ? sessionRoots.get(sessionId) : undefined;
    const base = sessionRoot ?? root;
    let sessionWorkspace = workspacesByRoot.get(base);
    if (!sessionWorkspace) {
      let identity = pathIdentities.get(base);
      if (!identity) {
        identity = createPathIdentity(base);
        pathIdentities.set(base, identity);
      }
      sessionWorkspace = createWorkspace({ root: base, paths: identity });
      workspacesByRoot.set(base, sessionWorkspace);
    }
    return sessionWorkspace;
  };
  const identify = (path: string, sessionId?: string) => {
    const sessionRoot = sessionId ? sessionRoots.get(sessionId) : undefined;
    const base = sessionRoot ?? root;
    let identity = pathIdentities.get(base);
    if (!identity) {
      identity = createPathIdentity(base);
      pathIdentities.set(base, identity);
    }
    const located = identity.identify(path);
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
  const broadcastReview = () => {
    for (const client of eventClients) client.write("event: review\ndata: {}\n\n");
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
    pathIdentities.set(root, paths);
    workspace = createWorkspace({ root, paths });
    workspacesByRoot.set(root, workspace);
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
          const body = await readJson(req) as { path?: unknown; content?: unknown; expected?: unknown; session?: unknown };
          if (typeof body.path !== "string" || typeof body.content !== "string" || typeof body.expected !== "string") return sendJson(res, 400, { error: "missing_path" });
          const sessionId = typeof body.session === "string" ? body.session : undefined;
          const saved = await workspaceForSession(sessionId).write(body.path, body.content, body.expected);
          if (!saved.ok) return sendJson(res, saved.status, { error: saved.error });
          pump.notify(saved.path);
          return sendJson(res, 200, saved);
        } catch {
          return sendJson(res, 400, { error: "missing_path" });
        }
      }
      if (req.method && req.method !== "GET") return sendJson(res, 405, { error: "missing_path" });
      const requested = new URL(req.url ?? "/", "http://dsh.local").searchParams.get("path") ?? "";
      const query = new URL(req.url ?? "/", "http://dsh.local").searchParams;
      const modeParam = query.get("mode");
      const sessionId = query.get("session") ?? undefined;
      const mode: FileOpenMode = modeParam === "view" || modeParam === "diff" ? modeParam : "auto";
      const disk = await workspaceForSession(sessionId).read(requested);
      if (!disk.ok) return sendJson(res, disk.status, { error: disk.error });
      sendJson(res, 200, toFilePayload(disk, history.get(disk.path, sessionId), mode));
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
    path: SYSTEM_OPEN_API_PATH,
    handler: async (req, res) => {
      if (req.method !== "POST") return sendJson(res, 405, { error: "missing_path" });
      try {
        const body = await readJson(req) as { path?: unknown };
        if (typeof body.path !== "string") return sendJson(res, 400, { error: "missing_path" });
        const located = workspace.resolve(body.path);
        if (!located.ok) return sendJson(res, located.status, { error: located.error });
        await openInSystem(located.absolute);
        sendJson(res, 200, {});
      } catch {
        sendJson(res, 500, { error: "read_failed" });
      }
    },
  });

  ctx.webServer.register({
    kind: "exact",
    path: REVIEW_API_PATH,
    handler: async (req, res) => {
      const query = new URL(req.url ?? "/", "http://dsh.local").searchParams;
      const sessionId = query.get("session") ?? undefined;
      const seqValue = query.get("seq");
      const indexValue = query.get("index");
      if (req.method !== "POST" && sessionId && query.get("source") === "harness") {
        const session = ctx.sessions?.list().find((item) => String(item.id) === sessionId);
        if (!session) return sendJson(res, 200, { turns: [], sessionId });
        if (seqValue !== null && indexValue !== null) {
          const seq = Number(seqValue);
          const index = Number(indexValue);
          if (!Number.isSafeInteger(seq) || seq < 0 && seq !== -1 && seq !== -2 || !Number.isSafeInteger(index) || index < 0) return sendJson(res, 400, { error: "invalid_review_coordinate" });
          if (seq === -2) {
            const reviewRoot = sessionRoots.get(sessionId) ?? root;
            let file: GitFileDiff | undefined;
            try { file = (await gitDiffFiles(reviewRoot, "uncommitted"))[index]; } catch { /* Git is optional */ }
            return file ? sendJson(res, 200, { diff: nativeDiffFromFile(file) }) : sendJson(res, 404, { error: "review_unavailable" });
          }
          if (seq === -1) {
            const events = replayEventsOf(session);
            const reviewRoot = sessionRoots.get(sessionId) ?? root;
            const latestNativeSeq = events.reduce((latest, event) => event.type === "workspace/changes" && typeof event.seq === "number" ? Math.max(latest, event.seq) : latest, -1);
            const change = history.getReviewAfter(sessionId, reviewRoot, latestNativeSeq)[index];
            const revision = change ? history.get(change.path, sessionId) : null;
            if (!change || !revision) return sendJson(res, 404, { error: "review_unavailable" });
            const rows = diffLines(revision.before ?? "", revision.content);
            const diff: NativeDiff = {
              kind: "text",
              path: change.path,
              display: change.path,
              before: revision.before !== null,
              after: true,
              coarse: false,
              hunks: rows.length ? [{
                oldStart: revision.before === null ? 0 : 1,
                oldLines: rows.filter((row) => row.kind !== "add").length,
                newStart: revision.content.length === 0 ? 0 : 1,
                newLines: rows.filter((row) => row.kind !== "remove").length,
                lines: rows.map((row) => `${row.kind === "add" ? "+" : row.kind === "remove" ? "-" : " "}${row.text}`),
              }] : [],
            };
            return sendJson(res, 200, { diff });
          }
          const abort = new AbortController();
          res.on("close", () => abort.abort());
          try {
            const diff = await ctx.workspaceChanges.diff(sessionId, seq, index, abort.signal);
            return diff ? sendJson(res, 200, { diff }) : sendJson(res, 404, { error: "review_unavailable" });
          } catch {
            if (!abort.signal.aborted) sendJson(res, 500, { error: "review_unavailable" });
            return;
          }
        }
        const byTurn = new Map<number, { seq: number; summary: NativeChangesSummary }>();
        let latestNativeSeq = -1;
        for (const event of replayEventsOf(session)) {
          if (event.type !== "workspace/changes" || typeof event.seq !== "number" || !Number.isSafeInteger(event.seq)) continue;
          latestNativeSeq = Math.max(latestNativeSeq, event.seq);
          const turn = event.data?.turn;
          if (typeof turn !== "number" || !Number.isSafeInteger(turn)) continue;
          const summary = ctx.workspaceChanges.summary(sessionId, event.seq);
          if (summary) byTurn.set(turn, { seq: event.seq, summary });
        }
        const turns: Array<{ turn: number; seq: number; total: number; added: number; deleted: number; files: NativeChangedFile[]; live?: true; workspace?: true }> = [...byTurn.entries()].sort(([left], [right]) => left - right).map(([turn, value]) => ({
          turn,
          seq: value.seq,
          total: value.summary.total,
          added: value.summary.added,
          deleted: value.summary.deleted,
          files: value.summary.files,
        }));
        const reviewRoot = sessionRoots.get(sessionId) ?? root;
        const liveChanges = history.getReviewAfter(sessionId, reviewRoot, latestNativeSeq);
        if (liveChanges.length) {
          const files = liveChanges.map((change) => ({
            path: change.path,
            display: change.path,
            added: change.additions,
            deleted: change.deletions,
          }));
          turns.push({
            turn: (turns.at(-1)?.turn ?? 0) + 1,
            seq: -1,
            live: true,
            total: files.length,
            added: files.reduce((sum, file) => sum + file.added, 0),
            deleted: files.reduce((sum, file) => sum + file.deleted, 0),
            files,
          });
        }
        if (!turns.length) {
          const reviewRoot = sessionRoots.get(sessionId) ?? root;
          let files: GitFileDiff[] = [];
          try { files = await gitDiffFiles(reviewRoot, "uncommitted"); } catch { /* Git is optional */ }
          if (files.length) {
            turns.push({
              turn: 1,
              seq: -2,
              workspace: true,
              total: files.length,
              added: files.reduce((sum, file) => sum + file.additions, 0),
              deleted: files.reduce((sum, file) => sum + file.deletions, 0),
              files: files.map((file) => ({ path: file.path, display: file.path, added: file.additions, deleted: file.deletions })),
            });
          }
        }
        return sendJson(res, 200, { turns, sessionId });
      }
      const requestedPath = query.get("path");
      const sessions = history.reviewSessions(root);
      const selectedSession = sessionId ?? sessions.at(-1) ?? null;
      if (req.method === "POST") {
        try {
          const body = await readJson(req) as { action?: unknown; path?: unknown };
          if ((body.action !== "acknowledge" && body.action !== "discard") || typeof body.path !== "string" || !selectedSession) {
            return sendJson(res, 400, { error: "missing_path" });
          }
          const path = body.path;
          if (body.action === "acknowledge") {
            if (!history.acknowledgeReview(selectedSession, path, root)) {
              return sendJson(res, 404, { error: "file_not_found" });
            }
            return sendJson(res, 200, { acknowledged: true, path: normalizePath(path), sessionId: selectedSession });
          }
          const change = history.getReview(selectedSession, root).find((item) => normalizePath(item.path) === normalizePath(path));
          const revision = change ? history.get(change.path, selectedSession ?? undefined) : null;
          if (!change || !revision) return sendJson(res, 404, { error: "file_not_found" });
          if (revision.before === null) return sendJson(res, 409, { error: "review_not_discardable" });
          if (revision.sessionId !== selectedSession || revision.revision !== change.revision) {
            return sendJson(res, 409, { error: "file_changed" });
          }
          const restored = await workspace.write(revision.path, revision.before, revision.content);
          if (!restored.ok) return sendJson(res, restored.status, { error: restored.error });
          const result = history.discardReview(selectedSession, revision.path, revision.revision, root);
          if (result === "stale") return sendJson(res, 409, { error: "file_changed" });
          if (result !== "discarded") return sendJson(res, 404, { error: "file_not_found" });
          pump.notify(restored.path);
          return sendJson(res, 200, { discarded: true, path: restored.path, sessionId: selectedSession });
        } catch {
          return sendJson(res, 400, { error: "missing_path" });
        }
      }
      if (req.method && req.method !== "GET") return sendJson(res, 405, { error: "missing_path" });
      if (requestedPath) {
        const path = normalizePath(requestedPath);
        let file: GitFileDiff | null = null;
        try { file = await gitDiffFile(root, "uncommitted", path); } catch { /* Git is optional */ }
        if (!file) {
          const change = history.getReview(selectedSession ?? undefined, root).find((item) => normalizePath(item.path) === path);
          if (change) {
            const disk = await workspace.read(change.path);
            if (disk.ok) {
              const payload = toFilePayload(disk, history.get(disk.path, selectedSession ?? undefined), "diff");
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
          const revision = history.get(change.path, selectedSession ?? undefined);
          if (revision?.source === "dsh-write") sessionFiles.push({ path: change.path, before: revision.before, content: revision.content, ...countDiffLines(revision.before, revision.content) });
          continue;
        }
        const payload = toFilePayload(disk, history.get(disk.path, selectedSession ?? undefined), "diff");
        const counts = countDiffLines(payload.before, payload.content);
        changes.push({ ...change, ...counts });
        sessionFiles.push({ path: disk.path, before: payload.before, content: payload.content, ...counts });
      }
      let worktreeFiles: GitFileDiff[] = [];
      try { worktreeFiles = await gitDiffFiles(root, "uncommitted"); } catch { /* Git is optional */ }
      const files = completeSessionDiffs(worktreeFiles, sessionFiles);
      sendJson(res, 200, { changes: sortReviewFiles(changes), files, sessionFiles: sortReviewFiles(sessionFiles), counts: reviewDiffCounts(files), sessions, sessionId: selectedSession });
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
      const query = new URL(req.url ?? "/", "http://dsh.local").searchParams;
      const requested = query.get("path") ?? "";
      const located = workspaceForSession(query.get("session") ?? undefined).resolve(requested);
      if (!located.ok) return sendJson(res, located.status, { error: located.error });
      try {
        const info = await stat(located.absolute);
        if (!info.isFile()) return sendJson(res, 413, { error: "not_previewable" });
        if (info.size > MAX_IMAGE_PREVIEW_BYTES) return sendJson(res, 413, { error: "file_too_large" });
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
    if (sessionRoot) {
      sessionRoots.set(String(session.id), sessionRoot);
      history.noteSessionRoot(String(session.id), sessionRoot);
    }
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
    if (event.type === "workspace/changes") broadcastReview();
    if (revision?.source === "dsh-write") broadcastWrite(revision.path);
    if (activity.record(event, String(session.id))) broadcastActivity();
  });
}
