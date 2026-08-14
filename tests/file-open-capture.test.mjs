import assert from "node:assert/strict";
import test from "node:test";
import { filePathFromOpenHint } from "../lib/client/file-open-capture.js";

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
