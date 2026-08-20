import type { LocaleStore } from "../../shared/i18n.js";
import type { FileStore } from "../store.js";
import { FileToolRow } from "../session/file-tool-row.js";
import { WorkbenchDrawer } from "./drawer.js";
import { WorkbenchRuntime } from "./runtime.js";
import { WorkbenchToggle } from "./toggle.js";
import type { WorkbenchRuntimeServices } from "./runtime.js";

export function createWorkbenchComponents(services: WorkbenchRuntimeServices) {
  const DrawerRoot = () => <WorkbenchRuntime services={services}><WorkbenchDrawer /></WorkbenchRuntime>;
  const RuntimeToggle = () => <WorkbenchRuntime services={services}><WorkbenchToggle /></WorkbenchRuntime>;
  const RuntimeFileToolRow = (props: { toolName: string; block?: unknown }) => <WorkbenchRuntime services={services}><FileToolRow {...props} /></WorkbenchRuntime>;

  return {
    DrawerRoot,
    RuntimeToggle,
    RuntimeFileToolRow,
  };
}
