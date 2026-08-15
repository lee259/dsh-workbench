import type { WorkspaceFile, WorkspaceTree } from "../../shared/types.js";

export type SearchHit = {
  path: string;
  name: string;
  parent: string;
  size: number;
  score: number;
};

export type HighlightSegment = {
  text: string;
  match: boolean;
};

export function splitSearchPath(path: string): { name: string; parent: string } {
  const parts = path.split("/").filter(Boolean);
  return {
    name: parts.at(-1) ?? path,
    parent: parts.slice(0, -1).join("/"),
  };
}

export function highlightSegments(text: string, query: string): HighlightSegment[] {
  const needle = query.trim();
  if (!needle || !text) return text ? [{ text, match: false }] : [];
  const index = text.toLowerCase().indexOf(needle.toLowerCase());
  if (index < 0) return [{ text, match: false }];
  return [
    { text: text.slice(0, index), match: false },
    { text: text.slice(index, index + needle.length), match: true },
    { text: text.slice(index + needle.length), match: false },
  ].filter((segment) => segment.text);
}

export function moveSearchFocus(count: number, current: number, delta: number): number {
  if (count <= 0) return 0;
  return Math.max(0, Math.min(count - 1, current + delta));
}

function scorePath(path: string, needle: string): number {
  const { name } = splitSearchPath(path);
  const nameLower = name.toLowerCase();
  const pathLower = path.toLowerCase();
  const dot = nameLower.lastIndexOf(".");
  const stem = dot > 0 ? nameLower.slice(0, dot) : nameLower;
  if (nameLower === needle || stem === needle) return 300;
  if (nameLower.startsWith(needle) || stem.startsWith(needle)) return 200;
  if (nameLower.includes(needle)) return 100;
  if (pathLower.includes(needle)) return 10;
  return -1;
}

export function toSearchHit(file: Pick<WorkspaceFile, "path" | "size">, score = 0): SearchHit {
  const { name, parent } = splitSearchPath(file.path);
  return { path: file.path, name, parent, size: file.size, score };
}

export function rankSearchHits(files: readonly Pick<WorkspaceFile, "path" | "size">[], query: string, limit = 50): SearchHit[] {
  const needle = query.trim().toLowerCase();
  if (!needle) return [];
  return files
    .map((file) => toSearchHit(file, scorePath(file.path, needle)))
    .filter((hit) => hit.score >= 0)
    .sort((left, right) => right.score - left.score || left.name.length - right.name.length || left.path.localeCompare(right.path))
    .slice(0, limit);
}

export function recentSearchHits(paths: readonly string[]): SearchHit[] {
  return [...new Set(paths.filter(Boolean))].map((path) => toSearchHit({ path, size: 0 }));
}

export function treeSearchHits(tree: WorkspaceTree, query: string, limit = 50): SearchHit[] {
  const needle = query.trim().toLowerCase();
  if (!needle) return [];
  const directories = tree.directories.map((path) => ({ path, size: 0 }));
  return rankSearchHits([...directories, ...tree.files], query, limit);
}
