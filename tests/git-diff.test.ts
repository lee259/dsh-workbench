import { execFile } from "node:child_process";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import { afterEach, expect, test } from "vitest";
import { gitDiffFile, gitDiffFiles, gitStatus } from "../src/host/git-diff.js";

const execFileAsync = promisify(execFile);
const roots: string[] = [];

async function run(root: string, ...args: string[]): Promise<void> {
  await execFileAsync("git", ["-C", root, ...args]);
}

async function fixture(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), "dsh-workbench-git-"));
  roots.push(root);
  await run(root, "init", "--quiet");
  await run(root, "config", "user.email", "test@example.com");
  await run(root, "config", "user.name", "Test");
  await writeFile(join(root, "tracked.ts"), "export const value = 1;\n");
  await run(root, "add", "tracked.ts");
  await run(root, "commit", "--quiet", "-m", "initial");
  return root;
}

afterEach(async () => {
  await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});

test("Git diff scopes keep the matching Git baseline", async () => {
  const root = await fixture();
  await writeFile(join(root, "tracked.ts"), "export const value = 2;\n");
  await writeFile(join(root, "new.ts"), "export const added = true;\n");

  const unstaged = await gitDiffFiles(root, "unstaged");
  expect(unstaged).toEqual(expect.arrayContaining([
    expect.objectContaining({ path: "tracked.ts", before: "export const value = 1;\n", content: "export const value = 2;\n", additions: 1, deletions: 1 }),
    expect.objectContaining({ path: "new.ts", before: null, content: "export const added = true;\n", additions: 1, deletions: 0 }),
  ]));

  await run(root, "add", "tracked.ts");
  await writeFile(join(root, "tracked.ts"), "export const value = 3;\n");

  const staged = await gitDiffFiles(root, "staged");
  expect(staged).toEqual([expect.objectContaining({ path: "tracked.ts", before: "export const value = 1;\n", content: "export const value = 2;\n", additions: 1, deletions: 1 })]);
  const all = await gitDiffFiles(root, "uncommitted");
  expect(all).toEqual(expect.arrayContaining([
    expect.objectContaining({ path: "tracked.ts", before: "export const value = 1;\n", content: "export const value = 3;\n", additions: 1, deletions: 1 }),
  ]));
});

test("Git status separates staged, unstaged, and untracked files", async () => {
  const root = await fixture();
  await writeFile(join(root, "tracked.ts"), "export const value = 2;\n");
  await run(root, "add", "tracked.ts");
  await writeFile(join(root, "tracked.ts"), "export const value = 3;\n");
  await writeFile(join(root, "new.ts"), "new\n");
  expect(await gitStatus(root)).toMatchObject({ staged: 1, unstaged: 1, untracked: 1 });
});

test("Git can resolve one changed file without enumerating the full worktree", async () => {
  const root = await fixture();
  await writeFile(join(root, "tracked.ts"), "export const value = 2;\n");
  await writeFile(join(root, "new.ts"), "export const added = true;\n");

  await expect(gitDiffFile(root, "uncommitted", "tracked.ts")).resolves.toMatchObject({ path: "tracked.ts", additions: 1, deletions: 1 });
  await expect(gitDiffFile(root, "uncommitted", "new.ts")).resolves.toMatchObject({ path: "new.ts", additions: 1, deletions: 0 });
  await expect(gitDiffFile(root, "uncommitted", "missing.ts")).resolves.toBeNull();
});

test("Git diffs exclude files outside the text preview allowlist", async () => {
  const root = await fixture();
  await writeFile(join(root, "archive.zip"), "binary");

  await expect(gitDiffFiles(root, "uncommitted")).resolves.not.toEqual(expect.arrayContaining([
    expect.objectContaining({ path: "archive.zip" }),
  ]));
  await expect(gitDiffFile(root, "uncommitted", "archive.zip")).resolves.toBeNull();
});
