import type { LocaleStore } from "../shared/i18n.js";
import type { FileStore } from "./store.js";
import { createWorkbenchComponents } from "./workbench/components.js";
import { setWorkbenchRuntimeFallback } from "./workbench/runtime.js";
import { applyWorkbenchSlots, type SlotContext } from "./workbench/slots.js";
import { setReactRuntime } from "./react-bridge.js";

type ReactNs = typeof import("react");

export function createWorkbenchUi(React: ReactNs, store: FileStore, i18n: LocaleStore) {
  setReactRuntime(React);
  setWorkbenchRuntimeFallback({ store, i18n });
  const { DrawerRoot, RuntimeToggle, RuntimeFileToolRow } = createWorkbenchComponents(store, i18n);
  return {
    FileDrawer: DrawerRoot,
    WorkbenchToggle: RuntimeToggle,
    WorkbenchRoot: DrawerRoot,
    FileToolRow: RuntimeFileToolRow,
    apply(ctx: SlotContext) {
      applyWorkbenchSlots(ctx, { FileToolRow: RuntimeFileToolRow, WorkbenchToggle: RuntimeToggle });
    },
  };
}
