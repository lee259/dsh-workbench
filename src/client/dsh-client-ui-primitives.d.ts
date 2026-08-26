declare module "@deepseek-ai/dsh-client-ui-primitives" {
  import type { ComponentType, ReactNode } from "react";

  export const Menu: ComponentType<{
    open: boolean;
    onClose?: () => void;
    items: readonly unknown[];
    onSelect?: (id: string) => void;
    portal?: boolean;
    compact?: boolean;
    align?: "start" | "center" | "end";
    getAnchorRect?: () => DOMRect | null;
    anchor: ReactNode;
  }>;

  export const Tooltip: ComponentType<{
    label: string;
    side?: "top" | "right" | "bottom" | "left";
    delayMs?: number;
    children: ReactNode;
  }>;

  export function writeClipboard(text: string): Promise<boolean>;

  export const HoverCard: ComponentType<{
    anchor: ReactNode;
    content: ReactNode;
    openDelayMs?: number;
    copyText?: string;
    copyLabel?: string;
    copiedLabel?: string;
  }>;

  export const IconCheckOutline16: ComponentType<{ size?: number; className?: string }>;
  export const IconChevronRightOutline14: ComponentType<{ size?: number; className?: string }>;
  export const IconCloseFill14: ComponentType<{ size?: number; className?: string }>;
  export const IconCodeOutline16: ComponentType<{ size?: number; className?: string }>;
  export const IconCopyOutline16: ComponentType<{ size?: number; className?: string }>;
  export const IconFolderOpen16: ComponentType<{ size?: number; className?: string }>;
  export const IconPlusOutline16: ComponentType<{ size?: number; className?: string }>;
  export const IconLinkOutline16: ComponentType<{ size?: number; className?: string }>;
}
