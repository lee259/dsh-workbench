import {
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type ChangeEvent,
  type KeyboardEvent,
} from "react";
import type { ContentSearchHit, WorkspaceFile } from "../../shared/types.js";
import {
  highlightSegments,
  moveSearchFocus,
  rankSearchHits,
  recentSearchHits,
  type SearchHit,
} from "./search-model.js";
import { FileTypeIcon, Icon } from "../chrome/icons.js";
import { fetchWorkspaceFiles, searchWorkspaceContent } from "../store.js";
import { treeFileOpenMode } from "./tree-model.js";
import { useWorkbenchServices } from "../workbench/runtime.js";
import { WorkbenchTooltip } from "../chrome/tooltip.js";

function formatBytes(size: number): string {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${Math.round(size / 102.4) / 10} KB`;
  return `${Math.round(size / (102.4 * 1024)) / 10} MB`;
}

export function SearchPanel({ onClose, mode = "files" }: { onClose: () => void; mode?: "files" | "content" }) {
    const { store, i18n } = useWorkbenchServices();
    const t = i18n.t;
    const fileState = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot);
    const [query, setQuery] = useState("");
    const [results, setResults] = useState<WorkspaceFile[]>([]);
    const [contentResults, setContentResults] = useState<ContentSearchHit[]>([]);
    const [loading, setLoading] = useState(false);
    const [failed, setFailed] = useState(false);
    const [activeIndex, setActiveIndex] = useState(0);
    const inputRef = useRef<HTMLInputElement | null>(null);
    const needle = query.trim();
    const hits: SearchHit[] = mode === "files" ? (needle ? rankSearchHits(results, needle) : recentSearchHits(fileState.open)) : [];

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
        const request = mode === "content" ? searchWorkspaceContent(needle) : fetchWorkspaceFiles(needle);
        void request.then((next) => {
          if (cancelled) return;
          if (mode === "content") setContentResults(next as ContentSearchHit[]);
          else setResults(next as WorkspaceFile[]);
          setActiveIndex(0);
        }).catch(() => {
          if (cancelled) return;
          setResults([]);
          setContentResults([]);
          setFailed(true);
        }).finally(() => {
          if (!cancelled) setLoading(false);
        });
      }, 100);
      return () => {
        cancelled = true;
        window.clearTimeout(timer);
      };
    }, [needle, mode]);

    const open = (path: string) => {
      onClose();
      void store.open(path, treeFileOpenMode(), undefined, true, "preview");
    };

    const openContent = (hit: ContentSearchHit) => {
      onClose();
      void store.open(hit.path, "view", hit.line, true, "preview");
    };

    const onSearchKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key === "ArrowDown" || event.key === "ArrowUp") {
        event.preventDefault();
        const count = mode === "content" ? contentResults.length : hits.length;
        setActiveIndex((current) => moveSearchFocus(count, current, event.key === "ArrowDown" ? 1 : -1));
        return;
      }
      if (event.key === "Enter") {
        if (mode === "content") {
          const hit = contentResults[activeIndex];
          if (hit) {
            event.preventDefault();
            openContent(hit);
          }
          return;
        }
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

    const renderContentHit = (hit: ContentSearchHit, index: number) => (
      <button key={`${hit.path}:${hit.line}`} type="button" className={`dsh-wb-search-result${index === activeIndex ? " is-active" : ""}`} onMouseEnter={() => setActiveIndex(index)} onClick={() => openContent(hit)}>
        <span className="dsh-wb-search-result-glyph">{hit.line}</span>
        <span className="dsh-wb-search-result-copy">
          <span className="dsh-wb-search-result-name">{hit.path}</span>
          <span className="dsh-wb-search-result-parent">{hit.text || " "}</span>
        </span>
      </button>
    );

    return (
        <section className="dsh-wb-search" aria-label={t(mode === "content" ? "searchContent" : "searchFiles")}>
        <div className="dsh-wb-search-box">
          <Icon name="search" />
          <input
            ref={inputRef}
            value={query}
            type="search"
            aria-label={t(mode === "content" ? "searchContent" : "searchFiles")}
            aria-controls="dsh-wb-search-results"
            aria-activedescendant={hits[activeIndex] ? `dsh-wb-search-hit-${activeIndex}` : undefined}
            placeholder={t(mode === "content" ? "contentSearchPlaceholder" : "searchPlaceholder")}
            onChange={(event: ChangeEvent<HTMLInputElement>) => setQuery(event.target.value)}
            onKeyDown={onSearchKey}
          />
          <WorkbenchTooltip label={t("close")}>
          <button
            type="button"
            className="dsh-wb-search-close"
            aria-label={t("close")}
            onClick={onClose}
          >
            <Icon name="close" />
          </button>
          </WorkbenchTooltip>
        </div>
        <div id="dsh-wb-search-results" className="dsh-wb-search-results" role="listbox" aria-label={t(mode === "content" ? "searchContent" : "searchFiles")}>
          {!needle && hits.length > 0 ? <div className="dsh-wb-search-state">{t("recentFiles")}</div> : null}
          {!needle && hits.length === 0 ? <div className="dsh-wb-search-state">{t(mode === "content" ? "contentSearchHint" : "searchTypeHint")}</div> : null}
          {needle && loading && (mode === "content" ? contentResults.length : hits.length) === 0 ? <div className="dsh-wb-search-state">{t("searching")}</div> : null}
          {needle && !loading && failed ? <div className="dsh-wb-search-state">{t("searchError")}</div> : null}
          {needle && !loading && !failed && (mode === "content" ? contentResults.length : hits.length) === 0 ? <div className="dsh-wb-search-state">{t("searchNoResults")}</div> : null}
          {mode === "content" ? contentResults.map(renderContentHit) : hits.map(renderHit)}
        </div>
      </section>
    );
}
