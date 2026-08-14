type CreateElement = (type: unknown) => unknown;

type Root = {
  render(node: unknown): void;
};

export type DrawerParent = {
  querySelector(selector: string): Element | null;
  append(node: Node): void;
  ownerDocument: Pick<Document, "createElement">;
};

const HOST_ATTR = "data-dsh-workbench-root";

export function mountWorkbenchDrawer(
  React: { createElement: CreateElement },
  createRoot: (container: Element) => Root,
  FileDrawer: unknown,
  parent: DrawerParent,
): Element {
  const existing = parent.querySelector(`[${HOST_ATTR}]`);
  if (existing) return existing;
  const host = parent.ownerDocument.createElement("div");
  host.setAttribute(HOST_ATTR, "");
  parent.append(host);
  createRoot(host).render(React.createElement(FileDrawer));
  return host;
}