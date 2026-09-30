import { useWorkbenchServices } from "./runtime.js";

export function NativeWorkspaceTabTitle() {
  const { i18n } = useWorkbenchServices();
  return i18n.t("workspaceTitle");
}

export function NativeReviewTabTitle() {
  const { i18n } = useWorkbenchServices();
  return i18n.t("reviewTab");
}
