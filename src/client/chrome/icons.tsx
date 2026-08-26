import { createElement, type ComponentType } from "react";
import {
  IconCheckOutline16,
  IconChevronRightOutline14,
  IconCloseFill14,
  IconCodeOutline16,
  IconCopyOutline16,
  IconFolderOpen16,
  IconPlusOutline16,
} from "@deepseek-ai/dsh-client-ui-primitives";

type PrimitiveIcon = ComponentType<{ size?: number; className?: string }>;

function renderPrimitive(icon: PrimitiveIcon, className: string, size = 16) {
  return createElement(icon, { className, size });
}

export type WorkbenchIconName = "search" | "copy" | "check" | "close" | "folder" | "panel" | "panel-open" | "panel-closed" | "commit";

const ICONS: Record<WorkbenchIconName, PrimitiveIcon> = {
  search: IconSearch16,
  copy: IconCopyOutline16,
  check: IconCheckOutline16,
  close: IconCloseFill14,
  folder: IconFolderOpened16,
  panel: IconPanelRightOutline16,
  "panel-open": IconPanelRightOutline16,
  "panel-closed": IconPanelRightClosed16,
  commit: IconDiffOutline16,
};

export function Icon({ name }: { name: WorkbenchIconName }) {
  return renderPrimitive(ICONS[name], "dsh-wb-icon-svg", 16);
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
  return renderPrimitive(IconChevronRightOutline14, `dsh-wb-tree-chevron${leaf ? " is-leaf" : ""}${open ? " is-open" : ""}`, 14);
}

export function FileTypeIcon({ path, directory, open }: { path: string; directory?: boolean; open?: boolean }) {
  if (directory) {
    return open
      ? createElement(IconFolderOpened16, { className: "dsh-wb-tree-folder-icon is-open", size: 14 })
      : createElement(IconFolder16, { className: "dsh-wb-tree-folder-icon", size: 14 });
  }
  return renderPrimitive(IconCodeOutline16, `dsh-wb-tree-file-icon is-${fileIconKind(path)}`, 14);
}

export function EmptyFileIcon() {
  return renderPrimitive(IconCodeOutline16, "dsh-wb-empty-icon-svg", 28);
}

export function NewTabIcon() {
  return renderPrimitive(IconPlusOutline16, "dsh-wb-tab-icon", 16);
}

export function TreeChangeIcon({ kind }: { kind: "add" | "delete" | "both" }) {
  const icon = kind === "add" ? IconPlusOutline16 : kind === "delete" ? IconMinus16 : IconDiffOutline16;
  return renderPrimitive(icon, `dsh-wb-tree-change-icon is-${kind}`, 14);
}

function IconSearch16({ size = 16, className }: { size?: number; className?: string }) {
  return createElement("svg", { width: size, height: size, className, viewBox: "0 0 16 16", fill: "none", "aria-hidden": true },
    createElement("circle", { cx: 7, cy: 7, r: 4.75, stroke: "currentColor", strokeWidth: 1.5 }),
    createElement("path", { d: "m10.5 10.5 3 3", stroke: "currentColor", strokeWidth: 1.5, strokeLinecap: "round" }),
  );
}

function IconMinus16({ size = 16, className }: { size?: number; className?: string }) {
  return createElement("svg", { width: size, height: size, className, viewBox: "0 0 16 16", fill: "none", "aria-hidden": true },
    createElement("path", { d: "M3.5 8h9", stroke: "currentColor", strokeWidth: 1.5, strokeLinecap: "round" }),
  );
}

function IconDiffOutline16({ size = 16, className }: { size?: number; className?: string }) {
  return createElement("svg", { width: size, height: size, className, viewBox: "0 0 16 16", fill: "none", "aria-hidden": true },
    createElement("rect", { x: 1.5, y: 1.5, width: 13, height: 13, rx: 2.5, stroke: "currentColor", strokeWidth: 1.5 }),
    createElement("path", { d: "M4 5h3M5.5 3.5v3M9.5 12.5h2.5", stroke: "currentColor", strokeWidth: 1.5, strokeLinecap: "round" }),
  );
}

function IconPanelRightOutline16({ size = 16, className }: { size?: number; className?: string }) {
  return createElement("svg", { width: size, height: size, className, viewBox: "0 0 16 16", fill: "none", "aria-hidden": true },
    createElement("rect", { x: 1.5, y: 2, width: 13, height: 12, rx: 2.5, stroke: "currentColor", strokeWidth: 1.5 }),
    createElement("rect", { x: 10.5, y: 3.25, width: 2.75, height: 9.5, rx: 1, fill: "currentColor" }),
  );
}

function IconPanelRightClosed16({ size = 16, className }: { size?: number; className?: string }) {
  return createElement("svg", { width: size, height: size, className, viewBox: "0 0 16 16", fill: "none", "aria-hidden": true },
    createElement("rect", { x: 1.5, y: 2, width: 13, height: 12, rx: 2.5, stroke: "currentColor", strokeWidth: 1.5 }),
    createElement("path", { d: "M10.5 5.5 8 8l2.5 2.5", stroke: "currentColor", strokeWidth: 1.5, strokeLinecap: "round", strokeLinejoin: "round" }),
  );
}

function IconFolder16({ size = 16, className }: { size?: number; className?: string }) {
  return createElement("svg", { width: size, height: size, className, viewBox: "0 0 16 16", fill: "none", "aria-hidden": true },
    createElement("path", { d: "M1.75 4.25c0-.69.56-1.25 1.25-1.25h3l1.25 1.5h6.75c.69 0 1.25.56 1.25 1.25v6.75c0 .69-.56 1.25-1.25 1.25H3c-.69 0-1.25-.56-1.25-1.25V4.25Z", stroke: "currentColor", strokeWidth: 1.5, strokeLinejoin: "round" }),
  );
}

function IconFolderOpened16({ size = 16, className }: { size?: number; className?: string }) {
  return createElement("svg", { width: size, height: size, className, viewBox: "0 0 16 16", fill: "none", "aria-hidden": true },
    createElement("path", { d: "M1.75 4.25c0-.69.56-1.25 1.25-1.25h3l1.25 1.5h6.75c.69 0 1.25.56 1.25 1.25v.75H3.4l-1.65 6.25V4.25Z", stroke: "currentColor", strokeWidth: 1.5, strokeLinejoin: "round" }),
    createElement("path", { d: "M3.4 6.5h10.35l-1.4 5.05c-.15.55-.65.95-1.22.95H2.9c-.76 0-1.3-.72-1.1-1.45L3.4 6.5Z", stroke: "currentColor", strokeWidth: 1.5, strokeLinejoin: "round" }),
  );
}
