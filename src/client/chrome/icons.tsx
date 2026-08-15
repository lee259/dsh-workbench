import React from "react";
import { Check, ChevronRight, ChevronsDownUp, ChevronsUpDown, Copy, FilePlus2, FileText, Folder, FolderOpen, PanelRight, RefreshCw, Search, X, type IconNode } from "lucide";

function renderIcon(icon: IconNode, className: string, size: number, strokeWidth: number) {
  return React.createElement("svg", { className, width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", "stroke-width": strokeWidth, "stroke-linecap": "round", "stroke-linejoin": "round", "aria-hidden": true },
    icon.map(([tag, attrs], index) => React.createElement(tag, { ...attrs, key: index })),
  );
}

export type WorkbenchIconName = "search" | "refresh" | "copy" | "check" | "close" | "folder" | "collapse" | "expand" | "panel";

const ICONS: Record<WorkbenchIconName, IconNode> = {
  search: Search,
  refresh: RefreshCw,
  copy: Copy,
  check: Check,
  close: X,
  folder: Folder,
  collapse: ChevronsDownUp,
  expand: ChevronsUpDown,
  panel: PanelRight,
};

export function Icon({ name }: { name: WorkbenchIconName }) {
  return renderIcon(ICONS[name], "dsh-wb-icon-svg", 14, 1.5);
}

function fileIconKind(path: string): string {
  const extension = path.split(".").pop()?.toLowerCase() ?? "";
  if (["ts", "tsx", "mts", "cts"].includes(extension)) return "ts";
  if (["js", "jsx", "mjs", "cjs"].includes(extension)) return "js";
  if (["json", "yml", "yaml", "toml"].includes(extension)) return "data";
  if (["md", "mdx", "txt"].includes(extension)) return "doc";
  if (["css", "scss", "less"].includes(extension)) return "style";
  return "file";
}

export function TreeChevron({ open, leaf }: { open?: boolean; leaf?: boolean }) {
  return renderIcon(ChevronRight, `dsh-wb-tree-chevron${leaf ? " is-leaf" : ""}${open ? " is-open" : ""}`, 12, 1.5);
}

export function FileTypeIcon({ path, directory, open }: { path: string; directory?: boolean; open?: boolean }) {
  if (directory) {
    return renderIcon(open ? FolderOpen : Folder, "dsh-wb-tree-folder-icon", 14, 1.5);
  }
  return renderIcon(FileText, `dsh-wb-tree-file-icon is-${fileIconKind(path)}`, 14, 1.5);
}

export function EmptyFileIcon() {
  return renderIcon(FileText, "dsh-wb-empty-icon-svg", 28, 1.5);
}

export function NewTabIcon() {
  return renderIcon(FilePlus2, "dsh-wb-tab-icon", 14, 1.5);
}
