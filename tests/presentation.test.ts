import { createLegacyWorkbenchPresentation, createNativeWorkbenchPresentation } from "../src/client/presentation.js";
import { createWorkbenchNavigation } from "../src/client/navigation.js";
import { notifyWorkbenchSession } from "../src/client/workspace-identity.js";
import { expect, test } from "vitest";

function fakeParent() {
  const nodes = [];
  return {
    nodes,
    querySelector(selector) {
      return nodes.find((node) => node.selector === selector) ?? null;
    },
    ownerDocument: {
      createElement() {
        const node = {
          selector: "[data-dsh-workbench-root]",
          setAttribute() {},
        };
        return node;
      },
    },
    append(node) {
      nodes.push(node);
    },
  };
}

test("legacy presentation mounts the drawer only once", () => {
  const parent = fakeParent();
  const rendered = [];
  const presentation = createLegacyWorkbenchPresentation(
    { createElement: (type) => ({ type }) },
    () => ({ render(node) { rendered.push(node); } }),
    "WorkbenchRoot",
    parent,
  );

  presentation.mount();
  presentation.mount();

  expect(parent.nodes).toHaveLength(1);
  expect(rendered).toEqual([{ type: "WorkbenchRoot" }]);
});

test("native presentation uses official workspace, file, and review tabs", () => {
  notifyWorkbenchSession("session-1");
  const definitions = [];
  const registrations = [];
  const openedTabs = [];
  const openedResources = [];
  const navigation = createWorkbenchNavigation();
  const sidebar = {
    openTab(kind) { openedTabs.push(kind); },
    openResource(address, options) { openedResources.push({ address, options }); },
  };
  const ctx = {
    sidebarRight: sidebar,
    sidebarRightTabs: { register(definition) { definitions.push(definition); return () => {}; } },
    effect(factory) { factory(); },
    slots: {
      inject(_name, factory) { factory(); },
      register(slot, component) { registrations.push({ slot, component }); return () => {}; },
    },
  };
  const presentation = createNativeWorkbenchPresentation(ctx, navigation, "WorkspaceTab", "FileTab", "ReviewTab", "WorkspaceTitle", "ReviewTitle", "Workspace", "Review");
  expect(presentation).toBeTruthy();
  presentation.mount();

  expect(navigation.openFile("src/a file.ts", "view", 8)).toBe(true);
  expect(navigation.openReview("src/a file.ts")).toBe(true);
  expect(navigation.openReview("src/a file.ts", false)).toBe(true);
  expect(navigation.openFile("src/a file.ts", "diff")).toBe(true);

  expect(definitions.map((definition) => definition.id)).toEqual(["dsh-workbench-workspace", "dsh-workbench-file", "dsh-workbench-review"]);
  expect(registrations).toEqual([
    { slot: { name: "sidebar.right.pane.tab", key: "dsh-workbench-workspace" }, component: "WorkspaceTab" },
    { slot: { name: "sidebar.right.pane.tab", key: "dsh-workbench-file" }, component: "FileTab" },
    { slot: { name: "sidebar.right.pane.tab", key: "dsh-workbench-review" }, component: "ReviewTab" },
    { slot: { name: "sidebar.right.pane.tab.title", key: "dsh-workbench-workspace" }, component: "WorkspaceTitle" },
    { slot: { name: "sidebar.right.pane.tab.title", key: "dsh-workbench-review" }, component: "ReviewTitle" },
  ]);
  expect(openedTabs).toEqual(["workbench-review"]);
  expect(openedResources).toEqual([
    { address: "dsh-resource://file/session/session-1/src/a%20file.ts", options: { kind: "workbench-file", params: { line: 8 } } },
    { address: "dsh-resource://file/session/session-1/src/a%20file.ts", options: { kind: "workbench-file", params: undefined } },
  ]);
});

test("native presentation falls back when optional sidebar faces are unavailable", () => {
  const ctx = {
    get() { throw new Error("unprovided service"); },
    slots: { inject() {}, register() { return () => {}; } },
    effect() {},
  };
  expect(createNativeWorkbenchPresentation(ctx, createWorkbenchNavigation(), "Workspace", "File", "Review", "WorkspaceTitle", "ReviewTitle", "Workspace", "Review")).toBeUndefined();
});
