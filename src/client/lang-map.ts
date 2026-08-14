/**
 * 扩展名 → 语言标识（通用层，不绑定任何编辑器或高亮引擎）
 *
 * 消费方（如 `editor-spec.ts` 的 CodeMirror 映射）各自翻译成自己的语言名。
 */

export type LanguageId =
  | "typescript" | "javascript" | "json" | "css" | "html"
  | "xml" | "markdown" | "yaml" | "ini" | "toml"
  | "bash" | "c" | "cpp" | "go" | "rust"
  | "java" | "python" | "ruby" | "php" | "sql"
  | "diff" | "dockerfile" | "makefile";

const EXT_TO_LANG: Record<string, LanguageId> = {
  ts: "typescript",
  tsx: "typescript",
  mts: "typescript",
  cts: "typescript",
  js: "javascript",
  jsx: "javascript",
  mjs: "javascript",
  cjs: "javascript",
  json: "json",
  jsonc: "json",
  css: "css",
  scss: "css",
  less: "css",
  html: "html",
  htm: "html",
  svg: "xml",
  xhtml: "html",
  md: "markdown",
  mdx: "markdown",
  markdown: "markdown",
  yaml: "yaml",
  yml: "yaml",
  ini: "ini",
  toml: "toml",
  cfg: "ini",
  properties: "ini",
  env: "ini",
  sh: "bash",
  bash: "bash",
  zsh: "bash",
  fish: "bash",
  c: "c",
  h: "c",
  cpp: "cpp",
  cc: "cpp",
  cxx: "cpp",
  hpp: "cpp",
  hxx: "cpp",
  go: "go",
  rs: "rust",
  java: "java",
  py: "python",
  pyw: "python",
  rb: "ruby",
  rake: "ruby",
  gemspec: "ruby",
  php: "php",
  sql: "sql",
  diff: "diff",
  patch: "diff",
};

/**
 * 根据文件路径推断语言标识。
 * 支持 basename 匹配（Dockerfile、Makefile）和扩展名匹配。
 * 未知路径返回 `null`。
 */
export function languageForPath(path: string): LanguageId | null {
  const base = path.split("/").pop() ?? path;
  const lower = base.toLowerCase();

  if (lower === "dockerfile" || lower.startsWith("dockerfile.")) return "dockerfile";
  if (lower === "makefile" || lower.startsWith("makefile.")) return "makefile";

  const dot = lower.lastIndexOf(".");
  if (dot > 0) {
    const ext = lower.slice(dot + 1);
    return EXT_TO_LANG[ext] ?? null;
  }
  return null;
}