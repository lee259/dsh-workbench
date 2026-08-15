export type Locale = "zh" | "en";

export type MessageKey =
  | "loadingTitle"
  | "loadingHint"
  | "copy"
  | "refresh"
  | "copied"
  | "copyPath"
  | "pathCopied"
  | "close"
  | "reading"
  | "readError"
  | "linesWorkspace"
  | "linesDiff"
  | "workspaceTitle"
  | "footerView"
  | "footerDiff"
  | "footerBrand"
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
  | "searchPlaceholder"
  | "searching"
  | "searchNoResults"
  | "searchHint"
  | "searchError"
  | "searchTypeHint"
  | "recentFiles"
  | "treeFilter"
  | "treeFilterPlaceholder"
  | "clearSearch"
  | "treeNoMatches"
  | "treeMatchCount"
  | "treeEmpty"
  | "revealInTree"
  | "insertPathAction"
  | "collapseFolders"
  | "tabDiff"
  | "workspaceTree"
  | "openFile"
  | "newTab"
  | "filePath"
  | "resizeTree"
  | "fileMenu"
  | "openFileAction"
  | "copyPathAction"
  | "showTree"
  | "hideTree"
  | "findInFile"
  | "goToLine"
  | "workbench";

const zh: Record<MessageKey, string> = {
  loadingTitle: "正在读取文件",
  loadingHint: "从当前工作区加载内容…",
  copy: "复制内容",
  refresh: "刷新文件",
  copied: "已复制",
  copyPath: "复制文件路径",
  pathCopied: "路径已复制",
  close: "关闭",
  reading: "正在读取…",
  readError: "读取失败",
  linesWorkspace: "{count} 行 · 当前工作区",
  linesDiff: "{count} 行 · DSH 写入对比",
  workspaceTitle: "文件工作区",
  footerView: "只读查看 · 当前工作区内容",
  footerDiff: "只读查看 · 基于 DSH write/edit 输出",
  footerBrand: "DSH 工作台",
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
  searchPlaceholder: "输入文件名…",
  searching: "正在搜索…",
  searchNoResults: "没有匹配的文件",
  searchHint: "⌘/Ctrl+P 打开文件",
  searchError: "文件搜索失败",
  searchTypeHint: "输入文件名以打开",
  recentFiles: "最近打开",
  treeFilter: "在文件树中定位",
  treeFilterPlaceholder: "筛选并定位到文件…",
  clearSearch: "清除搜索",
  treeNoMatches: "没有匹配的文件",
  treeMatchCount: "{count} 个匹配",
  treeEmpty: "工作区是空的",
  revealInTree: "在树中显示",
  insertPathAction: "插入路径到输入框",
  collapseFolders: "折叠全部文件夹",
  tabDiff: "对比",
  workspaceTree: "工作区文件树",
  openFile: "打开文件",
  newTab: "新建标签页",
  filePath: "文件路径",
  resizeTree: "调整文件树宽度",
  fileMenu: "文件操作",
  openFileAction: "打开文件",
  copyPathAction: "复制路径",
  showTree: "显示文件树",
  hideTree: "隐藏文件树",
  findInFile: "在文件中查找",
  goToLine: "跳转到行",
  workbench: "工作台",
};

const en: Record<MessageKey, string> = {
  loadingTitle: "Reading file",
  loadingHint: "Loading from the current workspace…",
  copy: "Copy",
  refresh: "Refresh file",
  copied: "Copied",
  copyPath: "Copy file path",
  pathCopied: "Path copied",
  close: "Close",
  reading: "Reading…",
  readError: "Failed to read",
  linesWorkspace: "{count} lines · workspace",
  linesDiff: "{count} lines · DSH write diff",
  workspaceTitle: "File workspace",
  footerView: "Read-only · current workspace content",
  footerDiff: "Read-only · from DSH write/edit output",
  footerBrand: "DSH Workbench",
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
  searchPlaceholder: "Type a file name…",
  searching: "Searching…",
  searchNoResults: "No matching files",
  searchHint: "⌘/Ctrl+P to open a file",
  searchError: "File search failed",
  searchTypeHint: "Type a file name to open it",
  recentFiles: "Recent",
  treeFilter: "Locate in file tree",
  treeFilterPlaceholder: "Filter and locate a file…",
  clearSearch: "Clear search",
  treeNoMatches: "No matching files",
  treeMatchCount: "{count} matches",
  treeEmpty: "Workspace is empty",
  revealInTree: "Reveal in tree",
  insertPathAction: "Insert path into input",
  collapseFolders: "Collapse folders",
  tabDiff: "diff",
  workspaceTree: "Workspace files",
  openFile: "Open file",
  newTab: "New tab",
  filePath: "File path",
  resizeTree: "Resize file tree",
  fileMenu: "File actions",
  openFileAction: "Open file",
  copyPathAction: "Copy path",
  showTree: "Show file tree",
  hideTree: "Hide file tree",
  findInFile: "Find in file",
  goToLine: "Go to line",
  workbench: "Workbench",
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
