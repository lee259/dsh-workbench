export type DeferredDiffState = {
  mounted: boolean;
  height: number;
};

export type DeferredDiffEvent =
  | { type: "visibility"; nearViewport: boolean }
  | { type: "measured"; height: number }
  | { type: "collapsed" };

export const initialDeferredDiffState: DeferredDiffState = { mounted: false, height: 0 };

export function nextDeferredDiffState(current: DeferredDiffState, event: DeferredDiffEvent): DeferredDiffState {
  if (event.type === "collapsed") return { mounted: false, height: 0 };
  if (event.type === "measured") return event.height > 0 && event.height !== current.height ? { ...current, height: event.height } : current;
  if (event.nearViewport) return current.mounted ? current : { ...current, mounted: true };
  if (!current.mounted) return current;
  return { ...current, mounted: false };
}
