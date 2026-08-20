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

  export const IconCodeOutline16: ComponentType<{ size?: number }>;
  export const IconCopyOutline16: ComponentType<{ size?: number }>;
  export const IconFolderOpen16: ComponentType<{ size?: number }>;
  export const IconLinkOutline16: ComponentType<{ size?: number }>;
}
