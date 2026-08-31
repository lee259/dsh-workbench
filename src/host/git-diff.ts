import { execFile } from "node:child_process";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { promisify } from "node:util";
import { countDiffLines } from "../shared/line-diff.js";
import type { GitFileDiff } from "../shared/types.js";

const execFileAsync = promisify(execFile);

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
  const files = await Promise.all(tracked.map(async (path) => {
    const [before, content] = await Promise.all([
      gitFile(root, baseline, path),
      scope === "staged" ? gitFile(root, ":", path).then((file) => file ?? "") : diskFile(root, path),
    ]);
    return { path, before, content, ...countDiffLines(before, content) };
  }));
  if (scope === "staged") return files;
  const raw = await runGit(root, ["ls-files", "--others", "--exclude-standard", "-z"]);
  const untracked = raw.split("\0").filter(Boolean);
  const additions = await Promise.all(untracked.map(async (path) => {
    const content = await diskFile(root, path);
    return { path, before: null, content, ...countDiffLines(null, content) };
  }));
  return [...files, ...additions];
}
