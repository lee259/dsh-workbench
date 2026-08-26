import * as React from "react";
import * as ReactDOM from "react-dom";
import { createRoot } from "react-dom/client";
import { installFileOpenCapture } from "./capture/file-open-capture.js";
import { mountWorkbenchDrawer } from "./mount.js";
import { createFileStore } from "./store.js";
import { createWorkbenchUi } from "./ui.js";
import { setReactDomRuntime, setReactRuntime } from "./react-bridge.js";
import { createLocaleStore, followDshLocale } from "../shared/i18n.js";
import { installWorkbenchStyles } from "./workbench/styles.js";
import type { WorkbenchClientContext } from "./plugin-contract.js";
import { followDshSession, followDshWorkspace, notifyWorkbenchSession, retargetWorkbenchRoot, workspaceAbsolutePath } from "./workspace-identity.js";
import { createConversationReferences } from "./conversation-references.js";
import { runtimeSingleton } from "./runtime-singleton.js";

export const inject = ["slots", "locale", "modules", "sessions", "workspaces", "inputTriggers", "conversation"] as const;

type WorkbenchRuntime = {
  i18n: ReturnType<typeof createLocaleStore>;
  references: ReturnType<typeof createConversationReferences>;
  ui: ReturnType<typeof createWorkbenchUi>;
  setWorkspaceRoot(root: string): void;
};

const getWorkbenchRuntime = runtimeSingleton((): WorkbenchRuntime => {
  const store = createFileStore();
  const i18n = createLocaleStore();
  const references = createConversationReferences();
  installFileOpenCapture((path, mode, line) => {
    if (mode === "diff") {
      window.dispatchEvent(new CustomEvent("dsh-wb-review-request", { detail: path }));
      return;
    }
    window.dispatchEvent(new CustomEvent("dsh-wb-file-request", { detail: { path, mode, line } }));
  });
  setReactRuntime(React);
  setReactDomRuntime(ReactDOM);
  installWorkbenchStyles(document);
  let workspaceRoot = "";
  const ui = createWorkbenchUi(React, store, i18n, {
    references,
    absolutePath: (path) => workspaceAbsolutePath(workspaceRoot, path),
  });
  mountWorkbenchDrawer(React, createRoot, ui.WorkbenchRoot, document.body);
  return { i18n, references, ui, setWorkspaceRoot(root) { workspaceRoot = root; } };
});

export function apply(ctx: WorkbenchClientContext): void {
  const { i18n, references, ui, setWorkspaceRoot } = getWorkbenchRuntime();
  ctx.effect(() => followDshLocale(i18n, ctx.locale), "dsh-workbench: locale");
  ctx.effect(() => followDshWorkspace(ctx, (path) => {
    setWorkspaceRoot(path);
    void retargetWorkbenchRoot(path);
  }), "dsh-workbench: workspace");
  ctx.effect(() => followDshSession(ctx, notifyWorkbenchSession), "dsh-workbench: session");
  references.bind(ctx);
  ui.apply(ctx);
}
