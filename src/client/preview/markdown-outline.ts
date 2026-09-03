export type MarkdownOutlineItem = {
  level: number;
  label: string;
};

const HEADING = /^(#{1,6})\s+(.+?)\s*#*\s*$/;

function plainLabel(source: string): string {
  return source
    .replace(/!?(?:\[([^\]]*)\]\([^)]*\))/g, "$1")
    .replace(/[`*_~]/g, "")
    .replace(/<[^>]*>/g, "")
    .trim();
}

/** Extract the Markdown headings used by the preview outline. */
export function markdownOutline(source: string): MarkdownOutlineItem[] {
  let fenced = false;
  return source.split("\n").flatMap((line) => {
    if (/^\s*```/.test(line)) {
      fenced = !fenced;
      return [];
    }
    if (fenced) return [];
    const match = HEADING.exec(line);
    if (!match) return [];
    const label = plainLabel(match[2] ?? "");
    return label ? [{ level: match[1].length, label }] : [];
  });
}

export function hasMarkdownOutline(items: readonly MarkdownOutlineItem[]): boolean {
  return items.length >= 3;
}
