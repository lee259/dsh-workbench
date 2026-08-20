import type { LocaleStore } from "../shared/i18n.js";
import type { FileStore } from "./store.js";
import type { WorkbenchSlotContext } from "./plugin-contract.js";
import { createWorkbenchComponents } from "./workbench/components.js";
import { applyWorkbenchSlots } from "./workbench/slots.js";
import { setReactRuntime } from "./react-bridge.js";
import type { WorkbenchRuntimeServices } from "./workbench/runtime.js";

type ReactNs = typeof import("react");

export function createWorkbenchUi(
  React: ReactNs,
  store: FileStore,
  i18n: LocaleStore,
  extras: Omit<WorkbenchRuntimeServices, "store" | "i18n"> = {},
) {
  setReactRuntime(React);
  const services: WorkbenchRuntimeServices = { store, i18n, ...extras };
  const { DrawerRoot, RuntimeToggle, RuntimeFileToolRow } = createWorkbenchComponents(services);
  return {
    FileDrawer: DrawerRoot,
    WorkbenchToggle: RuntimeToggle,
    WorkbenchRoot: DrawerRoot,
    FileToolRow: RuntimeFileToolRow,
    apply(ctx: WorkbenchSlotContext) {
      applyWorkbenchSlots(ctx, { FileToolRow: RuntimeFileToolRow, WorkbenchToggle: RuntimeToggle });
    },
  };
}
