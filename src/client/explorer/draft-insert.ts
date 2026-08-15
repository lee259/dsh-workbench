export function spliceDraftValue(value: string, start: number, end: number, text: string): { value: string; caret: number } {
  const from = Math.max(0, Math.min(value.length, start));
  const to = Math.max(from, Math.min(value.length, end));
  return {
    value: `${value.slice(0, from)}${text}${value.slice(to)}`,
    caret: from + text.length,
  };
}

export function isDraftInput(node: EventTarget | null): node is HTMLTextAreaElement | HTMLInputElement | HTMLElement {
  if (!(node instanceof HTMLElement)) return false;
  if (node instanceof HTMLTextAreaElement) return true;
  if (node instanceof HTMLInputElement) return node.type === "text" || node.type === "search" || !node.type;
  return node.isContentEditable || node.getAttribute("role") === "textbox";
}

export function findDraftInput(root: ParentNode & { activeElement?: Element | null }): HTMLElement | null {
  const active = root.activeElement ?? (root instanceof Document ? root.activeElement : null);
  if (isDraftInput(active)) return active;
  return root.querySelector("textarea, input[type='text'], [contenteditable='true'], [role='textbox']");
}

export function insertDraftText(root: ParentNode & { activeElement?: Element | null }, text: string): boolean {
  const input = findDraftInput(root);
  if (!input || !text) return false;
  if (input instanceof HTMLTextAreaElement || input instanceof HTMLInputElement) {
    const start = input.selectionStart ?? input.value.length;
    const end = input.selectionEnd ?? start;
    const next = spliceDraftValue(input.value, start, end, text);
    input.value = next.value;
    input.setSelectionRange(next.caret, next.caret);
    input.dispatchEvent(new Event("input", { bubbles: true }));
    return true;
  }
  input.focus();
  const selection = input.ownerDocument?.getSelection();
  if (selection && selection.rangeCount > 0 && input.contains(selection.anchorNode)) {
    const range = selection.getRangeAt(0);
    range.deleteContents();
    range.insertNode(input.ownerDocument.createTextNode(text));
    range.collapse(false);
    selection.removeAllRanges();
    selection.addRange(range);
  } else {
    input.append(text);
  }
  input.dispatchEvent(new Event("input", { bubbles: true }));
  return true;
}
