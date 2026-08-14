export type ShortcutState = {
  visible: boolean;
  active: string;
  open: string[];
};

export type ShortcutAction =
  | { type: "hide" }
  | { type: "close"; path: string }
  | { type: "activate"; path: string }
  | { type: "toggle" }
  | null;

export function shortcutAction(
  event: Pick<KeyboardEvent, "key" | "altKey" | "ctrlKey" | "metaKey">,
  state: ShortcutState,
): ShortcutAction {
  if (event.key === "Escape" && state.visible) return { type: "hide" };
  if (state.visible && (event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "w" && state.active) {
    return { type: "close", path: state.active };
  }
  if (state.visible && event.altKey && (event.key === "ArrowLeft" || event.key === "ArrowRight") && state.open.length > 1) {
    const current = Math.max(0, state.open.indexOf(state.active));
    const offset = event.key === "ArrowLeft" ? -1 : 1;
    const path = state.open[(current + offset + state.open.length) % state.open.length];
    return path ? { type: "activate", path } : null;
  }
  if (state.visible && (event.metaKey || event.ctrlKey) && /^[1-9]$/.test(event.key)) {
    const path = state.open[Number(event.key) - 1];
    return path ? { type: "activate", path } : null;
  }
  if (event.key.toLowerCase() === "b" && event.altKey && (event.metaKey || event.ctrlKey)) {
    return { type: "toggle" };
  }
  return null;
}
