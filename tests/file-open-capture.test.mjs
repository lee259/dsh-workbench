import assert from "node:assert/strict";
import test from "node:test";
import { fileOpenModeFromHint, fileOpenTargetFromHint, filePathFromOpenHint } from "../lib/client/capture/file-open-capture.js";
import { parseOpenTarget } from "../lib/client/capture/open-target.js";

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

test("file mentions keep the path and expose a line target", () => {
  assert.deepEqual(parseOpenTarget("src/foo.ts:12"), { path: "src/foo.ts", line: 12 });
  assert.deepEqual(parseOpenTarget("src/foo.ts#L8"), { path: "src/foo.ts", line: 8 });
  assert.deepEqual(parseOpenTarget("src/foo.ts:8:2"), { path: "src/foo.ts", line: 8 });
  assert.deepEqual(parseOpenTarget("./src/foo.ts"), { path: "src/foo.ts" });
  assert.equal(filePathFromOpenHint({
    className: "abc_fileMention",
    title: "src/client/ui.tsx:40",
    text: "ui.tsx:40",
  }), "src/client/ui.tsx");
  assert.deepEqual(fileOpenTargetFromHint({
    className: "abc_fileMention",
    title: "src/client/ui.tsx#L40",
    text: "ui.tsx",
  }), { path: "src/client/ui.tsx", line: 40 });
});
