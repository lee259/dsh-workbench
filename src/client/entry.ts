import { installFileOpenCapture } from "./capture/file-open-capture.js";
import { mountWorkbenchDrawer } from "./mount.js";
import { createFileStore } from "./store.js";
import { createWorkbenchUi } from "./ui.js";
import { setReactRuntime } from "./react-bridge.js";
import { createLocaleStore, followDshLocale } from "../shared/i18n.js";
import type { DshRequire, WorkbenchClientContext } from "./plugin-contract.js";

declare global {
  interface Window {
    __ModuleLoader__: {
      load(module: { id: string; factory: (require: DshRequire) => unknown }): void;
    };
  }
}

function createClient(require: DshRequire) {
  const React = require("react") as typeof import("react");
  const ReactDOMClient = require("react-dom/client") as typeof import("react-dom/client");
  const store = createFileStore();
  const i18n = createLocaleStore();
  installFileOpenCapture((path, mode, line) => {
    void store.open(path, mode, line);
  });
  let ui: ReturnType<typeof createWorkbenchUi> | undefined;
  let contextApplied = false;
  let pendingContext: WorkbenchClientContext | undefined;
  setReactRuntime(React);
  ui = createWorkbenchUi(React, store, i18n);
  mountWorkbenchDrawer(React, ReactDOMClient.createRoot, ui.WorkbenchRoot, document.body);
  if (pendingContext && !contextApplied) {
    ui.apply(pendingContext);
    contextApplied = true;
  }
  return {
    inject: ["slots", "locale"],
    apply(ctx: WorkbenchClientContext) {
      followDshLocale(i18n, ctx.locale);
      pendingContext = ctx;
      if (ui && !contextApplied) {
        ui.apply(ctx);
        contextApplied = true;
      }
    },
  };
}

window.__ModuleLoader__.load({
  id: "dsh-workbench",
  factory: createClient,
});
