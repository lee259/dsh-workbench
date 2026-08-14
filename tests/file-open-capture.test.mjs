import assert from "node:assert/strict";
import test from "node:test";
import { fileOpenModeFromHint, filePathFromOpenHint } from "../lib/client/file-open-capture.js";

test("produced-file chips open from the title path, not the basename", () => {
  assert.equal(filePathFromOpenHint({
    className: "P4kPIW_file",
    title: "src/client/ui.tsx",
    text: "ui.tsx",
    producedRow: true,
  }), "src/client/ui.tsx");
});

test("show-in-folder is not treated as a preview path", () => {
  assert.equal(filePathFromOpenHint({
    className: "P4kPIW_showFolder",
    title: ".",
    text: "Show in folder",
    producedRow: true,
  }), undefined);
});

test("markdown file mentions open from the title path", () => {
  assert.equal(filePathFromOpenHint({
    className: "abc_fileMention",
    title: "./src/client/ui.tsx",
    text: "ui.tsx",
  }), "src/client/ui.tsx");
});

test("official tool-row file links still open", () => {
  assert.equal(filePathFromOpenHint({
    className: "row_fileLink",
    text: "src/client/styles.css",
    tool: "write",
  }), "src/client/styles.css");
});

test("read links open as views and write links open as diffs", () => {
  assert.equal(fileOpenModeFromHint({ className: "row_fileLink", tool: "read", text: "a.ts" }), "view");
  assert.equal(fileOpenModeFromHint({ className: "row_fileLink", tool: "write", text: "a.ts" }), "diff");
  assert.equal(fileOpenModeFromHint({ className: "abc_fileMention", title: "a.ts" }), "view");
  assert.equal(fileOpenModeFromHint({ className: "row_fileLink", text: "a.ts" }), "view");
  assert.equal(fileOpenModeFromHint({ className: "row_fileLink", tool: "tool/write", text: "a.ts" }), "diff");
});

test("an explicit open mode wins over DOM tool inference", () => {
  assert.equal(fileOpenModeFromHint({ className: "fileLink", tool: "write", mode: "view" }), "view");
});
