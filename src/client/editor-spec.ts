import type { FilePayload, FileSource } from "../shared/types.js";
import { languageForPath, type LanguageId } from "./lang-map.js";

export type ViewKind = "view" | "diff";

/**
 * CodeMirror 语言名映射表。
 * 大部分和 LanguageId 一致，少数需要转换。
 */
const CM_LANG: Partial<Record<LanguageId, string>> = {
  php: "html",
  toml: "toml",
  makefile: "bash",
};

export function viewKind(source: FileSource): ViewKind {
  return source === "dsh-write" ? "diff" : "view";
}

export function editorSpec(payload: Pick<FilePayload, "source" | "before" | "path">): {
  kind: ViewKind;
  original: string | null;
  language: string | null;
} {
  const kind = viewKind(payload.source);
  const id = languageForPath(payload.path);
  return {
    kind,
    original: kind === "diff" ? payload.before ?? "" : null,
    language: id != null ? (CM_LANG[id] ?? id) : null,
  };
}