export type TabOpenKind = "preview" | "keep";

export function nextOpenTabs(
  open: readonly string[],
  preview: string,
  path: string,
  kind: TabOpenKind,
): { open: string[]; preview: string } {
  if (!path) return { open: [...open], preview };
  if (kind === "keep") {
    const next = open.includes(path) ? [...open] : [...open, path];
    return { open: next, preview: preview === path ? "" : preview };
  }
  if (open.includes(path) && preview !== path) {
    return { open: [...open], preview };
  }
  const withoutPreview = preview && preview !== path ? open.filter((item) => item !== preview) : [...open];
  const next = withoutPreview.includes(path) ? withoutPreview : [...withoutPreview, path];
  return { open: next, preview: path };
}
