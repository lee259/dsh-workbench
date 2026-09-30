import type { LocaleStore } from "../shared/i18n.js";
import type { FileStore } from "./store.js";
import type { WorkbenchSlotContext } from "./plugin-contract.js";
import { createWorkbenchComponents } from "./workbench/components.js";
import { applyWorkbenchSlots } from "./workbench/slots.js";
import { setReactRuntime } from "./react-bridge.js";
import { createWorkbenchNavigation } from "./navigation.js";
import type { WorkbenchRuntimeServices } from "./workbench/runtime.js";

type ReactNs = typeof import("react");

export function createWorkbenchUi(
  React: ReactNs,
  store: FileStore,
  i18n: LocaleStore,
  extras: Omit<WorkbenchRuntimeServices, "store" | "i18n" | "navigation"> & Partial<Pick<WorkbenchRuntimeServices, "navigation">> = {},
) {
  setReactRuntime(React);
  const services: WorkbenchRuntimeServices = {
    store,
    i18n,
    ...extras,
    navigation: extras.navigation ?? createWorkbenchNavigation(),
  };
  const { DrawerRoot, NativeWorkspace, NativeFile, NativeReview, NativeWorkspaceTitle, NativeReviewTitle, RuntimeToggle, RuntimeReviewToggle, RuntimeFileToolRow } = createWorkbenchComponents(services);
  return {
    FileDrawer: DrawerRoot,
    WorkbenchToggle: RuntimeToggle,
    WorkbenchRoot: DrawerRoot,
    NativeWorkspace,
    NativeFile,
    NativeReview,
    NativeWorkspaceTitle,
    NativeReviewTitle,
    FileToolRow: RuntimeFileToolRow,
    apply(ctx: WorkbenchSlotContext, options?: { showToggle?: boolean; showFileToolRows?: boolean; nativeReviewToggle?: boolean }) {
      applyWorkbenchSlots(ctx, { FileToolRow: RuntimeFileToolRow, WorkbenchToggle: RuntimeToggle, ReviewToggle: RuntimeReviewToggle }, options);
    },
  };
}
