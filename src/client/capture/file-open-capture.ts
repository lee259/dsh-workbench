import { isFileToolName } from "./tool-path.js";
import { parseOpenTarget, type OpenTarget } from "./open-target.js";
import type { FileOpenMode } from "../../shared/types.js";

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

function usableTarget(value: string | undefined): OpenTarget | undefined {
  const raw = value?.trim() ?? "";
  if (!raw || raw === "." || raw.includes("\n") || raw.includes("\0")) return undefined;
  const target = parseOpenTarget(raw);
  return target.path ? target : undefined;
}

export function fileOpenTargetFromHint(hint: OpenButtonHint): OpenTarget | undefined {
  const classes = hint.className.split(/\s+/);
  if (classes.includes("dsh-wb-tool-path")) return usableTarget(hint.text);
  if (hint.producedRow) {
    if (hint.className.includes("showFolder")) return undefined;
    return usableTarget(hint.title);
  }
  if (hint.className.includes("fileMention")) return usableTarget(hint.title);
  if (isFileToolName(hint.tool ?? null) || hint.className.includes("fileLink")) return usableTarget(hint.text);
  return undefined;
}

export function filePathFromOpenHint(hint: OpenButtonHint): string | undefined {
  return fileOpenTargetFromHint(hint)?.path;
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

export function installFileOpenCapture(open: (path: string, mode: FileOpenMode, line?: number) => void): () => void {
  const onClick = (event: MouseEvent) => {
    const hint = openButtonHintFromTarget(event.target);
    if (hint?.className.split(/\s+/).includes("dsh-wb-tool-path")) return;
    const target = hint ? fileOpenTargetFromHint(hint) : undefined;
    if (!target?.path) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    open(target.path, fileOpenModeFromHint(hint as OpenButtonHint), target.line);
  };
  document.addEventListener("click", onClick, true);
  return () => document.removeEventListener("click", onClick, true);
}
