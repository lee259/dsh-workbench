import assert from "node:assert/strict";
import test from "node:test";
import { mountWorkbenchDrawer } from "../lib/client/mount.js";

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
  assert.equal(parent.nodes.length, 1);
  assert.equal(host, parent.nodes[0]);
  assert.equal(rendered.length, 1);
  assert.equal(rendered[0].container, host);
  assert.equal(rendered[0].node.type, "FileDrawer");
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
  assert.equal(first, second);
  assert.equal(parent.nodes.length, 1);
  assert.equal(rendered.length, 1);
});