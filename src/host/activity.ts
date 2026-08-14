import { isFileTool, normalizePath, type ActivityRecord } from "../shared/types.js";
import type { SessionEvent } from "./write-history.js";

type PendingActivity = {
  id: string;
};

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" ? value as Record<string, unknown> : null;
}

function asString(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

function parseArgs(value: unknown): Record<string, unknown> {
  if (typeof value === "string") {
    try {
      return parseArgs(JSON.parse(value));
    } catch {
      return {};
    }
  }
  return asRecord(value) ?? {};
}

function callIdOf(data: Record<string, unknown>, fallback: string): string {
  return asString(data.subCallId)
    ?? asString(data.rootCallId)
    ?? asString(data.callId)
    ?? fallback;
}

function resultBlockOf(message: unknown): Record<string, unknown> | null {
  const record = asRecord(message);
  const content = record?.content;
  if (!Array.isArray(content)) return null;
  const block = asRecord(content[0]);
  return block && block.type === "tool-result" ? block : null;
}

function pathOf(data: Record<string, unknown>, canonicalize: (path: string) => string): string | null {
  const args = parseArgs(data.arguments);
  const path = asString(args.file_path) ?? asString(args.path) ?? asString(data.file_path) ?? asString(data.path);
  return path ? canonicalize(path) : null;
}

function summaryOf(data: Record<string, unknown>): string | null {
  return asString(data.command)
    ?? asString(data.code);
}

export class ActivityStore {
  private readonly records: ActivityRecord[] = [];
  private readonly pending = new Map<string, PendingActivity>();
  private sequence = 0;

  constructor(private readonly canonicalize: (path: string) => string = normalizePath) {}

  record(event: SessionEvent, sessionId: string): ActivityRecord | null {
    if (event.type === "tool/call") return this.recordCall(event, sessionId);
    if (event.type === "tool/result") return this.recordResult(event, sessionId);
    if (event.type === "tool/code-dispatch") return this.recordDispatch(event, sessionId);
    return null;
  }

  replay(events: readonly SessionEvent[], sessionId: string): void {
    for (const event of events) this.record(event, sessionId);
  }

  getAll(): ActivityRecord[] {
    return this.records.slice(-200);
  }

  private recordCall(event: SessionEvent, sessionId: string): ActivityRecord | null {
    const data = event.data;
    const name = asString(data?.name);
    if (!data || !name) return null;
    const id = `${sessionId}:${callIdOf(data, `${name}:${this.sequence++}`)}`;
    const record: ActivityRecord = {
      id,
      sessionId,
      kind: isFileTool(name) ? "tool" : "code",
      name,
      path: pathOf(data, this.canonicalize),
      summary: summaryOf(data),
      status: "running",
      createdAt: Date.now(),
      finishedAt: null,
    };
    this.records.push(record);
    this.pending.set(callIdOf(data, id), { id });
    return record;
  }

  private recordResult(event: SessionEvent, sessionId: string): ActivityRecord | null {
    const data = event.data;
    if (!data) return null;
    const message = asRecord(data.message);
    const block = resultBlockOf(data.message);
    const callId = asString(block?.toolCallId) ?? callIdOf({ ...data, ...message }, `${sessionId}:result`);
    const pending = this.pending.get(callId);
    if (!pending) return null;
    this.pending.delete(callId);
    const record = this.records.find((item) => item.id === pending.id);
    if (!record) return null;
    record.status = data.error || block?.isError === true ? "error" : "done";
    record.finishedAt = Date.now();
    return record;
  }

  private recordDispatch(event: SessionEvent, sessionId: string): ActivityRecord | null {
    const data = event.data;
    if (!data) return null;
    const name = asString(data.name) ?? "code";
    const record: ActivityRecord = {
      id: `${sessionId}:dispatch:${this.sequence++}`,
      sessionId,
      kind: "code",
      name,
      path: pathOf(data, this.canonicalize),
      summary: summaryOf(data),
      status: data.isError === true ? "error" : "done",
      createdAt: Date.now(),
      finishedAt: Date.now(),
    };
    this.records.push(record);
    return record;
  }
}
