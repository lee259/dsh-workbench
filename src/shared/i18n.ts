export type Locale = "zh" | "en";

export type MessageKey =
  | "loadingTitle"
  | "loadingHint"
  | "copyPath"
  | "pathCopied"
  | "close"
  | "reading"
  | "readError"
  | "linesWorkspace"
  | "linesDiff"
  | "workspaceTitle"
  | "file"
  | "toolRead"
  | "toolWrite"
  | "toolEdit"
  | "statusRunning"
  | "statusDone"
  | "statusError"
  | "ariaWorkspace"
  | "missing_path"
  | "not_previewable"
  | "file_not_found"
  | "read_failed"
  | "resize"
  | "showPanel"
  | "hidePanel"
  | "selectFile"
  | "openFiles"
  | "closeFile"
  | "shortcutHint"
  | "resetWidth"
  | "searchFiles"
  | "searchContent"
  | "searchPlaceholder"
  | "contentSearchPlaceholder"
  | "searching"
  | "searchNoResults"
  | "searchHint"
  | "searchError"
  | "searchTypeHint"
  | "contentSearchHint"
  | "recentFiles"
  | "treeFilter"
  | "treeFilterPlaceholder"
  | "clearSearch"
  | "showTree"
  | "hideTree"
  | "viewOptions"
  | "treeNoMatches"
  | "treeMatchCount"
  | "treeEmpty"
  | "revealInTree"
  | "insertPathAction"
  | "workspaceTree"
  | "openFile"
  | "newTab"
  | "filePath"
  | "resizeTree"
  | "fileMenu"
  | "openFileAction"
  | "copyPathAction"
  | "diffMode"
  | "previewMode"
  | "findInFile"
  | "goToLine"
  | "workbench"
  | "markdownPreview"
  | "markdownSource"
  | "reviewTitle"
  | "reviewError"
  | "reviewEmpty"
  | "reviewEmptyHint"
  | "reviewFiles"
  | "editedFiles";

const zh: Record<MessageKey, string> = {
  loadingTitle: "正在读取文件",
  loadingHint: "从当前工作区加载内容…",
  copyPath: "复制文件路径",
  pathCopied: "路径已复制",
  close: "关闭",
  reading: "正在读取…",
  readError: "读取失败",
  linesWorkspace: "{count} 行 · 当前工作区",
  linesDiff: "+{additions} −{deletions} · DSH 写入对比",
  workspaceTitle: "文件工作区",
  file: "文件",
  toolRead: "读取",
  toolWrite: "写入",
  toolEdit: "编辑",
  statusRunning: "运行中",
  statusDone: "完成",
  statusError: "失败",
  ariaWorkspace: "文件工作区",
  missing_path: "缺少路径",
  not_previewable: "文件无法预览",
  file_not_found: "文件不存在",
  read_failed: "文件读取失败",
  resize: "调整面板宽度",
  showPanel: "显示侧边栏",
  hidePanel: "隐藏侧边栏",
  selectFile: "点击文件路径，在这里打开文件",
  openFiles: "已打开文件",
  closeFile: "关闭文件",
  shortcutHint: "快捷键：⌥⌘B",
  resetWidth: "双击恢复默认宽度",
  searchFiles: "打开文件",
  searchContent: "搜索文件内容",
  searchPlaceholder: "输入文件名…",
  contentSearchPlaceholder: "输入要搜索的内容…",
  searching: "正在搜索…",
  searchNoResults: "没有匹配的文件",
  searchHint: "⌘/Ctrl+P 打开文件",
  searchError: "文件搜索失败",
  searchTypeHint: "输入文件名以打开",
  contentSearchHint: "输入内容以搜索工作区",
  recentFiles: "最近打开",
  treeFilter: "在文件树中定位",
  treeFilterPlaceholder: "筛选并定位到文件…",
  clearSearch: "清除搜索",
  showTree: "显示文件栏",
  hideTree: "隐藏文件栏",
  viewOptions: "视图选项",
  treeNoMatches: "没有匹配的文件",
  treeMatchCount: "{count} 个匹配",
  treeEmpty: "工作区是空的",
  revealInTree: "在树中显示",
  insertPathAction: "插入路径到输入框",
  workspaceTree: "工作区文件树",
  openFile: "打开文件",
  newTab: "新建标签页",
  filePath: "文件路径",
  resizeTree: "调整文件树宽度",
  fileMenu: "文件操作",
  openFileAction: "打开文件",
  copyPathAction: "复制路径",
  diffMode: "显示变更审阅",
  previewMode: "显示文件树",
  findInFile: "在文件中查找",
  goToLine: "跳转到行",
  workbench: "工作台",
  markdownPreview: "预览 Markdown",
  markdownSource: "查看原始 Markdown",
  reviewTitle: "变更审阅",
  reviewError: "变更加载失败",
  reviewEmpty: "暂无捕获的变更",
  reviewEmptyHint: "DSH 写入文件后会显示在这里",
  reviewFiles: "个文件",
  editedFiles: "已编辑 {count} 个文件",
};

const en: Record<MessageKey, string> = {
  loadingTitle: "Reading file",
  loadingHint: "Loading from the current workspace…",
  copyPath: "Copy file path",
  pathCopied: "Path copied",
  close: "Close",
  reading: "Reading…",
  readError: "Failed to read",
  linesWorkspace: "{count} lines · workspace",
  linesDiff: "+{additions} −{deletions} · DSH write diff",
  workspaceTitle: "File workspace",
  file: "File",
  toolRead: "Read",
  toolWrite: "Write",
  toolEdit: "Edit",
  statusRunning: "Running",
  statusDone: "Done",
  statusError: "Failed",
  ariaWorkspace: "File workspace",
  missing_path: "Missing path",
  not_previewable: "File is not previewable",
  file_not_found: "File not found",
  read_failed: "Failed to read file",
  resize: "Resize panel",
  showPanel: "Show sidebar",
  hidePanel: "Hide sidebar",
  selectFile: "Click a file path to open it here",
  openFiles: "Open files",
  closeFile: "Close file",
  shortcutHint: "Shortcut: ⌥⌘B",
  resetWidth: "Double-click to reset width",
  searchFiles: "Open file",
  searchContent: "Search file contents",
  searchPlaceholder: "Type a file name…",
  contentSearchPlaceholder: "Search workspace contents…",
  searching: "Searching…",
  searchNoResults: "No matching files",
  searchHint: "⌘/Ctrl+P to open a file",
  searchError: "File search failed",
  searchTypeHint: "Type a file name to open it",
  contentSearchHint: "Type text to search the workspace",
  recentFiles: "Recent",
  treeFilter: "Locate in file tree",
  treeFilterPlaceholder: "Filter and locate a file…",
  clearSearch: "Clear search",
  showTree: "Show file pane",
  hideTree: "Hide file pane",
  viewOptions: "View options",
  treeNoMatches: "No matching files",
  treeMatchCount: "{count} matches",
  treeEmpty: "Workspace is empty",
  revealInTree: "Reveal in tree",
  insertPathAction: "Insert path into input",
  workspaceTree: "Workspace files",
  openFile: "Open file",
  newTab: "New tab",
  filePath: "File path",
  resizeTree: "Resize file tree",
  fileMenu: "File actions",
  openFileAction: "Open file",
  copyPathAction: "Copy path",
  diffMode: "Show review",
  previewMode: "Show file tree",
  findInFile: "Find in file",
  goToLine: "Go to line",
  workbench: "Workbench",
  markdownPreview: "Preview Markdown",
  markdownSource: "View raw Markdown",
  reviewTitle: "Review changes",
  reviewError: "Failed to load changes",
  reviewEmpty: "No captured changes",
  reviewEmptyHint: "DSH file writes will appear here",
  reviewFiles: "files",
  editedFiles: "{count} files edited",
};

const catalogs: Record<Locale, Record<MessageKey, string>> = { zh, en };

export function resolveLocale(input?: string): Locale {
  return (input ?? "").toLowerCase().startsWith("zh") ? "zh" : "en";
}

export function detectLocale(): Locale {
  if (typeof document !== "undefined" && document.documentElement.lang) {
    return resolveLocale(document.documentElement.lang);
  }
  if (typeof navigator !== "undefined") return resolveLocale(navigator.language);
  return "en";
}

export function translate(locale: Locale, key: string, vars: Record<string, string | number> = {}): string {
  const catalog = catalogs[locale] ?? en;
  const template = catalog[key as MessageKey] ?? en[key as MessageKey] ?? key;
  return template.replace(/\{(\w+)\}/g, (_, name: string) => String(vars[name] ?? `{${name}}`));
}

export type DshLocaleFace = {
  getLocale?: () => { active?: string };
  getSnapshot?: () => { active?: string };
  subscribe?: (fn: () => void) => () => void;
};

export type LocaleStore = {
  getSnapshot(): Locale;
  subscribe(listener: () => void): () => void;
  setLocale(locale: Locale): void;
  t(key: string, vars?: Record<string, string | number>): string;
};

export function followDshLocale(i18n: LocaleStore, locale: DshLocaleFace): () => void {
  const read = () => locale.getLocale?.() ?? locale.getSnapshot?.() ?? {};
  const sync = () => i18n.setLocale(resolveLocale(read().active));
  sync();
  return locale.subscribe?.(sync) ?? (() => {});
}

export function createLocaleStore(initial: Locale = detectLocale()): LocaleStore {
  let locale = initial;
  const listeners = new Set<() => void>();

  return {
    getSnapshot: () => locale,
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    setLocale(next) {
      if (next === locale) return;
      locale = next;
      for (const listener of listeners) listener();
    },
    t(key, vars) {
      return translate(locale, key, vars);
    },
  };
}
