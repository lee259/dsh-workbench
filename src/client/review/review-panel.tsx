import { REVIEW_API_PATH, type ReviewChange } from "../../shared/types.js";
import type { FileStore } from "../store.js";
import { FileTypeIcon } from "../chrome/icons.js";
import { clampTreeWidth } from "../explorer/file-tree.js";
import { MAX_TREE_WIDTH, MIN_TREE_WIDTH } from "../explorer/tree-model.js";
import { useWorkbenchServices } from "../workbench/runtime.js";
import { followWorkspaceEvents } from "../workspace-events.js";
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

type ReviewResponse = { changes?: ReviewChange[]; sessionId?: string | null };

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
          const onMove = (move: PointerEvent) => onResize(window.innerWidth - move.clientX);
          const onUp = () => {
            window.removeEventListener("pointermove", onMove);
            window.removeEventListener("pointerup", onUp);
          };
          window.addEventListener("pointermove", onMove);
          window.addEventListener("pointerup", onUp, { once: true });
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

export function ReviewPanel({ store, sessionId }: { store: FileStore; sessionId?: string }) {
  const { i18n } = useWorkbenchServices();
  const t = i18n.t;
  const [data, setData] = useState<ReviewResponse>({ changes: [] });
  const [loading, setLoading] = useState(Boolean(sessionId));
  const [error, setError] = useState(false);
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
      const response = await fetch(`${REVIEW_API_PATH}?session=${encodeURIComponent(selected)}`);
      if (!response.ok) throw new Error("review request failed");
      const next = await response.json() as ReviewResponse;
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
  useEffect(() => followWorkspaceEvents(() => {
    void load(sessionId || undefined, true);
  }), [load, sessionId]);

  const changes = data.changes ?? [];
  const totalAdditions = changes.reduce((total, change) => total + change.additions, 0);
  const totalDeletions = changes.reduce((total, change) => total + change.deletions, 0);

  const openChange = (change: ReviewChange, kind: "preview" | "keep") => {
    void store.open(change.path, "diff", undefined, false, kind);
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
          return (
            <button
              className={`dsh-wb-review-item${change.path === state.active ? " is-active" : ""}`}
              type="button"
              key={`${change.sessionId}:${change.path}`}
              title={change.path}
              onClick={() => openChange(change, "preview")}
              onDoubleClick={() => openChange(change, "keep")}
            >
              <FileTypeIcon path={change.path} />
              <span className="dsh-wb-review-path">{fileName(change.path)}</span>
              {parent ? <span className="dsh-wb-review-parent">{parent}</span> : null}
              <ReviewCounts additions={change.additions} deletions={change.deletions} />
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <section className="dsh-wb-review">
      <div className="dsh-wb-tree-head">
        <div className="dsh-wb-review-meta">
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
      {body}
    </section>
  );
}
