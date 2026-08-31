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
