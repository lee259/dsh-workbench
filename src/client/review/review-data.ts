import { REVIEW_API_PATH, type ReviewChange } from "../../shared/types.js";

export type ReviewResponse = {
  changes?: ReviewChange[];
  sessionId?: string | null;
};

export async function fetchReview(sessionId?: string): Promise<ReviewResponse> {
  const query = sessionId ? `?session=${encodeURIComponent(sessionId)}` : "";
  const response = await fetch(`${REVIEW_API_PATH}${query}`);
  if (!response.ok) throw new Error("review request failed");
  return await response.json() as ReviewResponse;
}
