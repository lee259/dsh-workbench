export const SELECTION_REFERENCE_LIMIT = 500;

export type SelectionLineRange = {
  start: number;
  end: number;
};

function clamp(value: number, maximum: number): number {
  return Math.max(0, Math.min(value, maximum));
}

function lineAt(source: string, offset: number): number {
  let line = 1;
  for (let index = 0; index < offset; index += 1) {
    if (source[index] === "\n") line += 1;
  }
  return line;
}

function fenceFor(selected: string): string {
  const runs = selected.match(/`+/g) ?? [];
  const longest = runs.reduce((maximum, run) => Math.max(maximum, run.length), 2);
  return "`".repeat(longest + 1);
}

export function selectionLineRange(source: string, from: number, to: number): SelectionLineRange | null {
  const start = clamp(from, source.length);
  const end = clamp(to, source.length);
  if (start >= end) return null;
  return {
    start: lineAt(source, start),
    end: lineAt(source, end - 1),
  };
}

export function buildSelectionReference(path: string, source: string, from: number, to: number): string | null {
  const start = clamp(from, source.length);
  const end = clamp(to, source.length);
  const lines = selectionLineRange(source, start, end);
  if (!path || !lines) return null;
  const selected = source.slice(start, end);
  const suffix = lines.start === lines.end ? String(lines.start) : `${lines.start}-${lines.end}`;
  const reference = `@${path}:${suffix}`;
  if (selected.length > SELECTION_REFERENCE_LIMIT) return reference;
  const fence = fenceFor(selected);
  return `${reference}\n${fence}\n${selected}\n${fence}`;
}
