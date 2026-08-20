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

type WorkbenchContext = {
  get(name: "conversation" | "inputTriggers"): unknown;
  effect(factory: () => (() => void) | void, name: string): void;
  sessions?: {
    list?: { getSnapshot(): DshSessionList };
    scope?(sessionId: string): unknown;
  };
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
      const conversation = ctx.get("conversation") as Conversation | undefined;
      if (!scope || !conversation) return false;
      const input = conversation.input.for(scope);
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
