import { createConversationReferences } from "../src/client/conversation-references.js";
import { notifyWorkbenchSession } from "../src/client/workspace-identity.js";
import { expect, test } from "vitest";

test("file references append an @ path through the current session composer", () => {
  let draft = "Explain this";
  let scoped = "";
  const input = {
    state: { getSnapshot: () => ({ draft }) },
    setDraft(next: string) { draft = next; },
  };
  const references = createConversationReferences();
  references.bind({
    get(name) { return name === "conversation" ? { input: { for(scope: { id: string }) { scoped = scope.id; return input; } } } : undefined; },
    sessions: {
      list: { getSnapshot: () => ({ current: "active-session" }) },
      scope: (id) => ({ id }),
    },
  });
  expect(references.addPath(" src/main.ts ")).toBe(true);
  expect(scoped).toBe("active-session");
  expect(draft).toBe("Explain this @src/main.ts");
});

test("file references append a trailing slash for directories", () => {
  let draft = "";
  const input = {
    state: { getSnapshot: () => ({ draft }) },
    setDraft(next: string) { draft = next; },
  };
  const references = createConversationReferences();
  references.bind({
    get: () => ({ input: { for: () => input } }),
    sessions: { list: { getSnapshot: () => ({ current: "s1" }) }, scope: () => ({}) },
  });
  expect(references.addPath("src", true)).toBe(true);
  expect(draft).toBe("@src/");
});

test("selection context preserves its code whitespace when appended", () => {
  let draft = "Review";
  const input = {
    state: { getSnapshot: () => ({ draft }) },
    setDraft(next: string) { draft = next; },
  };
  const references = createConversationReferences();
  references.bind({
    get(name) { return name === "conversation" ? { input: { for: () => input } } : undefined; },
    sessions: {
      list: { getSnapshot: () => ({ current: "active-session" }) },
      scope: () => ({ id: "active-session" }),
    },
  });

  expect(references.appendText("```\n  const x = 1;\n```\n")).toBe(true);
  expect(draft).toBe("Review ```\n  const x = 1;\n```\n");
});

test("file references prefer the currently selected session over a stale cache", () => {
  notifyWorkbenchSession("stale-session");
  let usedActiveScope = false;
  const input = { state: { getSnapshot: () => ({ draft: "" }) }, setDraft() {} };
  const references = createConversationReferences();
  references.bind({
    get: () => ({ input: { for: () => input } }),
    sessions: {
      list: { getSnapshot: () => ({ current: "active-session" }) },
      scope: (id) => {
        if (id === "active-session") usedActiveScope = true;
        return id === "active-session" ? {} : undefined;
      },
    },
  });
  expect(references.addPath("src/main.ts")).toBe(true);
  expect(usedActiveScope).toBe(true);
});

test("file references use an explicitly supplied session", () => {
  let usedSession = "";
  const input = {
    state: { getSnapshot: () => ({ draft: "" }) },
    setDraft() {},
  };
  const references = createConversationReferences();
  references.bind({
    get(name) { return name === "conversation" ? { input: { for(scope: { id: string }) { usedSession = scope.id; return input; } } } : undefined; },
    sessions: {
      list: { getSnapshot: () => ({ current: "current-session" }) },
      scope(sessionId) { return { id: sessionId }; },
    },
  });

  expect(references.appendText("@src/main.ts:1", "review-session")).toBe(true);
  expect(usedSession).toBe("review-session");
});

test("an unavailable explicit session never falls back to another draft", () => {
  let scopeCalls = 0;
  const references = createConversationReferences();
  references.bind({
    get: () => ({ input: { for: () => ({ state: { getSnapshot: () => ({ draft: "" }) }, setDraft() {} }) } }),
    sessions: {
      list: { getSnapshot: () => ({ current: "current-session" }) },
      scope(sessionId) {
        scopeCalls += 1;
        return sessionId === "review-session" ? undefined : {};
      },
    },
  });

  expect(references.appendText("@src/main.ts:1", "review-session")).toBe(false);
  expect(scopeCalls).toBe(1);
});
