import { currentSessionId, lastWorkbenchSession, type DshSessionList } from "./workspace-identity.js";

type ReferenceInsert = {
  source: string;
  ref: string;
  label: string;
  clipboardText: string;
};

type ComposerInput = {
  state: { getSnapshot(): { draft: string; draftRev: number } };
  setDraft(draft: string): void;
  insertReference(reference: ReferenceInsert, span: { start: number; end: number; draftRev: number }): boolean;
};

type SessionInput = ComposerInput & {
  insertReference?: ComposerInput["insertReference"];
};

type WorkbenchContext = {
  get(name: string): unknown;
  effect(factory: () => (() => void) | void, name: string): void;
  sessions?: {
    list?: { getSnapshot(): DshSessionList };
    scope?(sessionId: string): unknown;
  };
  uiSession?: unknown;
};

type InputTriggers = {
  registerSource(source: {
    trigger: "@";
    name: string;
    candidates(): Promise<readonly unknown[]>;
    onPick(): undefined;
    codec: { clipboardText(ref: string): string; serialize(ref: string, signal: AbortSignal): Promise<string> };
  }): () => void;
};

type Conversation = { input: { for(scope: unknown): ComposerInput } };

function serviceFrom(context: unknown, name: string): unknown {
  if (!context || typeof context !== "object") return undefined;
  const value = context as Record<string, unknown>;
  if (value[name] !== undefined) return value[name];
  const get = value.get;
  if (typeof get !== "function") return undefined;
  try {
    return (get as (key: string) => unknown).call(context, name);
  } catch {
    return undefined;
  }
}

function inputFor(context: WorkbenchContext, scope: unknown): ComposerInput | undefined {
  const scoped = serviceFrom(scope, "uiSession") ?? serviceFrom(scope, "conversation");
  const uiSession = scoped ?? context.uiSession;
  const candidates = [uiSession, serviceFrom(context, "conversation")];
  for (const candidate of candidates) {
    if (!candidate || typeof candidate !== "object") continue;
    const value = candidate as Record<string, unknown>;
    const input = value.input;
    const nestedInput = input && typeof input === "object" ? input as Record<string, unknown> : undefined;
    const resolverOwner = typeof value.inputFor === "function" || typeof value.for === "function" ? candidate : input;
    const resolver = value.inputFor ?? value.for ?? nestedInput?.for;
    if (typeof resolver === "function") {
      try {
        const resolved = (resolver as (arg: unknown) => unknown).call(resolverOwner, scope);
        if (resolved && typeof resolved === "object" && typeof (resolved as SessionInput).insertReference === "function") {
          return resolved as ComposerInput;
        }
      } catch {
        // Try the next compatibility face.
      }
    }
  }
  return undefined;
}

const SOURCE = "workbench-file";

export type ConversationReferences = {
  bind(ctx: WorkbenchContext): void;
  addPath(path: string, directory?: boolean): boolean;
};

/**
 * Inserts Workbench files through DSH's input machine, which renders a real
 * composer chip and serializes the path when the user sends the message.
 */
export function createConversationReferences(): ConversationReferences {
  let ctx: WorkbenchContext | undefined;

  return {
    bind(next) {
      ctx = next;
      try {
        next.uiSession = next.get("uiSession") ?? next.uiSession;
      } catch {
        // Older runtimes do not expose the split uiSession service.
      }
      const inputTriggers = next.get("inputTriggers") as InputTriggers | undefined;
      if (!inputTriggers) return;
      next.effect(() => inputTriggers.registerSource({
        trigger: "@",
        name: SOURCE,
        candidates: async () => [],
        onPick: () => undefined,
        codec: {
          clipboardText: (ref) => ref,
          serialize: (ref) => Promise.resolve(ref),
        },
      }), "dsh-workbench: file references");
    },
    addPath(path, directory = false) {
      const trimmed = path.trim();
      const value = `${trimmed}${directory && !trimmed.endsWith("/") ? "/" : ""}`;
      if (!ctx || !value) return false;
      const sessionId = lastWorkbenchSession() || currentSessionId(ctx.sessions?.list?.getSnapshot());
      const scope = sessionId ? ctx.sessions?.scope?.(sessionId) : undefined;
      if (!scope) return false;
      const input = inputFor(ctx, scope);
      if (!input) return false;
      const current = input.state.getSnapshot();
      const prefix = current.draft.trim() ? " " : "";
      const markerAt = current.draft.length + prefix.length;
      input.setDraft(`${current.draft}${prefix}@`);
      const after = input.state.getSnapshot();
      return input.insertReference({
        source: SOURCE,
        ref: value,
        label: value,
        clipboardText: value,
      }, { start: markerAt, end: markerAt + 1, draftRev: after.draftRev });
    },
  };
}
