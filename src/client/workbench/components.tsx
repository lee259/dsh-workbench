import type { LocaleStore } from "../../shared/i18n.js";
import type { FileStore } from "../store.js";
import { FileToolRow } from "../session/file-tool-row.js";
import { WorkbenchDrawer } from "./drawer.js";
import { WorkbenchRuntime } from "./runtime.js";
import { WorkbenchToggle } from "./toggle.js";

export function createWorkbenchComponents(store: FileStore, i18n: LocaleStore) {
  const DrawerRoot = () => <WorkbenchRuntime services={{ store, i18n }}><WorkbenchDrawer /></WorkbenchRuntime>;
  const RuntimeToggle = () => <WorkbenchRuntime services={{ store, i18n }}><WorkbenchToggle /></WorkbenchRuntime>;
  const RuntimeFileToolRow = (props: { toolName: string; block?: unknown }) => <WorkbenchRuntime services={{ store, i18n }}><FileToolRow {...props} /></WorkbenchRuntime>;

  return {
    DrawerRoot,
    RuntimeToggle,
    RuntimeFileToolRow,
  };
}
