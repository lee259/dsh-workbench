import assert from "node:assert/strict";
import test from "node:test";
import { createWorkbenchUi } from "../lib/client/ui.js";
import { createLocaleStore } from "../lib/shared/i18n.js";
import { createFileStore } from "../lib/client/store.js";

const Fragment = Symbol("Fragment");
const React = {
  Fragment,
  createElement(type, props, ...children) {
    return { type, props: { ...(props ?? {}), children: children.length === 1 ? children[0] : children } };
  },
  useSyncExternalStore(_subscribe, getSnapshot) {
    return getSnapshot();
  },
  useState(initial) {
    let value = typeof initial === "function" ? initial() : initial;
    return [value, (next) => {
      value = typeof next === "function" ? next(value) : next;
    }];
  },
  useEffect() {},
  useRef(initial) {
    return { current: initial };
  },
  useCallback(fn) {
    return fn;
  },
};

function findElement(node, predicate) {
  if (node == null || typeof node === "boolean") return undefined;
  if (Array.isArray(node)) {
    for (const child of node) {
      const found = findElement(child, predicate);
      if (found) return found;
    }
    return undefined;
  }
  if (typeof node !== "object") return undefined;
  if (predicate(node)) return node;
  const children = node.props?.children;
  for (const child of Array.isArray(children) ? children : [children]) {
    const found = findElement(child, predicate);
    if (found) return found;
  }
  return undefined;
}

function findElements(node, predicate, matches = []) {
  if (node == null || typeof node === "boolean") return matches;
  if (Array.isArray(node)) {
    for (const child of node) findElements(child, predicate, matches);
    return matches;
  }
  if (typeof node !== "object") return matches;
  if (predicate(node)) matches.push(node);
  const children = node.props?.children;
  for (const child of Array.isArray(children) ? children : [children]) findElements(child, predicate, matches);
  return matches;
}

function textContent(node) {
  if (node == null || typeof node === "boolean") return "";
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (typeof node !== "object") return "";
  const children = node.props?.children;
  return (Array.isArray(children) ? children : [children]).map(textContent).join("");
}

function toolRow(toolName, store) {
  const ui = createWorkbenchUi(React, store, createLocaleStore("en"));
  return ui.FileToolRow({
    toolName,
    block: { argsRaw: JSON.stringify({ file_path: "src/example.ts" }), kind: "tool-result" },
  });
}

test("workbench toggle opens and closes the panel", async () => {
  const store = createFileStore(async (path) => ({
    path,
    content: path,
    before: null,
    source: "workspace",
    revision: 0,
    size: 1,
  }));
  const ui = createWorkbenchUi(React, store, createLocaleStore("en"));
  const toggle = ui.WorkbenchToggle();
  assert.equal(toggle.type, "button");
  assert.equal(toggle.props["aria-label"], "Show sidebar");
  toggle.props.onClick();
  assert.equal(store.getSnapshot().visible, true);
  const openedToggle = ui.WorkbenchToggle();
  assert.equal(openedToggle.props["aria-label"], "Hide sidebar");
  openedToggle.props.onClick();
  assert.equal(store.getSnapshot().visible, false);
});

test("file drawer close button hides the panel", async () => {
  const store = createFileStore(async (path) => ({
    path,
    content: path,
    before: null,
    source: "workspace",
    revision: 0,
    size: 1,
  }));
  await store.open("src/example.ts");
  const ui = createWorkbenchUi(React, store, createLocaleStore("en"));
  const close = findElement(ui.FileDrawer(), (node) => node.props?.className?.includes("dsh-wb-close-button"));
  assert.ok(close);
  assert.equal(close.props["aria-label"], "Close");
  close.props.onClick();
  assert.equal(store.getSnapshot().visible, false);
});

test("file drawer tabs activate and close individual files", async () => {
  const store = createFileStore(async (path) => ({
    path,
    content: path,
    before: null,
    source: "workspace",
    revision: 0,
    size: 1,
  }));
  await store.open("a.ts");
  await store.open("b.ts");
  const ui = createWorkbenchUi(React, store, createLocaleStore("en"));
  const drawer = ui.FileDrawer();
  const tabs = findElements(drawer, (node) => node.props?.role === "tab");
  assert.equal(tabs.length, 2);
  tabs[0].props.onClick();
  await Promise.resolve();
  assert.equal(store.getSnapshot().active, "a.ts");

  const closeButtons = findElements(drawer, (node) => node.props?.className === "dsh-wb-tab-close");
  assert.equal(closeButtons.length, 2);
  closeButtons[0].props.onClick();
  assert.deepEqual(store.getSnapshot().open, ["b.ts"]);
  assert.equal(store.getSnapshot().active, "b.ts");
});

test("file drawer tabs distinguish read views from captured diffs", async () => {
  const store = createFileStore(async (path) => ({
    path,
    content: path,
    before: path === "a.ts" ? "old" : null,
    source: path === "a.ts" ? "dsh-write" : "workspace",
    revision: path === "a.ts" ? 1 : 0,
    size: 1,
  }));
  await store.open("a.ts");
  await store.open("b.ts", "view");
  const ui = createWorkbenchUi(React, store, createLocaleStore("en"));
  const tabs = findElements(ui.FileDrawer(), (node) => typeof node.props?.className === "string" && node.props.className.split(/\s+/).includes("dsh-wb-tab"));
  assert.equal(tabs.length, 2);
  assert.match(tabs[0].props.className, /\bis-diff\b/);
  assert.match(tabs[1].props.className, /\bis-view\b/);
  assert.match(tabs[1].props.className, /\bis-active\b/);
  assert.match(textContent(tabs[0]), /diff/);
});

test("file drawer marks the transient preview tab", async () => {
  const store = createFileStore(async (path) => ({
    path,
    content: path,
    before: null,
    source: "workspace",
    revision: 0,
    size: 1,
  }));
  await store.open("a.ts", "view", undefined, false, "keep");
  await store.open("b.ts", "view", undefined, false, "preview");
  const ui = createWorkbenchUi(React, store, createLocaleStore("en"));
  const tabs = findElements(ui.FileDrawer(), (node) => typeof node.props?.className === "string" && node.props.className.split(/\s+/).includes("dsh-wb-tab"));
  assert.equal(tabs.length, 2);
  assert.doesNotMatch(tabs[0].props.className, /\bis-preview\b/);
  assert.match(tabs[1].props.className, /\bis-preview\b/);
});

test("file drawer tabs expose active and close states", async () => {
  const store = createFileStore(async (path) => ({
    path,
    content: path,
    before: null,
    source: "workspace",
    revision: 0,
    size: 1,
  }));
  await store.open("a.ts");
  await store.open("b.ts");
  const ui = createWorkbenchUi(React, store, createLocaleStore("en"));
  const drawer = ui.FileDrawer();
  const tabs = findElements(drawer, (node) => node.props?.role === "tab");
  assert.deepEqual(tabs.map((node) => node.props["aria-selected"]), [false, true]);
  const closes = findElements(drawer, (node) => node.props?.className === "dsh-wb-tab-close");
  assert.deepEqual(closes.map((node) => node.props["aria-label"]), ["Close file: a.ts", "Close file: b.ts"]);
});

test("file drawer renders read payloads as workspace views", async () => {
  const store = createFileStore(async (path) => ({
    path,
    content: "const value = 1;",
    before: "const value = 0;",
    source: "dsh-write",
    revision: 1,
    size: 16,
  }));
  await store.open("src/example.ts", "view");
  const ui = createWorkbenchUi(React, store, createLocaleStore("en"));
  const text = textContent(ui.FileDrawer());
  assert.match(text, /1 lines · workspace/);
  assert.match(text, /Read-only · current workspace content/);
  assert.doesNotMatch(text, /DSH write diff/);
});

test("file drawer renders edit payloads as diffs", async () => {
  const store = createFileStore(async (path) => ({
    path,
    content: "const value = 1;",
    before: "const value = 0;",
    source: "dsh-write",
    revision: 1,
    size: 16,
  }));
  await store.open("src/example.ts", "diff");
  const ui = createWorkbenchUi(React, store, createLocaleStore("en"));
  const text = textContent(ui.FileDrawer());
  assert.match(text, /1 lines · DSH write diff/);
  assert.match(text, /Read-only · from DSH write\/edit output/);
});

test("file drawer refreshes the active file", async () => {
  let calls = 0;
  const store = createFileStore(async (path) => {
    calls += 1;
    return { path, content: `version-${calls}`, before: null, source: "workspace", revision: calls - 1, size: 9 };
  });
  await store.open("src/example.ts");
  const ui = createWorkbenchUi(React, store, createLocaleStore("en"));
  const refresh = findElement(ui.FileDrawer(), (node) => node.props?.title === "Refresh file");
  assert.ok(refresh);
  refresh.props.onClick();
  await Promise.resolve();
  assert.equal(calls, 2);
  assert.equal(store.getSnapshot().payload?.content, "version-2");
});

test("file drawer copies content and path", async () => {
  const copied = [];
  const clipboard = { writeText: async (value) => copied.push(value) };
  const originalNavigator = globalThis.navigator;
  const originalWindow = globalThis.window;
  Object.defineProperty(globalThis, "navigator", { configurable: true, value: { clipboard } });
  Object.defineProperty(globalThis, "window", { configurable: true, value: { setTimeout } });
  try {
    const store = createFileStore(async (path) => ({
      path,
      content: "const value = 1;",
      before: null,
      source: "workspace",
      revision: 0,
      size: 16,
    }));
    await store.open("src/example.ts");
    const ui = createWorkbenchUi(React, store, createLocaleStore("en"));
    const drawer = ui.FileDrawer();
    const copyContent = findElement(drawer, (node) => node.props?.title === "Copy");
    const copyPath = findElement(drawer, (node) => node.props?.className === "dsh-wb-path");
    assert.ok(copyContent);
    assert.ok(copyPath);
    copyContent.props.onClick();
    copyPath.props.onClick();
    await Promise.resolve();
    await Promise.resolve();
    assert.deepEqual(copied, ["const value = 1;", "src/example.ts"]);
  } finally {
    Object.defineProperty(globalThis, "navigator", { configurable: true, value: originalNavigator });
    Object.defineProperty(globalThis, "window", { configurable: true, value: originalWindow });
  }
});

test("file drawer resize handle supports keyboard steps and reset", async () => {
  let width = 600;
  let stateCalls = 0;
  const TrackedReact = {
    ...React,
    useState(initial) {
      if (stateCalls++ === 0) {
        return [width, (next) => {
          width = typeof next === "function" ? next(width) : next;
        }];
      }
      return React.useState(initial);
    },
  };
  const store = createFileStore(async (path) => ({
    path,
    content: path,
    before: null,
    source: "workspace",
    revision: 0,
    size: 1,
  }));
  await store.open("src/example.ts");
  const ui = createWorkbenchUi(TrackedReact, store, createLocaleStore("en"));
  const separator = findElement(ui.FileDrawer(), (node) => node.props?.role === "separator");
  assert.ok(separator);
  separator.props.onKeyDown({ key: "ArrowLeft", preventDefault() {} });
  assert.equal(width, 616);
  separator.props.onDoubleClick();
  assert.equal(width, 600);
});

test("file drawer shows a read error without stale content", async () => {
  const store = createFileStore(async () => {
    throw new Error("file_not_found");
  });
  await store.open("missing.ts");
  const ui = createWorkbenchUi(React, store, createLocaleStore("en"));
  const text = textContent(ui.FileDrawer());
  assert.match(text, /Failed to read/);
  assert.doesNotMatch(text, /missing content/);
});

test("file drawer shows a loading state while reading", async () => {
  let finish;
  const pending = new Promise((resolve) => { finish = resolve; });
  const store = createFileStore(async (path) => {
    await pending;
    return { path, content: "ready", before: null, source: "workspace", revision: 0, size: 5 };
  });
  const opening = store.open("slow.ts");
  const ui = createWorkbenchUi(React, store, createLocaleStore("en"));
  assert.match(textContent(ui.FileDrawer()), /Reading…/);
  finish();
  await opening;
  assert.match(textContent(ui.FileDrawer()), /1 lines · workspace/);
});

test("workbench controls follow the active locale", async () => {
  const store = createFileStore(async (path) => ({
    path,
    content: path,
    before: null,
    source: "workspace",
    revision: 0,
    size: 1,
  }));
  const locale = createLocaleStore("zh");
  const ui = createWorkbenchUi(React, store, locale);
  const toggle = ui.WorkbenchToggle();
  assert.equal(toggle.props["aria-label"], "显示侧边栏");
  await store.open("src/example.ts");
  const close = findElement(ui.FileDrawer(), (node) => node.props?.className?.includes("dsh-wb-close-button"));
  assert.ok(close);
  assert.equal(close.props["aria-label"], "关闭");
});

test("workbench controls expose accurate accessibility state", async () => {
  const store = createFileStore(async (path) => ({
    path,
    content: path,
    before: null,
    source: "workspace",
    revision: 0,
    size: 1,
  }));
  const ui = createWorkbenchUi(React, store, createLocaleStore("en"));
  const toggle = ui.WorkbenchToggle();
  assert.equal(toggle.props["aria-expanded"], false);
  assert.equal(toggle.props["data-open"], "false");
  assert.match(toggle.props.title, /Shortcut/);
  await store.open("src/example.ts");
  const separator = findElement(ui.FileDrawer(), (node) => node.props?.role === "separator");
  assert.ok(separator);
  assert.equal(separator.props["aria-valuemin"], 520);
  assert.equal(separator.props["aria-valuemax"], 900);
  assert.equal(separator.props["aria-valuenow"], 600);
});

test("file drawer plus button and breadcrumbs are wired", async () => {
  const store = createFileStore(async (path) => ({
    path,
    content: path,
    before: null,
    source: "workspace",
    revision: 0,
    size: 1,
  }));
  await store.open("src/client/ui.tsx");
  const ui = createWorkbenchUi(React, store, createLocaleStore("en"));
  const drawer = ui.FileDrawer();
  const add = findElement(drawer, (node) => node.props?.className === "dsh-wb-tabbar-add");
  assert.ok(add);
  assert.equal(typeof add.props.onClick, "function");
  add.props.onClick();
  const decorative = findElement(drawer, (node) => node.props?.className === "dsh-wb-tabbar-active");
  assert.equal(decorative, undefined);
  const segments = findElements(drawer, (node) => node.props?.className?.includes("dsh-wb-path-segment"));
  assert.ok(segments.length >= 3);
  assert.ok(segments.every((node) => typeof node.props.onClick === "function"));
  const treeToggle = findElement(drawer, (node) => node.props?.["aria-label"] === "Hide file tree");
  assert.ok(treeToggle);
  assert.equal(treeToggle.props["aria-pressed"], true);
  const panel = findElement(drawer, (node) => typeof node.props?.onResize === "function");
  assert.ok(panel);
  const tree = panel.type(panel.props);
  assert.equal(findElement(tree, (node) => node.props?.["aria-label"] === "Hide file tree"), undefined);
  assert.ok(findElement(tree, (node) => node.props?.["aria-label"] === "Collapse folders"));
  assert.equal(findElement(drawer, (node) => node.props?.className === "dsh-wb-tree-rail"), undefined);
});

test("file drawer shows the workspace tree by default", () => {
  const store = createFileStore(async (path) => ({
    path,
    content: path,
    before: null,
    source: "workspace",
    revision: 0,
    size: 1,
  }));
  store.show();
  const ui = createWorkbenchUi(React, store, createLocaleStore("en"));
  const drawer = ui.FileDrawer();
  assert.ok(findElement(drawer, (node) => typeof node.props?.onResize === "function"));
  assert.ok(findElement(drawer, (node) => node.props?.["aria-label"] === "Hide file tree"));
  assert.equal(findElement(drawer, (node) => node.props?.className === "dsh-wb-tree-rail"), undefined);
});

test("file actions expose accessible labels", async () => {
  const store = createFileStore(async (path) => ({
    path,
    content: path,
    before: null,
    source: "workspace",
    revision: 0,
    size: 1,
  }));
  await store.open("src/example.ts");
  const ui = createWorkbenchUi(React, store, createLocaleStore("en"));
  const buttons = findElements(ui.FileDrawer(), (node) => node.type === "button");
  assert.ok(buttons.some((node) => node.props["aria-label"] === "Refresh file"));
  assert.ok(buttons.some((node) => node.props["aria-label"] === "Copy"));
  assert.ok(buttons.some((node) => node.props["aria-label"] === "Close"));
  const pathButton = findElement(ui.FileDrawer(), (node) => node.props?.className === "dsh-wb-path");
  assert.ok(pathButton);
  assert.equal(pathButton.props["aria-label"], "Copy file path");
});

test("real read tool row opens a view", async () => {
  const modes = [];
  const store = createFileStore(async (path, mode) => {
    modes.push(mode);
    return { path, content: "const value = 1;", before: null, source: "workspace", revision: 0, size: 16 };
  });
  const button = findElement(toolRow("read", store), (node) => node.type === "button");
  assert.ok(button);
  button.props.onClick({ preventDefault() {}, stopPropagation() {} });
  await Promise.resolve();
  assert.deepEqual(modes, ["view"]);
  assert.equal(store.getSnapshot().payload?.source, "workspace");
});

test("real edit tool row opens a diff", async () => {
  const modes = [];
  const store = createFileStore(async (path, mode) => {
    modes.push(mode);
    return { path, content: "const value = 2;", before: "const value = 1;", source: "dsh-write", revision: 1, size: 16 };
  });
  const button = findElement(toolRow("edit", store), (node) => node.type === "button");
  assert.ok(button);
  button.props.onClick({ preventDefault() {}, stopPropagation() {} });
  await Promise.resolve();
  assert.deepEqual(modes, ["diff"]);
  assert.equal(store.getSnapshot().payload?.source, "dsh-write");
});
