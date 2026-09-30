import { countDiffLines } from "../shared/line-diff.js";
import { isFileTool, normalizePath, type FileRevision, type FileToolName, type ReviewChange } from "../shared/types.js";

export type SessionEvent = {
  type?: string;
  seq?: number;
  data?: Record<string, unknown>;
};

export type ReviewDiscardResult = "discarded" | "not_found" | "not_discardable" | "stale";

type ToolArgs = {
  file_path?: unknown;
  path?: unknown;
  content?: unknown;
  old_string?: unknown;
  new_string?: unknown;
  replace_all?: unknown;
};

type PendingCall = {
  name: FileToolName;
  args: ToolArgs;
};

type FileDiff = {
  path: string;
  oldText: string | null;
  newText: string;
};

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" ? value as Record<string, unknown> : null;
}

function asString(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

function parseArgs(value: unknown): ToolArgs | null {
  if (typeof value === "string") {
    try {
      return parseArgs(JSON.parse(value));
    } catch {
      return null;
    }
  }
  const record = asRecord(value);
  return record ? record as ToolArgs : null;
}

function filePathOf(args: ToolArgs, canonicalize: (path: string) => string): string | null {
  const path = asString(args.file_path) ?? asString(args.path);
  return path ? canonicalize(path) : null;
}

function callIdOf(data: Record<string, unknown>, fallback: string): string {
  return asString(data.subCallId)
    ?? asString(data.rootCallId)
    ?? asString(data.callId)
    ?? fallback;
}

/**
 * Unwrap the real DSH `tool/result` message: its `content` is an array of one
 * `ToolResultBlock` (`{ type: "tool-result", toolCallId, content: [...] }`).
 * Returns that block, or null for the flat fixture shape.
 */
function resultBlockOf(message: unknown): Record<string, unknown> | null {
  const record = asRecord(message);
  const content = record?.content;
  if (!Array.isArray(content)) return null;
  const block = asRecord(content[0]);
  return block && block.type === "tool-result" ? block : null;
}

function parseReadOutput(content: unknown): string | null {
  if (typeof content === "string") return stripReadEnvelope(content);
  if (!Array.isArray(content)) return null;

  const text = content
    .map((item) => asRecord(item))
    .find((item) => typeof item?.text === "string");
  return text ? stripReadEnvelope(String(text.text)) : null;
}

function stripReadEnvelope(raw: string): string {
  return raw
    .replace(/^<content>\n?/, "")
    .replace(/\n\(?End of file[\s\S]*$/, "")
    .replace(/\n<\/content>\s*$/, "")
    .split("\n")
    .map((line) => line.replace(/^\s*\d+: ?/, ""))
    .join("\n");
}

function applyEdit(source: string, args: ToolArgs): string | null {
  const oldString = asString(args.old_string);
  const newString = asString(args.new_string);
  if (oldString == null || newString == null) return null;
  if (args.replace_all === true) return source.split(oldString).join(newString);
  if (!source.includes(oldString)) return null;
  return source.replace(oldString, newString);
}

function changeSummary(name: FileToolName, args: ToolArgs, before: string | null): string {
  if (name === "write") return before == null ? "Created file" : "Rewrote file";
  return name === "edit" ? "Edited file" : "Updated file";
}

function diffsFromMeta(meta: unknown): FileDiff[] {
  const record = asRecord(meta);
  const diffs = record?.diffs;
  if (!Array.isArray(diffs)) return [];

  return diffs.flatMap((item) => {
    const diff = asRecord(item);
    const path = asString(diff?.path);
    const newText = asString(diff?.newText);
    if (!path || newText == null) return [];
    return [{
      path,
      oldText: asString(diff?.oldText),
      newText,
    }];
  });
}

/**
 * Records DSH file-tool outcomes from the durable session log.
 *
 * Native mode emits `tool/call` + `tool/result` (`arguments` is a JSON string;
 * `dsh-tool-fs` may attach a contextual diff on `meta.diffs`).
 * Code mode bridges each sub-call as `tool/code-dispatch`.
 */
export class WriteHistory {
  private readonly revisions = new Map<string, FileRevision>();
  private readonly latestRevisions = new Map<string, FileRevision>();
  private readonly reviewRevisions = new Map<string, ReviewChange>();
  private readonly reviewEventSeq = new Map<string, number>();
  private readonly sessionRoots = new Map<string, string>();
  private readonly seenCalls = new Set<string>();
  private readonly pending = new Map<string, PendingCall>();
  private readonly acknowledgedReviews = new Set<string>();

  constructor(private readonly canonicalize: (path: string, sessionId?: string) => string = normalizePath) {}

  record(event: SessionEvent, sessionId: string): FileRevision | null {
    let revision: FileRevision | null = null;
    if (event.type === "tool/call") revision = this.rememberCall(event, sessionId);
    else if (event.type === "tool/result") revision = this.recordResult(event, sessionId);
    else if (event.type === "tool/code-dispatch") revision = this.recordDispatch(event, sessionId);
    if (revision?.source === "dsh-write") {
      this.reviewEventSeq.set(this.reviewKey(sessionId, revision.path), event.seq ?? -1);
    }
    if (event.type === "tool/result") {
      for (const diff of diffsFromMeta(event.data?.meta)) {
        const path = this.key(diff.path, sessionId);
        this.reviewEventSeq.set(this.reviewKey(sessionId, path), event.seq ?? -1);
      }
    }
    return revision;
  }

  replay(events: readonly SessionEvent[], sessionId: string): void {
    for (const event of events) this.record(event, sessionId);
  }

  get(path: string, sessionId?: string): FileRevision | null {
    const normalized = this.key(path, sessionId);
    return (sessionId
      ? this.revisions.get(this.revisionKey(sessionId, normalized))
      : this.latestRevisions.get(normalized)) ?? null;
  }

  noteSessionRoot(sessionId: string, root: string): void {
    const value = root.trim();
    if (value) this.sessionRoots.set(sessionId, value);
  }

  getReview(sessionId?: string, root?: string): ReviewChange[] {
    return [...this.reviewRevisions.values()].filter((change) => {
      if (this.acknowledgedReviews.has(this.reviewKey(change.sessionId, change.path))) return false;
      if (sessionId && change.sessionId !== sessionId) return false;
      if (!root) return true;
      const sessionRoot = this.sessionRoots.get(change.sessionId);
      return !sessionRoot || sessionRoot === root;
    });
  }

  getReviewAfter(sessionId: string, root: string | undefined, seq: number): ReviewChange[] {
    return this.getReview(sessionId, root).filter((change) => {
      return (this.reviewEventSeq.get(this.reviewKey(sessionId, change.path)) ?? -1) > seq;
    });
  }

  acknowledgeReview(sessionId: string, path: string, root?: string): boolean {
    const normalized = this.key(path, sessionId);
    const change = this.reviewRevisions.get(this.reviewKey(sessionId, normalized));
    if (!change) return false;
    if (root) {
      const sessionRoot = this.sessionRoots.get(sessionId);
      if (sessionRoot && sessionRoot !== root) return false;
    }
    this.acknowledgedReviews.add(this.reviewKey(sessionId, normalized));
    return true;
  }

  discardReview(sessionId: string, path: string, revision: number, root?: string): ReviewDiscardResult {
    const normalized = this.key(path, sessionId);
    const key = this.reviewKey(sessionId, normalized);
    const change = this.reviewRevisions.get(key);
    const revisionKey = this.revisionKey(sessionId, normalized);
    const current = this.revisions.get(revisionKey);
    if (!change || !current) return "not_found";
    if (root) {
      const sessionRoot = this.sessionRoots.get(sessionId);
      if (sessionRoot && sessionRoot !== root) return "not_found";
    }
    if (change.revision !== revision || current.sessionId !== sessionId || current.revision !== revision) return "stale";
    if (current.before === null) return "not_discardable";
    this.revisions.delete(revisionKey);
    const remaining = [...this.revisions.values()].filter((revision) => revision.path === normalized).at(-1);
    if (remaining) this.latestRevisions.set(normalized, remaining);
    else this.latestRevisions.delete(normalized);
    this.reviewRevisions.delete(key);
    this.acknowledgedReviews.delete(key);
    return "discarded";
  }

  reviewSessions(root?: string): string[] {
    return [...new Set(this.getReview(undefined, root).map((change) => change.sessionId))];
  }

  private key(path: string, sessionId?: string): string {
    return this.canonicalize(path, sessionId);
  }

  private reviewKey(sessionId: string, path: string): string {
    return JSON.stringify([sessionId, path]);
  }

  private revisionKey(sessionId: string, path: string): string {
    return JSON.stringify([sessionId, path]);
  }

  private rememberCall(event: SessionEvent, sessionId: string): FileRevision | null {
    const data = event.data;
    const name = asString(data?.name);
    if (!data || !name || !isFileTool(name)) return null;
    const args = parseArgs(data.arguments);
    if (!args) return null;
    this.pending.set(callIdOf(data, `${sessionId}:${name}`), { name, args });
    return null;
  }

  private recordResult(event: SessionEvent, sessionId: string): FileRevision | null {
    const data = event.data;
    if (!data || data.error) return null;

    const message = asRecord(data.message);
    // Real DSH: tool/result has no top-level callId; it lives on the result
    // block inside message.content[0].toolCallId.  Fall back to the flat
    // fixture shape (callId on the message or data itself).
    const block = resultBlockOf(data.message);
    const callId = asString(block?.toolCallId) ?? callIdOf({ ...data, ...message }, `${sessionId}:result`);
    if (callId == null) return null;
    if (this.seenCalls.has(callId)) return this.revisionForCall(callId, sessionId);
    this.seenCalls.add(callId);

    const pending = this.pending.get(callId);
    this.pending.delete(callId);

    const fromMeta = diffsFromMeta(data.meta);
    if (fromMeta.length > 0) {
      let last: FileRevision | null = null;
      for (const diff of fromMeta) {
        last = this.commit(this.key(diff.path, sessionId), diff.newText, sessionId, "dsh-write", diff.oldText);
      }
      return last;
    }

    if (!pending) return null;
    // Real DSH: the tool result content is inside the block's own content
    // array (ToolResultBlock → TextBlock).  For flat fixtures, use the
    // message content directly.
    const resultContent = block?.content ?? message?.content ?? data.content;
    return this.applyTool(pending.name, pending.args, sessionId, resultContent);
  }

  private recordDispatch(event: SessionEvent, sessionId: string): FileRevision | null {
    const data = event.data;
    const name = asString(data?.name);
    if (!data || data.isError === true || !name || !isFileTool(name)) return null;

    const args = parseArgs(data.arguments);
    if (!args) return null;

    const callId = callIdOf(data, `${sessionId}:${name}:${filePathOf(args, (path) => this.key(path, sessionId)) ?? ""}`);
    if (this.seenCalls.has(callId)) return this.revisionForCall(callId, sessionId);
    this.seenCalls.add(callId);
    return this.applyTool(name, args, sessionId, data.content);
  }

  private applyTool(
    name: FileToolName,
    args: ToolArgs,
    sessionId: string,
    content: unknown,
  ): FileRevision | null {
    const path = filePathOf(args, (value) => this.key(value, sessionId));
    if (!path) return null;
    const revisionKey = this.revisionKey(sessionId, path);

    if (name === "read") {
      if (this.revisions.has(revisionKey)) return this.revisions.get(revisionKey) ?? null;
      const text = parseReadOutput(content);
      return text == null ? null : this.commit(path, text, sessionId, "dsh-read", null);
    }

    if (name === "write") {
      const text = asString(args.content);
      return text == null ? null : this.commit(path, text, sessionId, "dsh-write", undefined, changeSummary(name, args, this.revisions.get(revisionKey)?.content ?? null));
    }

    const previous = this.revisions.get(revisionKey);
    if (previous) {
      const next = applyEdit(previous.content, args);
      return next == null ? previous : this.commit(path, next, sessionId, "dsh-write", undefined, changeSummary(name, args, previous.content));
    }

    const oldString = asString(args.old_string);
    const newString = asString(args.new_string);
    if (oldString == null || newString == null) return null;
    return this.commit(path, newString, sessionId, "dsh-write", oldString, changeSummary(name, args, oldString));
  }

  private commit(
    path: string,
    content: string,
    sessionId: string,
    source: FileRevision["source"],
    before: string | null | undefined = undefined,
    summary = "Updated file",
  ): FileRevision {
    const revisionKey = this.revisionKey(sessionId, path);
    const previous = this.revisions.get(revisionKey);
    const revision: FileRevision = {
      path,
      before: before !== undefined ? before : previous?.content ?? null,
      content,
      revision: source === "dsh-read" ? 0 : (previous?.revision ?? 0) + 1,
      sessionId,
      source,
    };
    this.revisions.set(revisionKey, revision);
    this.latestRevisions.set(path, revision);
    if (source === "dsh-write") {
      const key = this.reviewKey(sessionId, path);
      this.acknowledgedReviews.delete(key);
      this.reviewRevisions.delete(key);
      this.reviewRevisions.set(key, { path: revision.path, sessionId, revision: revision.revision, summary, ...countDiffLines(revision.before, revision.content) });
    }
    return revision;
  }

  private revisionForCall(callId: string, sessionId: string): FileRevision | null {
    const pending = this.pending.get(callId);
    const path = pending ? filePathOf(pending.args, (value) => this.key(value, sessionId)) : null;
    return path ? this.revisions.get(this.revisionKey(sessionId, path)) ?? null : null;
  }
}
