import { normalizePath } from "../../shared/types.js";

export type OpenTarget = {
  path: string;
  line?: number;
};

export function parseOpenTarget(value: string): OpenTarget {
  const trimmed = value.trim().replace(/\\/g, "/");
  if (!trimmed || trimmed === ".") return { path: "" };

  const hash = /^(.*?)#L(\d+)(?:-L?\d+)?$/i.exec(trimmed);
  if (hash?.[1] && hash[2]) {
    return { path: normalizePath(hash[1]), line: Number(hash[2]) };
  }

  const colon = /^(.*?):(\d+)(?::\d+)?$/.exec(trimmed);
  if (colon?.[1] && colon[2] && !/^[A-Za-z]$/.test(colon[1])) {
    return { path: normalizePath(colon[1]), line: Number(colon[2]) };
  }

  return { path: normalizePath(trimmed) };
}
