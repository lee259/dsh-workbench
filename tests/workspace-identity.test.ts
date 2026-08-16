import { expect, test } from "vitest";
import { followDshSession, followDshWorkspace, lastWorkbenchSession, notifyWorkbenchSession, retargetWorkbenchRoot, sessionIdFromEvent, workbenchShouldReset, workspacePathFromDsh } from "../src/client/workspace-identity.js";

test("workspace path prefers the current session cwd", () => {
  expect(workspacePathFromDsh(
    { current: "s1", byId: { s1: { cwd: "/repo/app" } } },
    { items: [{ workspaceId: "w1", path: "/repo/other" }] },
  )).toBe("/repo/app");
});

test("workspace path can read a persisted current session object", () => {
  expect(workspacePathFromDsh(
    { current: { sessionId: "s2" }, byId: { s2: { cwd: "/tmp/project" } } },
  )).toBe("/tmp/project");
});

test("workspace path falls back to the workspace that owns the current session", () => {
  expect(workspacePathFromDsh(
    { current: "s1", byId: { s1: {} } },
    { items: [
      { workspaceId: "w1", path: "/repo/one", sessionIds: ["s9"] },
      { workspaceId: "w2", path: "/repo/two", sessionIds: ["s1"] },
    ] },
  )).toBe("/repo/two");
});

test("workspace path falls back to the recent workspace", () => {
  expect(workspacePathFromDsh(
    undefined,
    { recentWorkspaceId: "w2", items: [
      { workspaceId: "w1", path: "/repo/one" },
      { workspaceId: "w2", path: "/repo/two" },
    ] },
  )).toBe("/repo/two");
});

test("followDshWorkspace emits only when the resolved path changes", () => {
  let snapshot: { current?: string; byId?: Record<string, { cwd?: string }> } = { current: "s1", byId: { s1: { cwd: "/a" } } };
  const listeners = new Set<() => void>();
  const seen: string[] = [];
  const stop = followDshWorkspace({
    sessions: {
      list: {
        getSnapshot: () => snapshot,
        subscribe(listener) {
          listeners.add(listener);
          return () => { listeners.delete(listener); };
        },
      },
    },
  }, (path) => { seen.push(path); });
  expect(seen).toEqual(["/a"]);
  for (const listener of listeners) listener();
  expect(seen).toEqual(["/a"]);
  snapshot = { current: "s2", byId: { s2: { cwd: "/b" } } };
  for (const listener of listeners) listener();
  expect(seen).toEqual(["/a", "/b"]);
  stop();
});

test("followDshSession emits when the current session changes in the same workspace", () => {
  let snapshot: { current?: string; byId?: Record<string, { cwd?: string }> } = {
    current: "s1",
    byId: { s1: { cwd: "/a" }, s2: { cwd: "/a" } },
  };
  const listeners = new Set<() => void>();
  const seen: string[] = [];
  const stop = followDshSession({
    sessions: {
      list: {
        getSnapshot: () => snapshot,
        subscribe(listener) {
          listeners.add(listener);
          return () => { listeners.delete(listener); };
        },
      },
    },
  }, (sessionId) => { seen.push(sessionId); });
  expect(seen).toEqual(["s1"]);
  for (const listener of listeners) listener();
  expect(seen).toEqual(["s1"]);
  snapshot = { current: "s2", byId: { s1: { cwd: "/a" }, s2: { cwd: "/a" } } };
  for (const listener of listeners) listener();
  expect(seen).toEqual(["s1", "s2"]);
  snapshot = { current: undefined, byId: {} };
  for (const listener of listeners) listener();
  expect(seen).toEqual(["s1", "s2", ""]);
  stop();
});

test("workbench resets only when the workspace root changes", () => {
  expect(workbenchShouldReset("/repo", "/repo")).toBe(false);
  expect(workbenchShouldReset("", "/repo")).toBe(false);
  expect(workbenchShouldReset("/a", "/b")).toBe(true);
});

test("notifyWorkbenchSession remembers the latest session for late subscribers", () => {
  notifyWorkbenchSession("s-late");
  expect(lastWorkbenchSession()).toBe("s-late");
});

test("sessionIdFromEvent reads a session change detail", () => {
  expect(sessionIdFromEvent({} as Event)).toBe("");
  expect(sessionIdFromEvent(new CustomEvent("dsh-wb-session-change", { detail: "s9" }))).toBe("s9");
});

test("retargetWorkbenchRoot posts the new root then notifies the shell", async () => {
  const posted: string[] = [];
  let notified = 0;
  await retargetWorkbenchRoot("/repo/app", {
    async post(root) { posted.push(root); },
    notify() { notified += 1; },
  });
  expect(posted).toEqual(["/repo/app"]);
  expect(notified).toBe(1);
});

test("retargetWorkbenchRoot still notifies when the host post fails", async () => {
  let notified = 0;
  await retargetWorkbenchRoot("/repo/app", {
    async post() { throw new Error("offline"); },
    notify() { notified += 1; },
  });
  expect(notified).toBe(1);
});
