import { REVIEW_API_PATH, type GitFileDiff, type ReviewChange } from "../../shared/types.js";

export type ReviewResponse = {
  changes?: ReviewChange[];
  files?: GitFileDiff[];
  counts?: { additions: number; deletions: number };
  sessionId?: string | null;
  file?: GitFileDiff | null;
};

export async function fetchReview(sessionId?: string, signal?: AbortSignal): Promise<ReviewResponse> {
  const query = sessionId ? `?session=${encodeURIComponent(sessionId)}` : "";
  const response = await fetch(`${REVIEW_API_PATH}${query}`, { signal });
  if (!response.ok) throw new Error("review request failed");
  return await response.json() as ReviewResponse;
}

export async function fetchReviewFile(sessionId: string | undefined, path: string): Promise<GitFileDiff | null> {
  const query = new URLSearchParams({ path });
  if (sessionId) query.set("session", sessionId);
  const response = await fetch(`${REVIEW_API_PATH}?${query.toString()}`);
  if (!response.ok) throw new Error("review file request failed");
  return ((await response.json()) as ReviewResponse).file ?? null;
}
