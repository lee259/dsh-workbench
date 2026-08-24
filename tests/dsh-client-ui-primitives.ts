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

export function IconCodeOutline16(): null { return null; }
export function IconCopyOutline16(): null { return null; }
export function IconFolderOpen16(): null { return null; }
export function IconLinkOutline16(): null { return null; }
