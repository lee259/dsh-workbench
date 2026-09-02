import { execFile } from "node:child_process";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { promisify } from "node:util";
import { countDiffLines } from "../shared/line-diff.js";
import type { GitFileDiff, GitStatus } from "../shared/types.js";
import { mapConcurrent } from "./concurrent.js";

const execFileAsync = promisify(execFile);
const DIFF_FILE_CONCURRENCY = 8;

export type GitDiffScope = "uncommitted" | "unstaged" | "staged";

async function runGit(root: string, args: string[]): Promise<string> {
  const { stdout } = await execFileAsync("git", ["-C", root, "--no-pager", "-c", "color.ui=false", ...args], { timeout: 5_000, windowsHide: true });
  return stdout;
}

async function gitFile(root: string, revision: string, path: string): Promise<string | null> {
  try {
    return await runGit(root, ["show", revision === ":" ? `:${path}` : `${revision}:${path}`]);
  } catch {
    return null;
  }
}

async function diskFile(root: string, path: string): Promise<string> {
  try {
    return await readFile(join(root, path), "utf8");
  } catch {
    return "";
  }
}

async function gitPaths(root: string, args: string[]): Promise<string[]> {
  const raw = await runGit(root, args);
  return raw.split("\0").filter(Boolean);
}

export async function gitDiffFiles(root: string, scope: GitDiffScope): Promise<GitFileDiff[]> {
  const diffArgs = scope === "staged"
    ? ["diff", "--cached", "--name-only", "-z"]
    : scope === "uncommitted"
      ? ["diff", "HEAD", "--name-only", "-z"]
      : ["diff", "--name-only", "-z"];
  const tracked = await gitPaths(root, diffArgs);
  const baseline = scope === "unstaged" ? ":" : "HEAD";
  const files = await mapConcurrent(tracked, DIFF_FILE_CONCURRENCY, async (path) => {
    const [before, content] = await Promise.all([
      gitFile(root, baseline, path),
      scope === "staged" ? gitFile(root, ":", path).then((file) => file ?? "") : diskFile(root, path),
    ]);
    return { path, before, content, ...countDiffLines(before, content) };
  });
  if (scope === "staged") return files;
  const raw = await runGit(root, ["ls-files", "--others", "--exclude-standard", "-z"]);
  const untracked = raw.split("\0").filter(Boolean);
  const additions = await mapConcurrent(untracked, DIFF_FILE_CONCURRENCY, async (path) => {
    const content = await diskFile(root, path);
    return { path, before: null, content, ...countDiffLines(null, content) };
  });
  return [...files, ...additions];
}

export async function gitDiffFile(root: string, scope: GitDiffScope, path: string): Promise<GitFileDiff | null> {
  const diffArgs = scope === "staged"
    ? ["diff", "--cached", "--name-only", "-z", "--", path]
    : scope === "uncommitted"
      ? ["diff", "HEAD", "--name-only", "-z", "--", path]
      : ["diff", "--name-only", "-z", "--", path];
  const [tracked] = await gitPaths(root, diffArgs);
  if (tracked) {
    const baseline = scope === "unstaged" ? ":" : "HEAD";
    const [before, content] = await Promise.all([
      gitFile(root, baseline, tracked),
      scope === "staged" ? gitFile(root, ":", tracked).then((file) => file ?? "") : diskFile(root, tracked),
    ]);
    return { path: tracked, before, content, ...countDiffLines(before, content) };
  }
  if (scope === "staged") return null;
  const [untracked] = await gitPaths(root, ["ls-files", "--others", "--exclude-standard", "-z", "--", path]);
  if (!untracked) return null;
  const content = await diskFile(root, untracked);
  return { path: untracked, before: null, content, ...countDiffLines(null, content) };
}

export async function gitStatus(root: string): Promise<GitStatus> {
  const [head = "", ...entries] = (await runGit(root, ["status", "--porcelain=v1", "-b"])).split("\n").filter(Boolean);
  const branch = head.startsWith("## ") ? head.slice(3).split("...")[0] || "HEAD" : "HEAD";
  return entries.reduce<GitStatus>((status, entry) => {
    if (entry.startsWith("??")) return { ...status, untracked: status.untracked + 1 };
    return { ...status, staged: status.staged + (entry[0] !== " " ? 1 : 0), unstaged: status.unstaged + (entry[1] !== " " ? 1 : 0) };
  }, { branch, staged: 0, unstaged: 0, untracked: 0 });
}
