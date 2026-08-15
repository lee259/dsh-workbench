import { FILE_TOOLS, normalizePath, type FileToolName } from "../../shared/types.js";

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" ? value as Record<string, unknown> : null;
}

function asString(value: unknown): string | null {
  return typeof value === "string" && value !== "" ? value : null;
}

export function filePathFromArgs(value: unknown): string | undefined {
  if (typeof value === "string") {
    try {
      return filePathFromArgs(JSON.parse(value));
    } catch {
      return undefined;
    }
  }
  const args = asRecord(value);
  if (!args) return undefined;
  const path = asString(args.file_path) ?? asString(args.path);
  return path ? normalizePath(path) : undefined;
}

export function filePathFromBlock(block: unknown): string | undefined {
  const record = asRecord(block);
  if (!record) return undefined;
  const call = asRecord(record.call);
  return filePathFromArgs(
    call?.argsRaw ?? record.argsRaw ?? call?.args ?? record.args ?? call?.arguments ?? record.arguments,
  );
}

export function isFileToolName(name: string | null): name is FileToolName {
  return name !== null && FILE_TOOLS.includes(name as FileToolName);
}
