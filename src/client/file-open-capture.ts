import { isFileToolName } from "./tool-path.js";
import { normalizePath } from "../shared/types.js";

export type OpenButtonHint = {
  className: string;
  title?: string;
  text?: string;
  producedRow?: boolean;
  tool?: string | null;
};

function usablePath(value: string | undefined): string | undefined {
  const path = value?.trim() ?? "";
  if (!path || path === "." || path.includes("\n") || path.includes("\0")) return undefined;
  return normalizePath(path);
}

export function filePathFromOpenHint(hint: OpenButtonHint): string | undefined {
  const classes = hint.className.split(/\s+/);
  if (classes.includes("dsh-wb-tool-path")) return usablePath(hint.text);
  if (hint.producedRow) {
    if (hint.className.includes("showFolder")) return undefined;
    return usablePath(hint.title);
  }
  if (hint.className.includes("fileMention")) return usablePath(hint.title);
  if (isFileToolName(hint.tool ?? null) && hint.className.includes("fileLink")) return usablePath(hint.text);
  return undefined;
}

export function filePathFromOpenTarget(target: EventTarget | null): string | undefined {
  if (!(target instanceof Element)) return undefined;
  const button = target.closest("button");
  if (!button) return undefined;
  return filePathFromOpenHint({
    className: typeof button.className === "string" ? button.className : "",
    title: button.getAttribute("title") ?? undefined,
    text: button.textContent,
    producedRow: Boolean(button.closest("[data-produced-files-row]")),
    tool: button.closest("[data-tool]")?.getAttribute("data-tool"),
  });
}

export function installFileOpenCapture(open: (path: string) => void): () => void {
  const onClick = (event: MouseEvent) => {
    const path = filePathFromOpenTarget(event.target);
    if (!path) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    open(path);
  };
  document.addEventListener("click", onClick, true);
  return () => document.removeEventListener("click", onClick, true);
}
