const IMAGE_EXTENSIONS = new Set([
  "png", "jpg", "jpeg", "gif", "webp", "svg", "avif", "bmp", "ico",
]);

const TEXT_EXTENSIONS = new Set([
  "ts", "tsx", "mts", "cts", "js", "jsx", "mjs", "cjs",
  "json", "jsonc", "css", "scss", "less", "html", "htm", "xhtml",
  "md", "mdx", "markdown", "yaml", "yml", "ini", "toml", "cfg",
  "properties", "env", "sh", "bash", "zsh", "fish", "c", "h", "cpp",
  "cc", "cxx", "hpp", "hxx", "go", "rs", "java", "py", "pyw", "rb",
  "rake", "gemspec", "php", "sql", "diff", "patch", "txt", "log",
]);

const TEXT_BASENAMES = new Set([
  ".env", ".gitignore", ".npmignore", ".prettierignore", ".eslintignore",
  "dockerfile", "makefile", "readme", "license", "notice", "changelog",
]);

function basename(path: string): string {
  return path.toLowerCase().split("/").pop() ?? "";
}

function extension(path: string): string {
  const name = basename(path);
  const dot = name.lastIndexOf(".");
  return dot > 0 ? name.slice(dot + 1) : "";
}

export function isImagePreviewPath(path: string): boolean {
  return IMAGE_EXTENSIONS.has(extension(path));
}

export function isTextPreviewPath(path: string): boolean {
  const name = basename(path);
  return TEXT_BASENAMES.has(name)
    || name.startsWith("dockerfile.")
    || name.startsWith("makefile.")
    || TEXT_EXTENSIONS.has(extension(path));
}

export function isPreviewablePath(path: string): boolean {
  return isImagePreviewPath(path) || isTextPreviewPath(path);
}

export function isMarkdownPreviewPath(path: string): boolean {
  return ["md", "markdown", "mdx"].includes(extension(path));
}
