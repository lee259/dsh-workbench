import { isFileToolName } from "./tool-path.js";
import { normalizePath } from "../shared/types.js";
import type { FileOpenMode } from "../shared/types.js";

export type OpenButtonHint = {
  className: string;
  title?: string;
  text?: string;
  producedRow?: boolean;
  tool?: string | null;
  mode?: FileOpenMode;
};

export function fileOpenModeFromHint(hint: OpenButtonHint): FileOpenMode {
  if (hint.mode) return hint.mode;
  if (hint.tool === "write" || hint.tool === "edit" || hint.tool?.endsWith("/write") || hint.tool?.endsWith("/edit")) return "diff";
  if (hint.tool === "read" || hint.tool?.endsWith("/read") || hint.producedRow || hint.className.includes("fileMention") || hint.className.includes("fileLink")) return "view";
  return "auto";
}

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
  if (isFileToolName(hint.tool ?? null) || hint.className.includes("fileLink")) return usablePath(hint.text);
  return undefined;
}

export function filePathFromOpenTarget(target: EventTarget | null): string | undefined {
  return openButtonHintFromTarget(target) ? filePathFromOpenHint(openButtonHintFromTarget(target) as OpenButtonHint) : undefined;
}

function openButtonHintFromTarget(target: EventTarget | null): OpenButtonHint | undefined {
  if (!(target instanceof Element)) return undefined;
  const button = target.closest("button, a");
  if (!button) return undefined;
  return {
    className: typeof button.className === "string" ? button.className : "",
    title: button.getAttribute("title") ?? undefined,
    text: button.textContent,
    producedRow: Boolean(button.closest("[data-produced-files-row]")),
    tool: button.closest("[data-tool]")?.getAttribute("data-tool"),
    mode: button.getAttribute("data-dsh-wb-mode") as FileOpenMode | null ?? undefined,
  };
}

export function installFileOpenCapture(open: (path: string, mode: FileOpenMode) => void): () => void {
  const onClick = (event: MouseEvent) => {
    const hint = openButtonHintFromTarget(event.target);
    if (hint?.className.split(/\s+/).includes("dsh-wb-tool-path")) return;
    const path = hint ? filePathFromOpenHint(hint) : undefined;
    if (!path) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    open(path, fileOpenModeFromHint(hint as OpenButtonHint));
  };
  document.addEventListener("click", onClick, true);
  return () => document.removeEventListener("click", onClick, true);
}
