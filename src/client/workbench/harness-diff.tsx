import { Fragment, useEffect, useRef, useState, type ReactNode } from "react";
import type { HarnessReviewDiff } from "../review/review-data.js";

type ReviewDiffMessage = "reviewDiffEmpty" | "reviewDiffError" | "reviewBinary" | "reviewOversized" | "showUnmodifiedLines";
type DiffRow = { oldNo: string; newNo: string; oldText: string; newText: string; oldKind: string; newKind: string };
type DisplayRow = { kind: "line"; row: DiffRow; index: number } | { kind: "fold"; id: string; rows: DiffRow[] };
type HunkRows = { key: string; head: string; rows: DisplayRow[] };
const VISIBLE_CONTEXT_LINES = 3;
const MIN_COLLAPSED_CONTEXT_LINES = 6;

function UnifiedDiffLine({ row }: { row: DiffRow }) {
  if (row.oldKind === "context" && row.newKind === "context") return <div className="dsh-wb-code-review-unified-line"><span className="dsh-wb-code-review-line-number">{row.oldNo}</span><span className="dsh-wb-code-review-line-marker"> </span><code>{row.oldText}</code></div>;
  return <>
    {row.oldKind === "delete" ? <div className="dsh-wb-code-review-unified-line is-delete"><span className="dsh-wb-code-review-line-number">{row.oldNo}</span><span className="dsh-wb-code-review-line-marker">−</span><code>{row.oldText}</code></div> : null}
    {row.newKind === "add" ? <div className="dsh-wb-code-review-unified-line is-add"><span className="dsh-wb-code-review-line-number">{row.newNo}</span><span className="dsh-wb-code-review-line-marker">+</span><code>{row.newText}</code></div> : null}
  </>;
}

function SplitDiffLine({ row, side }: { row: DiffRow; side: "old" | "new" }) {
  const isOld = side === "old";
  return <div className="dsh-wb-code-review-line">
    <div className={`dsh-wb-code-review-side is-${isOld ? row.oldKind : row.newKind}`}>
      <span className="dsh-wb-code-review-line-number">{isOld ? row.oldNo : row.newNo}</span>
      <code>{isOld ? row.oldText : row.newText}</code>
    </div>
  </div>;
}

function makeRows(diff: Extract<HarnessReviewDiff, { kind: "text" }>): HunkRows[] {
  return diff.hunks.map((hunk, index) => {
    let oldLine = hunk.oldStart;
    let newLine = hunk.newStart;
    const rows: DiffRow[] = [];
    let removed: Array<{ number: number; text: string }> = [];
    let added: Array<{ number: number; text: string }> = [];
    const flushChanges = () => {
      const length = Math.max(removed.length, added.length);
      for (let rowIndex = 0; rowIndex < length; rowIndex += 1) {
        const before = removed[rowIndex];
        const after = added[rowIndex];
        rows.push({ oldNo: before ? String(before.number) : "", newNo: after ? String(after.number) : "", oldText: before?.text ?? "", newText: after?.text ?? "", oldKind: before ? "delete" : "context", newKind: after ? "add" : "context" });
      }
      removed = [];
      added = [];
    };
    for (const line of hunk.lines) {
      const marker = line[0] ?? " ";
      if (marker === "-") removed.push({ number: oldLine++, text: line.slice(1) });
      else if (marker === "+") added.push({ number: newLine++, text: line.slice(1) });
      else if (marker === "\\") continue;
      else {
        flushChanges();
        rows.push({ oldNo: String(oldLine++), newNo: String(newLine++), oldText: line.slice(1), newText: line.slice(1), oldKind: "context", newKind: "context" });
      }
    }
    flushChanges();

    const visibleRows: DisplayRow[] = [];
    let rowIndex = 0;
    while (rowIndex < rows.length) {
      const row = rows[rowIndex];
      if (row.oldKind !== "context" || row.newKind !== "context") {
        visibleRows.push({ kind: "line", row, index: rowIndex++ });
        continue;
      }
      let runEnd = rowIndex + 1;
      while (runEnd < rows.length && rows[runEnd].oldKind === "context" && rows[runEnd].newKind === "context") runEnd += 1;
      const foldStart = rowIndex + VISIBLE_CONTEXT_LINES;
      const foldEnd = runEnd - VISIBLE_CONTEXT_LINES;
      const foldedCount = foldEnd - foldStart;
      if (foldedCount < MIN_COLLAPSED_CONTEXT_LINES) {
        for (; rowIndex < runEnd; rowIndex += 1) visibleRows.push({ kind: "line", row: rows[rowIndex], index: rowIndex });
        continue;
      }
      const id = `${hunk.oldStart}:${hunk.newStart}:${rows[rowIndex].oldNo}-${rows[runEnd - 1].oldNo}`;
      for (; rowIndex < foldStart; rowIndex += 1) visibleRows.push({ kind: "line", row: rows[rowIndex], index: rowIndex });
      visibleRows.push({ kind: "fold", id, rows: rows.slice(foldStart, foldEnd) });
      rowIndex = foldEnd;
      for (; rowIndex < runEnd; rowIndex += 1) visibleRows.push({ kind: "line", row: rows[rowIndex], index: rowIndex });
    }
    return { key: `${hunk.oldStart}:${hunk.newStart}:${index}`, head: `@@ -${hunk.oldStart},${hunk.oldLines} +${hunk.newStart},${hunk.newLines} @@`, rows: visibleRows };
  });
}

export function HarnessReviewDiffContent({ diff, error, t, diffView = "split" }: { diff: HarnessReviewDiff | null; error: boolean; t: (key: ReviewDiffMessage) => string; diffView?: "unified" | "split" }) {
  const [expandedContext, setExpandedContext] = useState<Set<string>>(() => new Set());
  const oldPaneRef = useRef<HTMLDivElement>(null);
  const newPaneRef = useRef<HTMLDivElement>(null);
  const syncHorizontalScroll = (source: HTMLDivElement, target: HTMLDivElement | null) => {
    if (target && target.scrollLeft !== source.scrollLeft) target.scrollLeft = source.scrollLeft;
  };
  const hunks = diff?.kind === "text" ? diff.hunks : undefined;
  const changeMarkers = hunks?.flatMap((hunk) => hunk.lines.map((line) => line[0] ?? " ")) ?? [];
  const hasAdditions = changeMarkers.includes("+");
  const hasDeletions = changeMarkers.includes("-");
  const singleSide: "old" | "new" | undefined = hasAdditions && !hasDeletions ? "new" : hasDeletions && !hasAdditions ? "old" : undefined;
  const hunkRows = diff?.kind === "text" ? makeRows(diff) : [];
  useEffect(() => setExpandedContext(new Set()), [diff?.path, hunks]);
  if (error) return <div className="dsh-wb-code-review-empty">{t("reviewDiffError")}</div>;
  if (!diff) return <div className="dsh-wb-code-review-empty">{t("reviewDiffEmpty")}</div>;
  if (diff.kind === "binary") return <div className="dsh-wb-code-review-empty">{t("reviewBinary")}</div>;
  if (diff.kind === "oversized") return <div className="dsh-wb-code-review-empty">{t("reviewOversized")}</div>;
  if (!diff.hunks.length) return <div className="dsh-wb-code-review-empty">{t("reviewDiffEmpty")}</div>;

  const renderRows = (rows: DisplayRow[], side?: "old" | "new"): ReactNode[] => rows.map((item) => {
    if (item.kind === "fold") {
      if (!expandedContext.has(item.id)) return <button className="dsh-wb-button dsh-wb-code-review-context-toggle" type="button" key={`context:${item.id}`} aria-expanded={false} onClick={() => setExpandedContext((current) => new Set(current).add(item.id))}>{t("showUnmodifiedLines").replace("{count}", String(item.rows.length))}</button>;
      return <Fragment key={`context-expanded:${item.id}`}>{item.rows.map((row, index) => side ? <SplitDiffLine key={index} row={row} side={side} /> : <UnifiedDiffLine key={index} row={row} />)}</Fragment>;
    }
    return side ? <SplitDiffLine key={`line:${item.index}`} row={item.row} side={side} /> : <UnifiedDiffLine key={`line:${item.index}`} row={item.row} />;
  });

  if (diffView === "unified") return <div className="dsh-wb-code-review-hunks is-unified">
    <div className="dsh-wb-code-review-horizontal-pane">
      {hunkRows.map((hunk) => <section className="dsh-wb-code-review-hunk" key={hunk.key}>
        <div className="dsh-wb-code-review-hunk-head">{hunk.head}</div>
        <div className="dsh-wb-code-review-unified">{renderRows(hunk.rows)}</div>
      </section>)}
    </div>
  </div>;

  if (singleSide) return <div className="dsh-wb-code-review-hunks is-single-pane">
    <div className="dsh-wb-code-review-horizontal-pane" ref={oldPaneRef}>
      {hunkRows.map((hunk) => <section className="dsh-wb-code-review-hunk" key={hunk.key}>
        <div className="dsh-wb-code-review-hunk-head">{hunk.head}</div>
        <div className="dsh-wb-code-review-pane-content">{renderRows(hunk.rows, singleSide)}</div>
      </section>)}
    </div>
  </div>;

  return <div className="dsh-wb-code-review-hunks is-split">
    {(["old", "new"] as const).map((side) => <div className="dsh-wb-code-review-horizontal-pane" key={side} ref={side === "old" ? oldPaneRef : newPaneRef} onScroll={(event) => syncHorizontalScroll(event.currentTarget, side === "old" ? newPaneRef.current : oldPaneRef.current)}>
      {hunkRows.map((hunk) => <section className="dsh-wb-code-review-hunk" key={hunk.key}>
        <div className="dsh-wb-code-review-hunk-head">{hunk.head}</div>
        <div className="dsh-wb-code-review-pane-content">{renderRows(hunk.rows, side)}</div>
      </section>)}
    </div>)}
  </div>;
}
