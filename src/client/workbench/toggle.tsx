import { Icon } from "../chrome/icons.js";
import { useWorkbenchServices } from "./runtime.js";
import { WorkbenchStyles } from "./styles.js";
import { useSyncExternalStore } from "react";
import * as React from "react";
import { REVIEW_API_PATH, type ReviewChange } from "../../shared/types.js";
import { followWorkspaceEvents } from "../workspace-events.js";
import { lastWorkbenchSession, sessionIdFromEvent } from "../workspace-identity.js";

export function WorkbenchToggle() {
  const { store, i18n } = useWorkbenchServices();
  const state = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot);
  const t = i18n.t;
  const [changes, setChanges] = React.useState<ReviewChange[]>([]);
  React.useEffect(() => {
    let active = true;
    let requestId = 0;
    let sessionId = lastWorkbenchSession();
    const load = async () => {
      const id = ++requestId;
      if (!sessionId) {
        if (active) setChanges([]);
        return;
      }
      try {
        const response = await fetch(`${REVIEW_API_PATH}?session=${encodeURIComponent(sessionId)}`);
        const payload = await response.json() as { changes?: ReviewChange[] };
        if (active && id === requestId) setChanges(payload.changes ?? []);
      } catch {
        if (active && id === requestId) setChanges([]);
      }
    };
    const onSessionChange = (event: Event) => {
      sessionId = sessionIdFromEvent(event);
      void load();
    };
    window.addEventListener("dsh-wb-session-change", onSessionChange);
    window.addEventListener("dsh-wb-workspace-change", load);
    void load();
    const stopWatch = followWorkspaceEvents(load);
    return () => {
      active = false;
      window.removeEventListener("dsh-wb-session-change", onSessionChange);
      window.removeEventListener("dsh-wb-workspace-change", load);
      stopWatch();
    };
  }, []);
  const additions = changes.reduce((total, change) => total + change.additions, 0);
  const deletions = changes.reduce((total, change) => total + change.deletions, 0);
  const hasReview = changes.length > 0;
  const label = state.visible ? t("hidePanel") : t("showPanel");
  return (
    <button
      className={`dsh-wb-toggle${hasReview ? " is-review" : ""}`}
      type="button"
      aria-label={label}
      aria-expanded={state.visible}
      data-open={state.visible ? "true" : "false"}
      title={`${label} · ${t("shortcutHint")}`}
      onClick={() => {
        if (state.visible) {
          store.hide();
          return;
        }
        store.show();
        if (hasReview) window.dispatchEvent(new Event("dsh-wb-review-request"));
      }}
    >
      <WorkbenchStyles />
      <span className="dsh-wb-toggle-label">
        {hasReview ? t("editedFiles", { count: changes.length }) : t("workbench")}
        {hasReview && (additions > 0 || deletions > 0) ? (
          <span className="dsh-wb-toggle-counts">
            {additions > 0 ? <b className="is-add">+{additions}</b> : null}
            {additions > 0 && deletions > 0 ? " " : null}
            {deletions > 0 ? <b className="is-delete">−{deletions}</b> : null}
          </span>
        ) : null}
      </span>
      <Icon name="panel" />
    </button>
  );
}
