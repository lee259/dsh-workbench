import { mountWorkbenchDrawer, type DrawerParent } from "./mount.js";
import type { WorkbenchNavigation } from "./navigation.js";
import { nativeFileAddress, nativeFilePath, nativeFileTitle } from "./native-address.js";
import type { WorkbenchClientContext } from "./plugin-contract.js";
import { lastWorkbenchSession } from "./workspace-identity.js";

type CreateElement = (type: unknown) => unknown;

type Root = {
  render(node: unknown): void;
};

export type WorkbenchPresentation = {
  mount(): void;
};

type NativeSidebar = {
  openTab(kind: string): void;
  openResource(address: string, options?: { kind?: string; params?: { line?: number } }): void;
};

type NativeSidebarTabs = {
  register(definition: {
    id: string;
    kind: string;
    priority: "extension";
    patterns?: string[];
    canOpen?(address: string): boolean;
    title(address: string): string;
    guide?: Array<{ order: number; title(): string; description(): string }>;
  }): () => void;
};

const WORKSPACE_ID = "dsh-workbench-workspace";
const WORKSPACE_KIND = "workbench-workspace";
const FILE_ID = "dsh-workbench-file";
const FILE_KIND = "workbench-file";
const REVIEW_ID = "dsh-workbench-review";
const REVIEW_KIND = "workbench-review";

function nativeSidebar(ctx: WorkbenchClientContext): { sidebar: NativeSidebar; tabs: NativeSidebarTabs } | undefined {
  let sidebar: unknown;
  let tabs: unknown;
  // These faces are optional on the legacy client. `get` deliberately avoids
  // putting them in the plugin activation gate, so the old drawer remains a
  // real fallback rather than dead code.
  try {
    sidebar = ctx.get("sidebarRight");
    tabs = ctx.get("sidebarRightTabs");
  } catch {
    // Older test/runtime contexts may not expose optional service lookup.
  }
  if (sidebar === undefined) {
    try { sidebar = ctx.sidebarRight; } catch { /* missing optional face */ }
  }
  if (tabs === undefined) {
    try { tabs = ctx.sidebarRightTabs; } catch { /* missing optional face */ }
  }
  if (!sidebar || typeof sidebar !== "object" || !("openTab" in sidebar)) return undefined;
  if (!tabs || typeof tabs !== "object" || !("register" in tabs)) return undefined;
  return { sidebar: sidebar as NativeSidebar, tabs: tabs as NativeSidebarTabs };
}

export function createNativeWorkbenchPresentation(
  ctx: WorkbenchClientContext,
  navigation: WorkbenchNavigation,
  WorkspaceTab: unknown,
  FileTab: unknown,
  ReviewTab: unknown,
  WorkspaceTitle: unknown,
  ReviewTitle: unknown,
  workspaceTitle: string,
  reviewTitle: string,
): WorkbenchPresentation | undefined {
  const native = nativeSidebar(ctx);
  if (!native) return undefined;
  let mounted = false;
  return {
    mount() {
      if (mounted) return;
      mounted = true;
      ctx.effect(() => native.tabs.register({
        id: WORKSPACE_ID,
        kind: WORKSPACE_KIND,
        priority: "extension",
        title: () => workspaceTitle,
        guide: [{ order: 10, title: () => workspaceTitle, description: () => workspaceTitle }],
      }), "dsh-workbench: native workspace");
      ctx.effect(() => native.tabs.register({ id: FILE_ID, kind: FILE_KIND, priority: "extension", canOpen: (address) => nativeFilePath(address) !== undefined, title: nativeFileTitle }), "dsh-workbench: native file");
      ctx.effect(() => native.tabs.register({ id: REVIEW_ID, kind: REVIEW_KIND, priority: "extension", title: () => reviewTitle, guide: [{ order: 20, title: () => reviewTitle, description: () => reviewTitle }] }), "dsh-workbench: native review");
      ctx.effect(() => ctx.slots.inject("sidebar.right.pane.tab", () => ctx.slots.register(
        { name: "sidebar.right.pane.tab", key: WORKSPACE_ID }, WorkspaceTab,
      )), "dsh-workbench: native workspace body");
      ctx.effect(() => ctx.slots.inject("sidebar.right.pane.tab", () => ctx.slots.register({ name: "sidebar.right.pane.tab", key: FILE_ID }, FileTab)), "dsh-workbench: native file body");
      ctx.effect(() => ctx.slots.inject("sidebar.right.pane.tab", () => ctx.slots.register({ name: "sidebar.right.pane.tab", key: REVIEW_ID }, ReviewTab)), "dsh-workbench: native review body");
      ctx.effect(() => ctx.slots.inject("sidebar.right.pane.tab.title", () => ctx.slots.register({ name: "sidebar.right.pane.tab.title", key: WORKSPACE_ID }, WorkspaceTitle)), "dsh-workbench: native workspace title");
      ctx.effect(() => ctx.slots.inject("sidebar.right.pane.tab.title", () => ctx.slots.register({ name: "sidebar.right.pane.tab.title", key: REVIEW_ID }, ReviewTitle)), "dsh-workbench: native review title");
      ctx.effect(() => navigation.subscribe((request) => {
        if (request.kind === "file") {
          const sessionId = lastWorkbenchSession();
          if (!sessionId) return false;
          native.sidebar.openResource(nativeFileAddress(request.path, sessionId), {
            kind: FILE_KIND,
            params: request.line === undefined ? undefined : { line: request.line },
          });
        } else if (request.focus) native.sidebar.openTab(REVIEW_KIND);
        return true;
      }), "dsh-workbench: native navigation");
    },
  };
}

export function createLegacyWorkbenchPresentation(
  React: { createElement: CreateElement },
  createRoot: (container: Element) => Root,
  WorkbenchRoot: unknown,
  parent: DrawerParent,
): WorkbenchPresentation {
  let mounted = false;
  return {
    mount() {
      if (mounted) return;
      mountWorkbenchDrawer(React, createRoot, WorkbenchRoot, parent);
      mounted = true;
    },
  };
}
