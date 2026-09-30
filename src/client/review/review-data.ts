import { REVIEW_API_PATH, type GitFileDiff, type ReviewChange } from "../../shared/types.js";

export type ReviewResponse = {
  changes?: ReviewChange[];
  files?: GitFileDiff[];
  sessionFiles?: GitFileDiff[];
  counts?: { additions: number; deletions: number };
  sessionId?: string | null;
  file?: GitFileDiff | null;
};

export type HarnessChangedFile = {
  path: string;
  display: string;
  added: number;
  deleted: number;
  binary?: true;
  oversized?: true;
};

export type HarnessReviewTurn = {
  turn: number;
  seq: number;
  workspace?: true;
  live?: true;
  total: number;
  added: number;
  deleted: number;
  files: HarnessChangedFile[];
};

export type HarnessReviewResponse = {
  sessionId: string;
  turns: HarnessReviewTurn[];
};

export type HarnessReviewDiff =
  | {
    kind: "text";
    path: string;
    display: string;
    before: boolean;
    after: boolean;
    coarse: boolean;
    hunks: Array<{ oldStart: number; oldLines: number; newStart: number; newLines: number; lines: string[] }>;
  }
  | { kind: "binary"; path: string; display: string }
  | { kind: "oversized"; path: string; display: string };

export async function fetchHarnessReview(sessionId: string, signal?: AbortSignal): Promise<HarnessReviewResponse> {
  const query = new URLSearchParams({ source: "harness", session: sessionId });
  const response = await fetch(`${REVIEW_API_PATH}?${query}`, { signal });
  if (!response.ok) throw new Error("harness review request failed");
  return await response.json() as HarnessReviewResponse;
}

export async function fetchHarnessReviewDiff(sessionId: string, seq: number, index: number, signal?: AbortSignal): Promise<HarnessReviewDiff> {
  const query = new URLSearchParams({ source: "harness", session: sessionId, seq: String(seq), index: String(index) });
  const response = await fetch(`${REVIEW_API_PATH}?${query}`, { signal });
  if (!response.ok) throw new Error("harness review diff request failed");
  return ((await response.json()) as { diff: HarnessReviewDiff }).diff;
}

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

export async function acknowledgeReview(sessionId: string, path: string): Promise<void> {
  const query = `?session=${encodeURIComponent(sessionId)}`;
  const response = await fetch(`${REVIEW_API_PATH}${query}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ action: "acknowledge", path }),
  });
  if (!response.ok) throw new Error("review acknowledge failed");
}

export type ReviewActionErrorCode = "file_changed" | "review_not_discardable" | "file_not_found";

export async function discardReview(sessionId: string, path: string): Promise<void> {
  const query = `?session=${encodeURIComponent(sessionId)}`;
  const response = await fetch(`${REVIEW_API_PATH}${query}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ action: "discard", path }),
  });
  if (response.ok) return;
  let code: ReviewActionErrorCode = "file_not_found";
  try {
    const body = await response.json() as { error?: unknown };
    if (body.error === "file_changed" || body.error === "review_not_discardable" || body.error === "file_not_found") code = body.error;
  } catch { /* Keep the generic action error. */ }
  const error = new Error("review discard failed") as Error & { code: ReviewActionErrorCode };
  error.code = code;
  throw error;
}
