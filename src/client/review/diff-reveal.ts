type RectTop = { top: number };

export function scrollTopForDiffTarget(panel: RectTop, target: RectTop, currentScrollTop: number): number {
  return currentScrollTop + target.top - panel.top;
}
