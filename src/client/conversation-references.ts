import { currentSessionId, lastWorkbenchSession, type DshSessionList } from "./workspace-identity.js";

type ComposerInput = {
  state: { getSnapshot(): { draft: string } };
  setDraft(draft: string): void;
};

type Conversation = { input: { for(scope: unknown): ComposerInput } };

type WorkbenchContext = {
  get(name: string): unknown;
  sessions?: {
    list?: { getSnapshot(): DshSessionList };
    scope?(sessionId: string): unknown;
  };
};

export type ConversationReferences = {
  bind(ctx: WorkbenchContext): void;
  addPath(path: string, directory?: boolean, sessionId?: string): boolean;
  appendText(text: string, sessionId?: string): boolean;
};

/**
 * Add an @path reference to the current composer. This mirrors DSH-better-
 * sidebar: plain text is the stable cross-version input contract, while the
 * host turns it into a reference when the message is submitted.
 */
export function createConversationReferences(): ConversationReferences {
  let ctx: WorkbenchContext | undefined;

  const appendText = (text: string, targetSessionId = ""): boolean => {
    if (!ctx || !text.trim()) return false;
    try {
      const sessionId = targetSessionId || currentSessionId(ctx.sessions?.list?.getSnapshot()) || lastWorkbenchSession();
      const scope = sessionId ? ctx.sessions?.scope?.(sessionId) : undefined;
      const conversation = ctx.get("conversation") as Conversation | undefined;
      if (!scope || !conversation) return false;
      const input = conversation.input.for(scope);
      const draft = input.state.getSnapshot().draft;
      input.setDraft(draft.trim() ? `${draft} ${text}` : text);
      return true;
    } catch {
      return false;
    }
  };

  return {
    bind(next) {
      ctx = next;
    },
    addPath(path, directory = false, sessionId) {
      const trimmed = path.trim();
      const value = `${trimmed}${directory && !trimmed.endsWith("/") ? "/" : ""}`;
      return appendText(`@${value}`, sessionId);
    },
    appendText,
  };
}
