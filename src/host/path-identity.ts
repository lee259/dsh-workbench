import { isAbsolute, relative, resolve } from "node:path";
import { normalizePath, type WorkspaceErrorCode } from "../shared/types.js";

export type PathError = {
  ok: false;
  status: 400;
  error: Extract<WorkspaceErrorCode, "missing_path">;
};

export type IdentifiedPath = {
  ok: true;
  absolute: string;
  display: string;
};

export type PathIdentity = {
  identify(requested: string): IdentifiedPath | PathError;
};

export function createPathIdentity(root: string): PathIdentity {
  const base = resolve(root);

  return {
    identify(requested) {
      const trimmed = requested.trim();
      if (!trimmed || trimmed.includes("\0")) {
        return { ok: false, status: 400, error: "missing_path" };
      }

      const absolute = isAbsolute(trimmed) ? resolve(trimmed) : resolve(base, trimmed);
      const rel = relative(base, absolute);
      const display = !rel || rel.startsWith("..") ? normalizePath(absolute) : normalizePath(rel);
      return { ok: true, absolute, display };
    },
  };
}
