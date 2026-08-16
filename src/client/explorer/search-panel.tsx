import {
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type ChangeEvent,
  type KeyboardEvent,
} from "react";
import type { WorkspaceFile } from "../../shared/types.js";
import {
  highlightSegments,
  moveSearchFocus,
  rankSearchHits,
  recentSearchHits,
  type SearchHit,
} from "./search-model.js";
import { FileTypeIcon, Icon } from "../chrome/icons.js";
import { fetchWorkspaceFiles } from "../store.js";
import { treeFileOpenMode } from "./tree-model.js";
import { useWorkbenchServices } from "../workbench/runtime.js";

function formatBytes(size: number): string {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${Math.round(size / 102.4) / 10} KB`;
  return `${Math.round(size / (102.4 * 1024)) / 10} MB`;
}

export function SearchPanel({ onClose }: { onClose: () => void }) {
    const { store, i18n } = useWorkbenchServices();
    const t = i18n.t;
    const fileState = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot);
    const [query, setQuery] = useState("");
    const [results, setResults] = useState<WorkspaceFile[]>([]);
    const [loading, setLoading] = useState(false);
    const [failed, setFailed] = useState(false);
    const [activeIndex, setActiveIndex] = useState(0);
    const inputRef = useRef<HTMLInputElement | null>(null);
    const needle = query.trim();
    const hits: SearchHit[] = needle ? rankSearchHits(results, needle) : recentSearchHits(fileState.open);

    useEffect(() => {
      inputRef.current?.focus();
    }, []);

    useEffect(() => {
      if (!needle) {
        setFailed(false);
        setLoading(false);
        setActiveIndex(0);
        return;
      }
      let cancelled = false;
      const timer = window.setTimeout(() => {
        setLoading(true);
        setFailed(false);
        void fetchWorkspaceFiles(needle).then((files) => {
          if (cancelled) return;
          setResults(files);
          setActiveIndex(0);
        }).catch(() => {
          if (cancelled) return;
          setResults([]);
          setFailed(true);
        }).finally(() => {
          if (!cancelled) setLoading(false);
        });
      }, 100);
      return () => {
        cancelled = true;
        window.clearTimeout(timer);
      };
    }, [needle]);

    const open = (path: string) => {
      onClose();
      void store.open(path, treeFileOpenMode(), undefined, true, "preview");
    };

    const onSearchKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key === "ArrowDown" || event.key === "ArrowUp") {
        event.preventDefault();
        setActiveIndex((current) => moveSearchFocus(hits.length, current, event.key === "ArrowDown" ? 1 : -1));
        return;
      }
      if (event.key === "Enter") {
        const hit = hits[activeIndex] ?? hits[0];
        if (hit) {
          event.preventDefault();
          open(hit.path);
        }
      }
    };

    const renderHit = (hit: SearchHit, index: number) => (
      <button
        key={hit.path}
        id={`dsh-wb-search-hit-${index}`}
        type="button"
        role="option"
        aria-selected={index === activeIndex}
        className={`dsh-wb-search-result${index === activeIndex ? " is-active" : ""}`}
        onMouseEnter={() => setActiveIndex(index)}
        onClick={() => open(hit.path)}
      >
        <FileTypeIcon path={hit.name} />
        <span className="dsh-wb-search-result-copy">
          <span className="dsh-wb-search-result-name">
            {highlightSegments(hit.name, needle).map((segment, segmentIndex) => (
              segment.match
                ? <mark key={segmentIndex} className="dsh-wb-search-mark">{segment.text}</mark>
                : <span key={segmentIndex}>{segment.text}</span>
            ))}
          </span>
          {hit.parent ? <span className="dsh-wb-search-result-parent">{hit.parent}</span> : null}
        </span>
        {needle && hit.size > 0 ? <span className="dsh-wb-search-result-size">{formatBytes(hit.size)}</span> : null}
      </button>
    );

    return (
      <section className="dsh-wb-search" aria-label={t("searchFiles")}>
        <div className="dsh-wb-search-box">
          <Icon name="search" />
          <input
            ref={inputRef}
            value={query}
            type="search"
            aria-label={t("searchFiles")}
            aria-controls="dsh-wb-search-results"
            aria-activedescendant={hits[activeIndex] ? `dsh-wb-search-hit-${activeIndex}` : undefined}
            placeholder={t("searchPlaceholder")}
            onChange={(event: ChangeEvent<HTMLInputElement>) => setQuery(event.target.value)}
            onKeyDown={onSearchKey}
          />
          <button
            type="button"
            className="dsh-wb-search-close"
            aria-label={t("close")}
            onClick={onClose}
          >
            <Icon name="close" />
          </button>
        </div>
        <div id="dsh-wb-search-results" className="dsh-wb-search-results" role="listbox" aria-label={t("searchFiles")}>
          {!needle && hits.length > 0 ? <div className="dsh-wb-search-state">{t("recentFiles")}</div> : null}
          {!needle && hits.length === 0 ? <div className="dsh-wb-search-state">{t("searchTypeHint")}</div> : null}
          {needle && loading && hits.length === 0 ? <div className="dsh-wb-search-state">{t("searching")}</div> : null}
          {needle && !loading && failed ? <div className="dsh-wb-search-state">{t("searchError")}</div> : null}
          {needle && !loading && !failed && hits.length === 0 ? <div className="dsh-wb-search-state">{t("searchNoResults")}</div> : null}
          {hits.map(renderHit)}
        </div>
      </section>
    );
}
