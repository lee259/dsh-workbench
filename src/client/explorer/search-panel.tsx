import type { LocaleStore } from "../../shared/i18n.js";
import type { WorkspaceFile } from "../../shared/types.js";
import {
  highlightSegments,
  moveSearchFocus,
  rankSearchHits,
  recentSearchHits,
  type SearchHit,
} from "./search-model.js";
import { FileTypeIcon, Icon } from "../chrome/icons.js";
import { fetchWorkspaceFiles, type FileStore } from "../store.js";
import { treeFileOpenMode } from "./tree-model.js";

type ReactNs = typeof import("react");

function formatBytes(size: number): string {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${Math.round(size / 102.4) / 10} KB`;
  return `${Math.round(size / (102.4 * 1024)) / 10} MB`;
}

export function createSearchPanel(React: ReactNs, store: FileStore, i18n: LocaleStore) {
  const h = React.createElement;
  function SearchPanel({ onClose }: { onClose: () => void }) {
    const t = i18n.t;
    React.useSyncExternalStore(i18n.subscribe, i18n.getSnapshot, i18n.getSnapshot);
    const fileState = React.useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot);
    const [query, setQuery] = React.useState("");
    const [results, setResults] = React.useState<WorkspaceFile[]>([]);
    const [loading, setLoading] = React.useState(false);
    const [failed, setFailed] = React.useState(false);
    const [activeIndex, setActiveIndex] = React.useState(0);
    const inputRef = React.useRef<HTMLInputElement | null>(null);
    const needle = query.trim();
    const hits: SearchHit[] = needle ? rankSearchHits(results, needle) : recentSearchHits(fileState.open);

    React.useEffect(() => {
      inputRef.current?.focus();
    }, []);

    React.useEffect(() => {
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

    const onSearchKey = (event: React.KeyboardEvent) => {
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

    const renderHit = (hit: SearchHit, index: number) => h("button", {
      key: hit.path,
      id: `dsh-wb-search-hit-${index}`,
      type: "button",
      role: "option",
      "aria-selected": index === activeIndex,
      className: `dsh-wb-search-result${index === activeIndex ? " is-active" : ""}`,
      onMouseEnter: () => setActiveIndex(index),
      onClick: () => open(hit.path),
    },
      h(FileTypeIcon, { path: hit.name }),
      h("span", { className: "dsh-wb-search-result-copy" },
        h("span", { className: "dsh-wb-search-result-name" }, highlightSegments(hit.name, needle).map((segment, segmentIndex) => (
          segment.match
            ? h("mark", { key: segmentIndex, className: "dsh-wb-search-mark" }, segment.text)
            : h("span", { key: segmentIndex }, segment.text)
        ))),
        hit.parent ? h("span", { className: "dsh-wb-search-result-parent" }, hit.parent) : null,
      ),
      needle && hit.size > 0 ? h("span", { className: "dsh-wb-search-result-size" }, formatBytes(hit.size)) : null,
    );

    return h("section", { className: "dsh-wb-search", "aria-label": t("searchFiles") },
      h("div", { className: "dsh-wb-search-box" },
        h(Icon, { name: "search" }),
        h("input", {
          ref: inputRef,
          value: query,
          type: "search",
          "aria-label": t("searchFiles"),
          "aria-controls": "dsh-wb-search-results",
          "aria-activedescendant": hits[activeIndex] ? `dsh-wb-search-hit-${activeIndex}` : undefined,
          placeholder: t("searchPlaceholder"),
          onChange: (event: React.ChangeEvent<HTMLInputElement>) => setQuery(event.target.value),
          onKeyDown: onSearchKey,
        }),
        h("button", { type: "button", className: "dsh-wb-search-close", "aria-label": t("close"), onClick: onClose }, h(Icon, { name: "close" })),
      ),
      h("div", { id: "dsh-wb-search-results", className: "dsh-wb-search-results", role: "listbox", "aria-label": t("searchFiles") },
        !needle && hits.length > 0 ? h("div", { className: "dsh-wb-search-state" }, t("recentFiles")) : null,
        !needle && hits.length === 0 ? h("div", { className: "dsh-wb-search-state" }, t("searchTypeHint")) : null,
        needle && loading && hits.length === 0 ? h("div", { className: "dsh-wb-search-state" }, t("searching")) : null,
        needle && !loading && failed ? h("div", { className: "dsh-wb-search-state" }, t("searchError")) : null,
        needle && !loading && !failed && hits.length === 0 ? h("div", { className: "dsh-wb-search-state" }, t("searchNoResults")) : null,
        hits.map(renderHit),
      ),
    );
  }
  return SearchPanel;
}
