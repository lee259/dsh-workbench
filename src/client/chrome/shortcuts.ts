export type ShortcutState = {
  visible: boolean;
  active: string;
  open: string[];
};

export type ShortcutEvent = Pick<KeyboardEvent, "key" | "altKey" | "ctrlKey" | "metaKey"> & {
  shiftKey?: boolean;
  target?: EventTarget | null;
  defaultPrevented?: boolean;
};

export type ShortcutAction =
  | { type: "hide" }
  | { type: "close"; path: string }
  | { type: "activate"; path: string }
  | { type: "search" }
  | { type: "contentSearch" }
  | { type: "toggle" }
  | { type: "toggleTree" }
  | { type: "find" }
  | { type: "gotoLine" }
  | null;

function hasMod(event: ShortcutEvent): boolean {
  return Boolean(event.metaKey || event.ctrlKey);
}

function isEditableTarget(target: EventTarget | null | undefined): boolean {
  if (!target || typeof target !== "object") return false;
  const element = target as { tagName?: string; isContentEditable?: boolean; getAttribute?: (name: string) => string | null };
  const tag = element.tagName?.toLowerCase();
  return tag === "input" || tag === "textarea" || tag === "select" || element.isContentEditable === true || element.getAttribute?.("contenteditable") === "true";
}

export function shortcutAction(event: ShortcutEvent, state: ShortcutState): ShortcutAction {
  if (event.defaultPrevented || isEditableTarget(event.target)) return null;
  if (event.key === "Escape" && state.visible) return { type: "hide" };
  if (state.visible && hasMod(event) && event.key.toLowerCase() === "w" && state.active) {
    return { type: "close", path: state.active };
  }
  if (state.visible && event.altKey && (event.key === "ArrowLeft" || event.key === "ArrowRight") && state.open.length > 1) {
    const current = Math.max(0, state.open.indexOf(state.active));
    const offset = event.key === "ArrowLeft" ? -1 : 1;
    const path = state.open[(current + offset + state.open.length) % state.open.length];
    return path ? { type: "activate", path } : null;
  }
  if (state.visible && hasMod(event) && !event.shiftKey && /^[1-9]$/.test(event.key)) {
    const path = state.open[Number(event.key) - 1];
    return path ? { type: "activate", path } : null;
  }
  if (event.key.toLowerCase() === "b" && event.altKey && hasMod(event)) {
    return { type: "toggle" };
  }
  if (hasMod(event) && event.shiftKey && event.key.toLowerCase() === "e") {
    return { type: "toggleTree" };
  }
  if (hasMod(event) && !event.shiftKey && event.key.toLowerCase() === "p") {
    return { type: "search" };
  }
  if (hasMod(event) && event.shiftKey && event.key.toLowerCase() === "f") {
    return { type: "contentSearch" };
  }
  if (state.visible && state.active && hasMod(event) && !event.shiftKey && event.key.toLowerCase() === "f") {
    return { type: "find" };
  }
  if (state.visible && state.active && hasMod(event) && !event.shiftKey && event.key.toLowerCase() === "l") {
    return { type: "gotoLine" };
  }
  return null;
}
