import { installFileOpenCapture } from "./file-open-capture.js";
import { mountWorkbenchDrawer } from "./mount.js";
import { createFileStore } from "./store.js";
import { createWorkbenchUi } from "./ui.js";
import { createLocaleStore, followDshLocale, type DshLocaleFace } from "../shared/i18n.js";

type DshRequire = (id: string) => unknown;

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
  installFileOpenCapture((path) => {
    void store.open(path);
  });
  const ui = createWorkbenchUi(React, store, i18n);
  mountWorkbenchDrawer(React, ReactDOMClient.createRoot, ui.FileDrawer, document.body);
  return {
    inject: ["slots", "locale"],
    apply(ctx: { locale: DshLocaleFace; slots: Parameters<typeof ui.apply>[0]["slots"] }) {
      followDshLocale(i18n, ctx.locale);
      ui.apply(ctx);
    },
  };
}

window.__ModuleLoader__.load({
  id: "dsh-workbench",
  factory: createClient,
});
