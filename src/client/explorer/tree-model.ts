import type { FileOpenMode, WorkspaceFile, WorkspaceTree } from "../../shared/types.js";

export const TREE_WIDTH_KEY = "dsh-workbench.tree-width";
export const TREE_OPEN_KEY = "dsh-workbench.tree-open";
export const TREE_VISIBLE_KEY = "dsh-workbench.tree-visible";
export const MIN_TREE_WIDTH = 260;
export const MAX_TREE_WIDTH = 380;
export const DEFAULT_TREE_WIDTH = 320;

export type TreeStorage = Pick<Storage, "getItem" | "setItem">;
export type TreeKind = "directory" | "file";
export type TreeNode = { path: string; name: string; kind: TreeKind };
export type TreeRow = TreeNode & { depth: number };
export type BreadcrumbTarget = { label: string; path: string; kind: "root" | "directory" | "file" };

export function treeFileOpenMode(): FileOpenMode {
  return "view";
}

export function clampTreeWidth(value: number): number {
  return Math.max(MIN_TREE_WIDTH, Math.min(MAX_TREE_WIDTH, value));
}

export function readTreeWidth(storage: TreeStorage, fallback = DEFAULT_TREE_WIDTH): number {
  try {
    const value = Number(storage.getItem(TREE_WIDTH_KEY));
    return Number.isFinite(value) ? clampTreeWidth(value) : fallback;
  } catch {
    return fallback;
  }
}

export function writeTreeWidth(storage: TreeStorage, value: number): void {
  try {
    storage.setItem(TREE_WIDTH_KEY, String(clampTreeWidth(value)));
  } catch {
    // Storage can be unavailable in private or embedded contexts.
  }
}

export function readTreeOpen(storage: TreeStorage): string[] {
  try {
    const value: unknown = JSON.parse(storage.getItem(TREE_OPEN_KEY) ?? "[]");
    return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
  } catch {
    return [];
  }
}

export function writeTreeOpen(storage: TreeStorage, value: string[]): void {
  try {
    storage.setItem(TREE_OPEN_KEY, JSON.stringify(value));
  } catch {
    // Storage can be unavailable in private or embedded contexts.
  }
}

export function readTreeVisible(storage: TreeStorage, fallback = true): boolean {
  try {
    const value = storage.getItem(TREE_VISIBLE_KEY);
    if (value == null) return fallback;
    return value === "1" || value === "true";
  } catch {
    return fallback;
  }
}

export function writeTreeVisible(storage: TreeStorage, value: boolean): void {
  try {
    storage.setItem(TREE_VISIBLE_KEY, value ? "1" : "0");
  } catch {
    // Storage can be unavailable in private or embedded contexts.
  }
}

export function ancestorDirectories(path: string): string[] {
  const parts = path.split("/").filter(Boolean);
  if (parts.length <= 1) return [];
  return parts.slice(0, -1).map((_, index) => parts.slice(0, index + 1).join("/"));
}

export function directoriesToReveal(path: string): string[] {
  if (!path) return [];
  return [...ancestorDirectories(path), path];
}

export function mergeOpenDirectories(current: string[], paths: string[]): string[] {
  return [...new Set([...current, ...paths.filter(Boolean)])];
}

export function foldersAreExpanded(open: readonly string[], directories: readonly string[]): boolean {
  return directories.length > 0 && directories.every((path) => open.includes(path));
}

export function nextFolderExpansion(open: readonly string[], directories: readonly string[]): string[] {
  return foldersAreExpanded(open, directories) ? [] : [...directories];
}

export function breadcrumbTargets(path: string): BreadcrumbTarget[] {
  const parts = path.split("/").filter(Boolean);
  const items: BreadcrumbTarget[] = [{ label: "/", path: "", kind: "root" }];
  parts.forEach((part, index) => {
    items.push({
      label: part,
      path: parts.slice(0, index + 1).join("/"),
      kind: index === parts.length - 1 ? "file" : "directory",
    });
  });
  return items;
}

export function visibleBreadcrumbTargets(path: string): BreadcrumbTarget[] {
  return breadcrumbTargets(path).filter((item) => item.kind !== "root");
}

export function treeChildren(tree: WorkspaceTree, parent: string): TreeNode[] {
  const directories = tree.directories
    .filter((item) => item.split("/").slice(0, -1).join("/") === parent)
    .map((item) => ({ path: item, name: item.split("/").at(-1) ?? item, kind: "directory" as const }));
  const files = tree.files
    .filter((file) => file.path.split("/").slice(0, -1).join("/") === parent)
    .map((file) => ({ path: file.path, name: file.path.split("/").at(-1) ?? file.path, kind: "file" as const }));
  return [...directories, ...files].sort((left, right) => (
    left.kind === right.kind ? left.name.localeCompare(right.name) : left.kind === "directory" ? -1 : 1
  ));
}

export function treeMatches(tree: WorkspaceTree, node: TreeNode, query: string): boolean {
  const needle = query.trim().toLowerCase();
  if (!needle) return true;
  if (node.name.toLowerCase().includes(needle)) return true;
  return node.kind === "directory" && treeChildren(tree, node.path).some((child) => treeMatches(tree, child, needle));
}

/** Keep query matches in place, along with the folders needed to reach them. */
export function filterTree(tree: WorkspaceTree, query: string): WorkspaceTree {
  const needle = query.trim().toLowerCase();
  if (!needle) return tree;
  const matchedDirectories = tree.directories.filter((path) => path.toLowerCase().includes(needle));
  const isInsideMatchedDirectory = (path: string) => matchedDirectories.some((directory) => path === directory || path.startsWith(`${directory}/`));
  const files = tree.files.filter((file) => file.path.toLowerCase().includes(needle) || isInsideMatchedDirectory(file.path));
  const visiblePaths = new Set([
    ...matchedDirectories,
    ...files.flatMap((file) => ancestorDirectories(file.path)),
  ]);
  const directories = tree.directories.filter((directory) => (
    visiblePaths.has(directory) || isInsideMatchedDirectory(directory)
  ));
  return { directories, files };
}

export function flattenVisibleRows(tree: WorkspaceTree, open: readonly string[]): TreeRow[] {
  const walk = (parent: string, depth: number): TreeRow[] => treeChildren(tree, parent)
    .flatMap((node) => {
      const row = { ...node, depth };
      return node.kind === "directory" && open.includes(node.path) ? [row, ...walk(node.path, depth + 1)] : [row];
    });
  return walk("", 0);
}

export function moveTreeFocus(rows: readonly TreeRow[], currentPath: string, delta: number): string | undefined {
  if (rows.length === 0) return undefined;
  const index = rows.findIndex((row) => row.path === currentPath);
  const start = index < 0 ? (delta > 0 ? -1 : rows.length) : index;
  const next = Math.max(0, Math.min(rows.length - 1, start + delta));
  return rows[next]?.path;
}

export function parentTreePath(path: string): string {
  return path.split("/").slice(0, -1).join("/");
}

export type TreeKeyAction =
  | { type: "move"; path: string }
  | { type: "toggle"; path: string }
  | { type: "open"; path: string };

export function treeKeyAction(
  key: string,
  rows: readonly TreeRow[],
  currentPath: string,
  open: readonly string[],
): TreeKeyAction | null {
  const current = rows.find((row) => row.path === currentPath);
  if (key === "Home") return rows[0] ? { type: "move", path: rows[0].path } : null;
  if (key === "End") {
    const last = rows.at(-1);
    return last ? { type: "move", path: last.path } : null;
  }
  if (key === "ArrowDown" || key === "ArrowUp") {
    const next = moveTreeFocus(rows, currentPath, key === "ArrowDown" ? 1 : -1);
    return next ? { type: "move", path: next } : null;
  }
  if (!current) return null;
  if (key === "Enter" || key === " ") {
    return current.kind === "directory" ? { type: "toggle", path: current.path } : { type: "open", path: current.path };
  }
  if (key === "ArrowRight") {
    if (current.kind !== "directory") return null;
    if (!open.includes(current.path)) return { type: "toggle", path: current.path };
    const child = rows[rows.findIndex((row) => row.path === current.path) + 1];
    return child && child.depth > current.depth ? { type: "move", path: child.path } : null;
  }
  if (key === "ArrowLeft") {
    if (current.kind === "directory" && open.includes(current.path)) return { type: "toggle", path: current.path };
    const parent = parentTreePath(current.path);
    return parent && rows.some((row) => row.path === parent) ? { type: "move", path: parent } : null;
  }
  return null;
}

export function consumeTreeEscape(input: { menu: boolean; query: string }): "menu" | "query" | null {
  if (input.menu) return "menu";
  if (input.query.trim()) return "query";
  return null;
}

export function emptyTree(): WorkspaceTree {
  return { files: [] as WorkspaceFile[], directories: [] };
}
