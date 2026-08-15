import { mountWorkbenchDrawer } from "../src/client/mount.js";
import { expect, test } from "vitest";

function fakeParent() {
  const nodes = [];
  return {
    nodes,
    querySelector(selector) {
      return nodes.find((node) => node.selector === selector) ?? null;
    },
    ownerDocument: {
      createElement() {
        const node = {
          selector: "[data-dsh-workbench-root]",
          attrs: {},
          setAttribute(name, value) {
            this.attrs[name] = value;
          },
        };
        return node;
      },
    },
    append(node) {
      nodes.push(node);
    },
  };
}

test("mountWorkbenchDrawer renders FileDrawer onto a new host", () => {
  const parent = fakeParent();
  const rendered = [];
  const host = mountWorkbenchDrawer(
    { createElement: (type) => ({ type }) },
    (container) => ({
      render(node) {
        rendered.push({ container, node });
      },
    }),
    "FileDrawer",
    parent,
  );
  expect(parent.nodes.length).toBe(1);
  expect(host).toBe(parent.nodes[0]);
  expect(rendered.length).toBe(1);
  expect(rendered[0].container).toBe(host);
  expect(rendered[0].node.type).toBe("FileDrawer");
});

test("mountWorkbenchDrawer is idempotent", () => {
  const parent = fakeParent();
  const rendered = [];
  const createRoot = (container) => ({
    render(node) {
      rendered.push({ container, node });
    },
  });
  const first = mountWorkbenchDrawer({ createElement: (type) => ({ type }) }, createRoot, "FileDrawer", parent);
  const second = mountWorkbenchDrawer({ createElement: (type) => ({ type }) }, createRoot, "FileDrawer", parent);
  expect(first).toBe(second);
  expect(parent.nodes.length).toBe(1);
  expect(rendered.length).toBe(1);
});