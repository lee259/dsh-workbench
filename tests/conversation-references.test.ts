import { createConversationReferences } from "../src/client/conversation-references.js";
import { expect, test } from "vitest";

test("file references become composer chips through the DSH input machine", () => {
  let draft = "Explain this";
  let revision = 3;
  let source: { name: string } | undefined;
  let inserted: unknown;
  const input = {
    state: { getSnapshot: () => ({ draft, draftRev: revision }) },
    setDraft(next: string) { draft = next; revision += 1; },
    insertReference(reference: unknown, span: unknown) { inserted = { reference, span }; return true; },
  };
  const references = createConversationReferences();
  references.bind({
    get(name) {
      if (name === "inputTriggers") return {
        registerSource(next: { name: string }) { source = next; return () => {}; },
      };
      return { input: { for: () => input } };
    },
    effect(factory) { factory(); },
    sessions: {
      list: { getSnapshot: () => ({ current: "s1" }) },
      scope: () => ({ session: "s1" }),
    },
  });

  expect(references.addPath(" src/main.ts ")).toBe(true);
  expect(source?.name).toBe("workbench-file");
  expect(draft).toBe("Explain this @");
  expect(inserted).toEqual({
    reference: {
      source: "workbench-file",
      ref: "src/main.ts",
      label: "src/main.ts",
      clipboardText: "src/main.ts",
    },
    span: { start: 13, end: 14, draftRev: 4 },
  });
});

test("file references use the controller input face when conversation is split", () => {
  let draft = "Explain";
  let inserted = false;
  const input = {
    state: { getSnapshot: () => ({ draft, draftRev: 1 }) },
    setDraft(next: string) { draft = next; },
    insertReference() { inserted = true; return true; },
  };
  const references = createConversationReferences();
  references.bind({
    get(name) {
      if (name === "inputTriggers") return { registerSource() { return () => {}; } };
      if (name === "uiSession") return { inputFor: () => input };
      return undefined;
    },
    effect(factory) { factory(); },
    sessions: { list: { getSnapshot: () => ({ current: "s1" }) }, scope: () => ({}) },
  });
  expect(references.addPath("src/main.ts")).toBe(true);
  expect(inserted).toBe(true);
  expect(draft).toBe("Explain @");
});
