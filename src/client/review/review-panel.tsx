import type { ReviewChange } from "../../shared/types.js";
import type { FileStore } from "../store.js";
import { FileTypeIcon } from "../chrome/icons.js";
import { clampTreeWidth } from "../explorer/file-tree.js";
import { startResizeDrag } from "../chrome/resize-drag.js";
import { MAX_TREE_WIDTH, MIN_TREE_WIDTH } from "../explorer/tree-model.js";
import { useWorkbenchServices } from "../workbench/runtime.js";
import { followWorkspaceEvents } from "../workspace-events.js";
import { acknowledgeReview, discardReview, fetchReview, type ReviewActionErrorCode } from "./review-data.js";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type KeyboardEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react";

type ReviewResponse = Awaited<ReturnType<typeof fetchReview>>;

function fileName(path: string): string {
  return path.split("/").pop() || path;
}

function fileParent(path: string): string {
  const index = path.lastIndexOf("/");
  return index > 0 ? path.slice(0, index) : "";
}

function ReviewCounts({ additions, deletions }: { additions: number; deletions: number }) {
  return (
    <>
      {additions > 0 ? <span className="dsh-wb-review-count is-add">+{additions}</span> : null}
      {deletions > 0 ? <span className="dsh-wb-review-count is-delete">−{deletions}</span> : null}
    </>
  );
}

export function ReviewRail({
  store,
  sessionId,
  width,
  onResize,
}: {
  store: FileStore;
  sessionId?: string;
  width: number;
  onResize: (width: number) => void;
}) {
  const { i18n } = useWorkbenchServices();
  const t = i18n.t;
  return (
    <>
      <div
        className="dsh-wb-tree-resize"
        role="separator"
        aria-label={t("resizeTree")}
        aria-orientation="vertical"
        aria-valuemin={MIN_TREE_WIDTH}
        aria-valuemax={MAX_TREE_WIDTH}
        aria-valuenow={width}
        tabIndex={0}
        onPointerDown={(event: ReactPointerEvent) => {
          event.preventDefault();
          startResizeDrag(event.currentTarget, event.pointerId, (move) => {
            onResize(window.innerWidth - move.clientX);
          });
        }}
        onKeyDown={(event: KeyboardEvent) => {
          if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
          event.preventDefault();
          onResize(clampTreeWidth(width + (event.key === "ArrowLeft" ? 16 : -16)));
        }}
      />
      <aside className="dsh-wb-review-shell" style={{ width }} aria-label={t("reviewTitle")}>
        <ReviewPanel store={store} sessionId={sessionId} />
      </aside>
    </>
  );
}

export function ReviewPanel({
  store,
  sessionId,
  onOpenChange,
  showSummary = true,
}: {
  store: FileStore;
  sessionId?: string;
  onOpenChange?: (path: string) => boolean;
  showSummary?: boolean;
}) {
  const { i18n } = useWorkbenchServices();
  const t = i18n.t;
  const [data, setData] = useState<ReviewResponse>({ changes: [] });
  const [loading, setLoading] = useState(Boolean(sessionId));
  const [error, setError] = useState(false);
  const [acknowledgingPath, setAcknowledgingPath] = useState("");
  const [discardingPath, setDiscardingPath] = useState("");
  const [actionError, setActionError] = useState<ReviewActionErrorCode | "">("");
  const state = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot);
  const requestId = useRef(0);

  const load = useCallback(async (selected?: string, silent = false) => {
    const id = ++requestId.current;
    if (!selected) {
      setData({ changes: [] });
      setLoading(false);
      setError(false);
      return;
    }
    if (!silent) {
      setLoading(true);
      setError(false);
    }
    try {
      const next = await fetchReview(selected);
      if (id !== requestId.current) return;
      setData(next);
    } catch {
      if (id !== requestId.current) return;
      if (!silent) setError(true);
    } finally {
      if (id === requestId.current && !silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load(sessionId || undefined);
  }, [load, sessionId]);
  useEffect(() => followWorkspaceEvents(
    () => { void load(sessionId || undefined, true); },
    undefined,
    () => { void load(sessionId || undefined, true); },
  ), [load, sessionId]);

  const changes = data.changes ?? [];
  const totalAdditions = changes.reduce((total, change) => total + change.additions, 0);
  const totalDeletions = changes.reduce((total, change) => total + change.deletions, 0);

  const openChange = (change: ReviewChange, kind: "preview" | "keep") => {
    if (onOpenChange?.(change.path)) return;
    void store.open(change.path, "diff", undefined, false, kind);
  };

  const acknowledge = async (change: ReviewChange) => {
    if (!sessionId || acknowledgingPath || discardingPath) return;
    setActionError("");
    setAcknowledgingPath(change.path);
    try {
      await acknowledgeReview(sessionId, change.path);
      await load(sessionId, true);
    } catch {
      setError(true);
    } finally {
      setAcknowledgingPath("");
    }
  };

  const discard = async (change: ReviewChange) => {
    if (!sessionId || acknowledgingPath || discardingPath) return;
    setActionError("");
    setDiscardingPath(change.path);
    try {
      await discardReview(sessionId, change.path);
      await load(sessionId, true);
    } catch (error) {
      const code = error && typeof error === "object" && "code" in error ? error.code : "file_not_found";
      setActionError(code === "file_changed" || code === "review_not_discardable" || code === "file_not_found" ? code : "file_not_found");
    } finally {
      setDiscardingPath("");
    }
  };

  let body: ReactNode;
  if (loading && changes.length === 0) {
    body = <div className="dsh-wb-review-empty">{t("reading")}</div>;
  } else if (error && changes.length === 0) {
    body = <div className="dsh-wb-review-empty">{t("reviewError")}</div>;
  } else if (changes.length === 0) {
    body = (
      <div className="dsh-wb-review-empty">
        <strong>{t("reviewEmpty")}</strong>
        <span>{t("reviewEmptyHint")}</span>
      </div>
    );
  } else {
    body = (
      <div className="dsh-wb-review-list">
        {changes.map((change) => {
          const parent = fileParent(change.path);
          const file = data.files?.find((item) => item.path === change.path);
          const canDiscard = file?.before !== null && file !== undefined;
          return (
            <div className="dsh-wb-review-row" key={`${change.sessionId}:${change.path}`}>
              <button
                className={`dsh-wb-review-item${change.path === state.active ? " is-active" : ""}`}
                type="button"
                onClick={() => openChange(change, "preview")}
                onDoubleClick={() => openChange(change, "keep")}
              >
                <FileTypeIcon path={change.path} />
                <span className="dsh-wb-review-copy">
                  <span className="dsh-wb-review-name">
                    <span className="dsh-wb-review-path">{fileName(change.path)}</span>
                    {parent ? <span className="dsh-wb-review-parent">{parent}</span> : null}
                  </span>
                  <span className="dsh-wb-review-summary">{change.summary}</span>
                </span>
                <ReviewCounts additions={change.additions} deletions={change.deletions} />
              </button>
              <button
                className="dsh-wb-review-ack"
                type="button"
                aria-label={t("markReviewed")}
                title={t("markReviewed")}
                disabled={Boolean(acknowledgingPath || discardingPath)}
                onClick={() => void acknowledge(change)}
              >
                {acknowledgingPath === change.path ? "…" : "✓"}
              </button>
              {canDiscard ? (
                <button
                  className="dsh-wb-review-discard"
                  type="button"
                  aria-label={t("discardReview")}
                  title={t("discardReview")}
                  disabled={Boolean(acknowledgingPath || discardingPath)}
                  onClick={() => void discard(change)}
                >
                  {discardingPath === change.path ? "…" : "×"}
                </button>
              ) : null}
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <section className="dsh-wb-review">
      {showSummary ? (
        <div className="dsh-wb-tree-head">
          <div className="dsh-wb-review-meta">
            {actionError === "file_changed" ? t("reviewConflict") : null}
            {actionError === "review_not_discardable" ? t("reviewNotDiscardable") : null}
            {actionError === "file_not_found" ? t("reviewError") : null}
            {changes.length > 0 ? (
              <>
                {changes.length} {t("reviewFiles")}
                {totalAdditions > 0 ? <> · <b className="is-add">+{totalAdditions}</b></> : null}
                {totalDeletions > 0 ? (
                  <>
                    {totalAdditions > 0 ? " " : " · "}
                    <b className="is-delete">−{totalDeletions}</b>
                  </>
                ) : null}
              </>
            ) : null}
          </div>
        </div>
      ) : null}
      {body}
    </section>
  );
}
