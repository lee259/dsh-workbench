import type { DiskFile } from "./workspace.js";
import type { FilePayload, FileRevision } from "../shared/types.js";

function expandWriteAgainstDisk(disk: string, revision: FileRevision): { content: string; before: string | null } {
  const content = revision.content;
  const before = revision.before;
  if (content === disk || before == null || before === "") return { content, before };
  if (disk.includes(content)) {
    const reversed = disk.replace(content, before);
    if (reversed !== disk) return { content: disk, before: reversed };
  }
  return { content, before };
}

export function toFilePayload(disk: DiskFile, revision: FileRevision | null): FilePayload {
  if (revision?.source === "dsh-write") {
    const expanded = expandWriteAgainstDisk(disk.content, revision);
    return {
      path: disk.path,
      content: expanded.content,
      before: expanded.before,
      source: "dsh-write",
      revision: revision.revision,
      size: disk.size,
    };
  }
  return {
    path: disk.path,
    content: disk.content,
    before: revision?.before ?? null,
    source: revision?.source ?? "workspace",
    revision: revision?.revision ?? 0,
    size: disk.size,
  };
}
