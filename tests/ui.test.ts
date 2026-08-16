import { createWorkbenchUi } from "../src/client/ui.js";
import { createLocaleStore } from "../src/shared/i18n.js";
import { createFileStore } from "../src/client/store.js";
import { expect, test } from "vitest";

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
  if (typeof node.type === "function") return findElement(node.type(node.props ?? {}), predicate);
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
  if (typeof node.type === "function") return findElements(node.type(node.props ?? {}), predicate, matches);
  if (predicate(node)) matches.push(node);
  const children = node.props?.children;
  for (const child of Array.isArray(children) ? children : [children]) findElements(child, predicate, matches);
  return matches;
}

function textContent(node) {
  if (node == null || typeof node === "boolean") return "";
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (typeof node !== "object") return "";
  if (typeof node.type === "function") return textContent(node.type(node.props ?? {}));
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

function collectSlotRegistrations(ui) {
  const registrations = [];
  ui.apply({
    slots: {
      inject(_name, factory) {
        const result = factory();
        if (result && typeof result.next === "function") {
          for (const _item of result) {}
        }
      },
      register(slot, component) {
        registrations.push({ slot, component });
        return () => {};
      },
    },
  });
  return registrations;
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
  const toggle = findElement(ui.WorkbenchToggle(), (node) => node.type === "button");
  expect(toggle.type).toBe("button");
  expect(toggle.props["aria-label"]).toBe("Show sidebar");
  toggle.props.onClick();
  expect(store.getSnapshot().visible).toBe(true);
  const openedToggle = findElement(ui.WorkbenchToggle(), (node) => node.type === "button");
  expect(openedToggle.props["aria-label"]).toBe("Hide sidebar");
  openedToggle.props.onClick();
  expect(store.getSnapshot().visible).toBe(false);
});

test("apply registers the header utility beside Session log", () => {
  const store = createFileStore(async (path) => ({
    path,
    content: path,
    before: null,
    source: "workspace",
    revision: 0,
    size: 1,
  }));
  const ui = createWorkbenchUi(React, store, createLocaleStore("en"));
  const header = collectSlotRegistrations(ui).find((entry) => entry.slot.name === "conversation.session.header.utilities");
  expect(header).toBeTruthy();
  expect(header.slot.id).toBe("dsh-workbench");
  expect(header.component).toBe(ui.WorkbenchToggle);
  expect(findElement(ui.WorkbenchRoot(), (node) => node.props?.className === "dsh-wb-toggle")).toBe(undefined);
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
  expect(close).toBeTruthy();
  expect(close.props["aria-label"]).toBe("Close");
  close.props.onClick();
  expect(store.getSnapshot().visible).toBe(false);
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
  expect(tabs.length).toBe(2);
  tabs[0].props.onClick();
  await Promise.resolve();
  expect(store.getSnapshot().active).toBe("a.ts");

  const closeButtons = findElements(drawer, (node) => node.props?.className === "dsh-wb-tab-close");
  expect(closeButtons.length).toBe(2);
  closeButtons[0].props.onClick();
  expect(store.getSnapshot().open).toEqual(["b.ts"]);
  expect(store.getSnapshot().active).toBe("b.ts");
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
  expect(tabs.length).toBe(2);
  expect(tabs[0].props.className).toMatch(/\bis-diff\b/);
  expect(tabs[1].props.className).toMatch(/\bis-view\b/);
  expect(tabs[1].props.className).toMatch(/\bis-active\b/);
  expect(textContent(tabs[0])).toMatch(/diff/);
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
  expect(tabs.length).toBe(2);
  expect(tabs[0].props.className).not.toMatch(/\bis-preview\b/);
  expect(tabs[1].props.className).toMatch(/\bis-preview\b/);
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
  expect(tabs.map((node) => node.props["aria-selected"])).toEqual([false, true]);
  const closes = findElements(drawer, (node) => node.props?.className === "dsh-wb-tab-close");
  expect(closes.map((node) => node.props["aria-label"])).toEqual(["Close file: a.ts", "Close file: b.ts"]);
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
  expect(text).toMatch(/1 lines · workspace/);
  expect(text).toMatch(/Read-only · current workspace content/);
  expect(text).not.toMatch(/DSH write diff/);
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
  expect(text).toMatch(/1 lines · DSH write diff/);
  expect(text).toMatch(/Read-only · from DSH write\/edit output/);
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
  expect(refresh).toBeTruthy();
  refresh.props.onClick();
  await Promise.resolve();
  expect(calls).toBe(2);
  expect(store.getSnapshot().payload?.content).toBe("version-2");
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
    expect(copyContent).toBeTruthy();
    expect(copyPath).toBeTruthy();
    copyContent.props.onClick();
    copyPath.props.onClick();
    await Promise.resolve();
    await Promise.resolve();
    expect(copied).toEqual(["const value = 1;", "src/example.ts"]);
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
  expect(separator).toBeTruthy();
  separator.props.onKeyDown({ key: "ArrowLeft", preventDefault() {} });
  expect(width).toBe(616);
  separator.props.onDoubleClick();
  expect(width).toBe(600);
});

test("file drawer shows a read error without stale content", async () => {
  const store = createFileStore(async () => {
    throw new Error("file_not_found");
  });
  await store.open("missing.ts");
  const ui = createWorkbenchUi(React, store, createLocaleStore("en"));
  const text = textContent(ui.FileDrawer());
  expect(text).toMatch(/Failed to read/);
  expect(text).not.toMatch(/missing content/);
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
  expect(textContent(ui.FileDrawer())).toMatch(/Reading…/);
  finish();
  await opening;
  expect(textContent(ui.FileDrawer())).toMatch(/1 lines · workspace/);
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
  const toggle = findElement(ui.WorkbenchToggle(), (node) => node.type === "button");
  expect(toggle.props["aria-label"]).toBe("显示侧边栏");
  await store.open("src/example.ts");
  const close = findElement(ui.FileDrawer(), (node) => node.props?.className?.includes("dsh-wb-close-button"));
  expect(close).toBeTruthy();
  expect(close.props["aria-label"]).toBe("关闭");
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
  const toggle = findElement(ui.WorkbenchToggle(), (node) => node.type === "button");
  expect(toggle.props["aria-expanded"]).toBe(false);
  expect(toggle.props["data-open"]).toBe("false");
  expect(toggle.props.title).toMatch(/Shortcut/);
  expect(toggle.props.children[1].type).toBe("span");
  expect(toggle.props.children[2].props.name).toBe("panel");
  await store.open("src/example.ts");
  const separator = findElement(ui.FileDrawer(), (node) => node.props?.role === "separator");
  expect(separator).toBeTruthy();
  expect(separator.props["aria-valuemin"]).toBe(520);
  expect(separator.props["aria-valuemax"]).toBe(900);
  expect(separator.props["aria-valuenow"]).toBe(600);
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
  expect(add).toBeTruthy();
  expect(typeof add.props.onClick).toBe("function");
  add.props.onClick();
  const decorative = findElement(drawer, (node) => node.props?.className === "dsh-wb-tabbar-active");
  expect(decorative).toBe(undefined);
  const segments = findElements(drawer, (node) => node.props?.className?.includes("dsh-wb-path-segment"));
  expect(segments.length >= 3).toBeTruthy();
  expect(segments.every((node) => typeof node.props.onClick === "function")).toBeTruthy();
  const treeToggle = findElement(drawer, (node) => node.props?.["aria-label"] === "Hide file tree");
  expect(treeToggle).toBeTruthy();
  expect(treeToggle.props["aria-pressed"]).toBe(true);
  expect(findElement(drawer, (node) => node.props?.className === "dsh-wb-tree")).toBeTruthy();
  expect(findElement(drawer, (node) => node.props?.["aria-label"] === "Expand folders")).toBeTruthy();
  expect(findElement(drawer, (node) => node.props?.className === "dsh-wb-tree-rail")).toBe(undefined);
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
  expect(findElement(drawer, (node) => node.props?.className === "dsh-wb-tree-resize")).toBeTruthy();
  expect(findElement(drawer, (node) => node.props?.["aria-label"] === "Hide file tree")).toBeTruthy();
  expect(findElement(drawer, (node) => node.props?.className === "dsh-wb-tree-rail")).toBe(undefined);
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
  expect(buttons.some((node) => node.props["aria-label"] === "Refresh file")).toBeTruthy();
  expect(buttons.some((node) => node.props["aria-label"] === "Copy")).toBeTruthy();
  expect(buttons.some((node) => node.props["aria-label"] === "Close")).toBeTruthy();
  const pathButton = findElement(ui.FileDrawer(), (node) => node.props?.className === "dsh-wb-path");
  expect(pathButton).toBeTruthy();
  expect(pathButton.props["aria-label"]).toBe("Copy file path");
});

test("real read tool row opens a view", async () => {
  const modes = [];
  const store = createFileStore(async (path, mode) => {
    modes.push(mode);
    return { path, content: "const value = 1;", before: null, source: "workspace", revision: 0, size: 16 };
  });
  const button = findElement(toolRow("read", store), (node) => node.type === "button");
  expect(button).toBeTruthy();
  button.props.onClick({ preventDefault() {}, stopPropagation() {} });
  await Promise.resolve();
  expect(modes).toEqual(["view"]);
  expect(store.getSnapshot().payload?.source).toBe("workspace");
});

test("real edit tool row opens a diff", async () => {
  const modes = [];
  const store = createFileStore(async (path, mode) => {
    modes.push(mode);
    return { path, content: "const value = 2;", before: "const value = 1;", source: "dsh-write", revision: 1, size: 16 };
  });
  const button = findElement(toolRow("edit", store), (node) => node.type === "button");
  expect(button).toBeTruthy();
  button.props.onClick({ preventDefault() {}, stopPropagation() {} });
  await Promise.resolve();
  expect(modes).toEqual(["diff"]);
  expect(store.getSnapshot().payload?.source).toBe("dsh-write");
});
