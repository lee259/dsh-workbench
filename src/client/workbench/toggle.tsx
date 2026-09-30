import { Icon } from "../chrome/icons.js";
import { useWorkbenchServices } from "./runtime.js";
import { useEffect, useState, useSyncExternalStore } from "react";
import type { GitFileDiff } from "../../shared/types.js";
import { reviewDiffCounts } from "../../shared/review-diff.js";
import { fetchReview } from "../review/review-data.js";
import { followWorkspaceEvents } from "../workspace-events.js";
import { lastWorkbenchSession, sessionIdFromEvent } from "../workspace-identity.js";
import { WorkbenchTooltip } from "../chrome/tooltip.js";

export function WorkbenchToggle({ reviewOnly = false }: { reviewOnly?: boolean }) {
  const { store, i18n, navigation } = useWorkbenchServices();
  const state = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot);
  const t = i18n.t;
  const [files, setFiles] = useState<GitFileDiff[]>([]);
  useEffect(() => {
    let active = true;
    let requestId = 0;
    let sessionId = lastWorkbenchSession();
    const load = async () => {
      const id = ++requestId;
      if (!sessionId) {
        if (active) setFiles([]);
        return;
      }
      try {
        const payload = await fetchReview(sessionId);
        if (active && id === requestId) {
          setFiles(payload.files ?? []);
        }
      } catch {
        if (active && id === requestId) setFiles([]);
      }
    };
    const onSessionChange = (event: Event) => {
      sessionId = sessionIdFromEvent(event);
      void load();
    };
    window.addEventListener("dsh-wb-session-change", onSessionChange);
    window.addEventListener("dsh-wb-workspace-change", load);
    void load();
    const stopWatch = followWorkspaceEvents(load, undefined, load);
    return () => {
      active = false;
      window.removeEventListener("dsh-wb-session-change", onSessionChange);
      window.removeEventListener("dsh-wb-workspace-change", load);
      stopWatch();
    };
  }, []);
  const { additions, deletions } = reviewDiffCounts(files);
  const hasReview = files.length > 0;
  const label = reviewOnly ? t("reviewTitle") : state.visible ? t("hidePanel") : t("showPanel");
  return (
    <WorkbenchTooltip label={label}>
    <button
      className={`dsh-wb-toggle${hasReview ? " is-review" : ""}`}
      type="button"
      aria-label={label}
      aria-expanded={reviewOnly ? undefined : state.visible}
      data-open={state.visible ? "true" : "false"}
      onClick={() => {
        if (navigation.openReview()) return;
        if (state.visible) {
          store.hide();
          return;
        }
        store.show();
      }}
    >
      <span className="dsh-wb-toggle-label">
        {reviewOnly ? t("reviewTitle") : hasReview ? t("editedFiles", { count: files.length }) : t("workbench")}
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
    </WorkbenchTooltip>
  );
}
