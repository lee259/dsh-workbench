export type ReviewRequest = { path: string; focus: boolean };

export function reviewRequest(detail: unknown): ReviewRequest {
  if (typeof detail === "string") return { path: detail, focus: true };
  if (!detail || typeof detail !== "object") return { path: "", focus: true };
  const value = detail as { path?: unknown; focus?: unknown };
  return {
    path: typeof value.path === "string" ? value.path : "",
    focus: value.focus !== false,
  };
}
