export function Menu(): null {
  return null;
}

export function Tooltip({ children }: { children: unknown }): unknown {
  return children;
}

export async function writeClipboard(text: string): Promise<boolean> {
  await globalThis.navigator?.clipboard?.writeText(text);
  return true;
}

export function HoverCard({ anchor }: { anchor: unknown }): unknown {
  return anchor;
}

export function IconCheckOutline16(): null { return null; }
export function IconChevronRightOutline14(): null { return null; }
export function IconCloseFill14(): null { return null; }
export function IconCodeOutline16(): null { return null; }
export function IconCopyOutline16(): null { return null; }
export function IconFolderOpen16(): null { return null; }
export function IconPlusOutline16(): null { return null; }
export function IconLinkOutline16(): null { return null; }
