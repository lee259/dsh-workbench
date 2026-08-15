import { startWorkspaceWatch } from "../src/host/workspace-watch.js";
import { expect, test } from "vitest";

test("workspace watch skips dependency and build directories", () => {
  const watched = [];
  startWorkspaceWatch("/repo", () => {}, {
    watch(path, options) {
      watched.push({ path, recursive: options.recursive });
      return { on() {}, unref() {}, close() {} };
    },
    readDir() {
      return [
        { name: "src", isDirectory: true },
        { name: "node_modules", isDirectory: true },
        { name: "lib", isDirectory: true },
        { name: ".git", isDirectory: true },
        { name: "package.json", isDirectory: false },
      ];
    },
  });
  expect(watched).toEqual([
    { path: "/repo", recursive: false },
    { path: "/repo/src", recursive: true },
  ]);
});
