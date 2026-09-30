import * as React from "react";
import * as ReactDOM from "react-dom";
import { createRoot } from "react-dom/client";
import { installFileOpenCapture } from "./capture/file-open-capture.js";
import { createFileStore } from "./store.js";
import { createWorkbenchUi } from "./ui.js";
import { createWorkbenchNavigation } from "./navigation.js";
import { createLegacyWorkbenchPresentation, createNativeWorkbenchPresentation, type WorkbenchPresentation } from "./presentation.js";
import { setReactDomRuntime, setReactRuntime } from "./react-bridge.js";
import { createLocaleStore, followDshLocale } from "../shared/i18n.js";
import { installWorkbenchStyles } from "./workbench/styles.js";
import type { WorkbenchClientContext } from "./plugin-contract.js";
import { followDshSession, followDshWorkspace, notifyWorkbenchSession, retargetWorkbenchRoot, workspaceAbsolutePath } from "./workspace-identity.js";
import { createConversationReferences } from "./conversation-references.js";
import { runtimeSingleton } from "./runtime-singleton.js";
import { followWorkspaceEvents } from "./workspace-events.js";

// Keep the activation gate on the services this plugin actually consumes.
// The current Harness Sidebar is the primary presentation surface. Keep the
// gate to the capabilities that are truly required by the runtime;
// Session/workspace faces are required because the identity synchronizers read
// them through Cordis properties (optional chaining cannot protect a missing
// injected property from Cordis' contract guard). Sidebar faces stay optional
// and are probed with ctx.get() so older Harness hosts can still receive the
// legacy drawer.
export const inject = ["slots", "locale", "sessions", "workspaces"] as const;

type WorkbenchRuntime = {
  i18n: ReturnType<typeof createLocaleStore>;
  store: ReturnType<typeof createFileStore>;
  references: ReturnType<typeof createConversationReferences>;
  ui: ReturnType<typeof createWorkbenchUi>;
  navigation: ReturnType<typeof createWorkbenchNavigation>;
  presentation: WorkbenchPresentation;
  setWorkspaceRoot(root: string): void;
};

const getWorkbenchRuntime = runtimeSingleton((): WorkbenchRuntime => {
  const i18n = createLocaleStore();
  const navigation = createWorkbenchNavigation();
  const store = createFileStore(undefined, () => window.confirm(i18n.t("closeUnsavedConfirm")));
  window.addEventListener("beforeunload", (event) => {
    if (!store.hasUnsavedChanges()) return;
    event.preventDefault();
    event.returnValue = "";
  });
  const references = createConversationReferences();
  installFileOpenCapture((path, mode, line) => {
    if (mode === "diff") {
      return navigation.openReview(path);
    }
    return navigation.openFile(path, mode, line);
  });
  setReactRuntime(React);
  setReactDomRuntime(ReactDOM);
  installWorkbenchStyles(document);
  let workspaceRoot = "";
  const ui = createWorkbenchUi(React, store, i18n, {
    references,
    absolutePath: (path) => workspaceAbsolutePath(workspaceRoot, path),
    navigation,
  });
  const presentation = createLegacyWorkbenchPresentation(React, createRoot, ui.WorkbenchRoot, document.body);
  return { i18n, store, references, ui, navigation, presentation, setWorkspaceRoot(root) { workspaceRoot = root; } };
});

export function apply(ctx: WorkbenchClientContext): void {
  const { i18n, store, references, ui, navigation, presentation, setWorkspaceRoot } = getWorkbenchRuntime();
  const nativePresentation = createNativeWorkbenchPresentation(
    ctx,
    navigation,
    ui.NativeWorkspace,
    ui.NativeFile,
    ui.NativeReview,
    ui.NativeWorkspaceTitle,
    ui.NativeReviewTitle,
    i18n.t("workspaceTitle"),
    i18n.t("reviewTab"),
  );
  (nativePresentation ?? presentation).mount();
  if (nativePresentation) {
    ctx.effect(() => followWorkspaceEvents(
      () => {},
      undefined,
      ({ path }) => { navigation.openReview(path, false); },
    ), "dsh-workbench: native review updates");
  }
  ctx.effect(() => followDshLocale(i18n, ctx.locale), "dsh-workbench: locale");
  ctx.effect(() => followDshWorkspace(ctx, (path) => {
    setWorkspaceRoot(path);
    store.setWorkspace(path);
    void retargetWorkbenchRoot(path);
  }), "dsh-workbench: workspace");
  ctx.effect(() => followDshSession(ctx, (sessionId) => {
    store.setSession(sessionId);
    notifyWorkbenchSession(sessionId);
  }), "dsh-workbench: session");
  references.bind(ctx);
  ui.apply(ctx, { showToggle: true, nativeReviewToggle: Boolean(nativePresentation) });
}
