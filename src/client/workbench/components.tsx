import type { LocaleStore } from "../../shared/i18n.js";
import type { FileStore } from "../store.js";
import { FileToolRow } from "../session/file-tool-row.js";
import { WorkbenchDrawer } from "./drawer.js";
import { WorkbenchRuntime } from "./runtime.js";
import { WorkbenchToggle } from "./toggle.js";
import { NativeFileTab } from "./native-file-tab.js";
import { NativeReviewTab } from "./native-review-tab.js";
import { NativeReviewTabTitle, NativeWorkspaceTabTitle } from "./native-title.js";
import { NativeWorkspaceTab } from "./native-workspace-tab.js";
import type { WorkbenchRuntimeServices } from "./runtime.js";

export function createWorkbenchComponents(services: WorkbenchRuntimeServices) {
  const DrawerRoot = () => <WorkbenchRuntime services={services}><WorkbenchDrawer /></WorkbenchRuntime>;
  const NativeWorkspace = () => <WorkbenchRuntime services={services}><NativeWorkspaceTab /></WorkbenchRuntime>;
  const NativeFile = (props: Parameters<typeof NativeFileTab>[0]) => <WorkbenchRuntime services={services}><NativeFileTab {...props} /></WorkbenchRuntime>;
  const NativeReview = () => <WorkbenchRuntime services={services}><NativeReviewTab /></WorkbenchRuntime>;
  const NativeWorkspaceTitle = () => <WorkbenchRuntime services={services}><NativeWorkspaceTabTitle /></WorkbenchRuntime>;
  const NativeReviewTitle = () => <WorkbenchRuntime services={services}><NativeReviewTabTitle /></WorkbenchRuntime>;
  const RuntimeToggle = () => <WorkbenchRuntime services={services}><WorkbenchToggle /></WorkbenchRuntime>;
  const RuntimeReviewToggle = () => <WorkbenchRuntime services={services}><WorkbenchToggle reviewOnly /></WorkbenchRuntime>;
  const RuntimeFileToolRow = (props: { toolName: string; block?: unknown }) => <WorkbenchRuntime services={services}><FileToolRow {...props} /></WorkbenchRuntime>;

  return {
    DrawerRoot,
    NativeWorkspace,
    NativeFile,
    NativeReview,
    NativeWorkspaceTitle,
    NativeReviewTitle,
    RuntimeToggle,
    RuntimeReviewToggle,
    RuntimeFileToolRow,
  };
}
