import { GIT_DIFF_API_PATH, GIT_STATUS_API_PATH, type GitFileDiff, type GitStatus, type ReviewScope } from "../../shared/types.js";

export async function fetchGitDiff(scope: Exclude<ReviewScope, "session">): Promise<GitFileDiff[]> {
  const response = await fetch(`${GIT_DIFF_API_PATH}?scope=${scope}`);
  if (!response.ok) throw new Error("Git diff request failed");
  const payload = await response.json() as { files?: GitFileDiff[] };
  return payload.files ?? [];
}

export async function fetchGitStatus(): Promise<GitStatus> {
  const response = await fetch(GIT_STATUS_API_PATH);
  if (!response.ok) throw new Error("Git status request failed");
  return response.json() as Promise<GitStatus>;
}
