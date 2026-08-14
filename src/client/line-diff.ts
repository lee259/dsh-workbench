export type LineKind = "same" | "add" | "remove";

export type DiffRow = {
  text: string;
  line: number;
  kind: LineKind;
};

const MAX_LCS_CELLS = 800_000;

export function previewLines(content: string): DiffRow[] {
  return content.split("\n").map((text, index) => ({
    text,
    line: index + 1,
    kind: "same",
  }));
}

export function diffLines(before: string, after: string): DiffRow[] {
  const previous = before.split("\n");
  const current = after.split("\n");
  if (previous.length * current.length > MAX_LCS_CELLS) {
    return greedyDiff(previous, current);
  }
  return lcsDiff(previous, current);
}

function lcsDiff(previous: string[], current: string[]): DiffRow[] {
  const rows: number[][] = Array.from({ length: previous.length + 1 }, () => {
    return new Array<number>(current.length + 1).fill(0);
  });

  for (let i = previous.length - 1; i >= 0; i -= 1) {
    for (let j = current.length - 1; j >= 0; j -= 1) {
      rows[i][j] = previous[i] === current[j]
        ? rows[i + 1][j + 1] + 1
        : Math.max(rows[i + 1][j], rows[i][j + 1]);
    }
  }

  return walk(previous, current, (i, j) => {
    if (i < previous.length && j < current.length && previous[i] === current[j]) return "same";
    if (i < previous.length && (j === current.length || rows[i + 1][j] >= rows[i][j + 1])) return "remove";
    return "add";
  });
}

function greedyDiff(previous: string[], current: string[]): DiffRow[] {
  const nextHits = new Map<string, number[]>();
  current.forEach((line, index) => {
    const hits = nextHits.get(line) ?? [];
    hits.push(index);
    nextHits.set(line, hits);
  });

  return walk(previous, current, (i, j) => {
    if (i < previous.length && j < current.length && previous[i] === current[j]) return "same";
    const hit = (nextHits.get(previous[i] ?? "") ?? []).find((index) => index >= j);
    return hit == null ? "remove" : "add";
  });
}

function walk(
  previous: string[],
  current: string[],
  decide: (i: number, j: number) => LineKind,
): DiffRow[] {
  const rows: DiffRow[] = [];
  let i = 0;
  let j = 0;
  let oldLine = 1;
  let newLine = 1;

  while (i < previous.length || j < current.length) {
    const kind = i === previous.length ? "add" : j === current.length ? "remove" : decide(i, j);
    if (kind === "same") {
      rows.push({ text: current[j] ?? "", line: newLine, kind });
      i += 1;
      j += 1;
      oldLine += 1;
      newLine += 1;
    } else if (kind === "remove") {
      rows.push({ text: previous[i] ?? "", line: oldLine, kind });
      i += 1;
      oldLine += 1;
    } else {
      rows.push({ text: current[j] ?? "", line: newLine, kind });
      j += 1;
      newLine += 1;
    }
  }

  return rows;
}
