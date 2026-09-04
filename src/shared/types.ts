export const FILE_API_PATH = "/api/dsh-workbench/file";
export const FILE_ASSET_API_PATH = "/api/dsh-workbench/asset";
export const SYSTEM_OPEN_API_PATH = "/api/dsh-workbench/system-open";
export const FILES_API_PATH = "/api/dsh-workbench/files";
export const CONTENT_SEARCH_API_PATH = "/api/dsh-workbench/search";
export const ACTIVITY_API_PATH = "/api/dsh-workbench/activity";
export const REVIEW_API_PATH = "/api/dsh-workbench/review";
export const GIT_DIFF_API_PATH = "/api/dsh-workbench/git-diff";
export const GIT_STATUS_API_PATH = "/api/dsh-workbench/git-status";
export const WORKSPACE_API_PATH = "/api/dsh-workbench/workspace";
export const EVENTS_API_PATH = "/api/dsh-workbench/events";
export const MAX_PREVIEW_BYTES = 800_000;
export const MAX_IMAGE_PREVIEW_BYTES = 12_000_000;

export type WorkspaceErrorCode =
  | "missing_path"
  | "not_previewable"
  | "file_too_large"
  | "file_not_found"
  | "file_changed";
export const FILE_TOOLS = ["read", "write", "edit"] as const;

export type FileToolName = (typeof FILE_TOOLS)[number];
export type FileSource = "workspace" | "dsh-read" | "dsh-write";
export type FileOpenMode = "auto" | "view" | "diff";

export type FilePayload = {
  path: string;
  content: string;
  before: string | null;
  source: FileSource;
  revision: number;
  size: number;
};

export type WorkspaceFile = {
  path: string;
  size: number;
};

export type WorkspaceTree = {
  files: WorkspaceFile[];
  directories: string[];
};

export type ContentSearchHit = {
  path: string;
  line: number;
  column: number;
  text: string;
};

export type FileRevision = {
  path: string;
  before: string | null;
  content: string;
  revision: number;
  sessionId: string;
  source: Exclude<FileSource, "workspace">;
};

export type ReviewChange = {
  path: string;
  sessionId: string;
  revision: number;
  summary: string;
  additions: number;
  deletions: number;
};

export type GitFileDiff = {
  path: string;
  before: string | null;
  content: string;
  additions: number;
  deletions: number;
};
export type GitStatus = { branch: string; unstaged: number; staged: number; untracked: number };

export type ReviewScope = "session" | "uncommitted" | "unstaged" | "staged";

export type ActivityKind = "tool" | "code";
export type ActivityStatus = "running" | "done" | "error";

export type ActivityRecord = {
  id: string;
  sessionId: string;
  kind: ActivityKind;
  name: string;
  path: string | null;
  summary: string | null;
  status: ActivityStatus;
  createdAt: number;
  finishedAt: number | null;
};

export function isFileTool(name: string): name is FileToolName {
  return FILE_TOOLS.includes(name as FileToolName);
}

export function normalizePath(path: string): string {
  return path.replace(/^\.\//, "").replace(/\\/g, "/");
}
