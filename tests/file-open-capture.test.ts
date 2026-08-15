import { fileOpenModeFromHint, fileOpenTargetFromHint, filePathFromOpenHint } from "../src/client/capture/file-open-capture.js";
import { parseOpenTarget } from "../src/client/capture/open-target.js";
import { expect, test } from "vitest";

test("produced-file chips open from the title path, not the basename", () => {
  expect(filePathFromOpenHint({
    className: "P4kPIW_file",
    title: "src/client/ui.tsx",
    text: "ui.tsx",
    producedRow: true,
  })).toBe("src/client/ui.tsx");
});

test("show-in-folder is not treated as a preview path", () => {
  expect(filePathFromOpenHint({
    className: "P4kPIW_showFolder",
    title: ".",
    text: "Show in folder",
    producedRow: true,
  })).toBe(undefined);
});

test("markdown file mentions open from the title path", () => {
  expect(filePathFromOpenHint({
    className: "abc_fileMention",
    title: "./src/client/ui.tsx",
    text: "ui.tsx",
  })).toBe("src/client/ui.tsx");
});

test("official tool-row file links still open", () => {
  expect(filePathFromOpenHint({
    className: "row_fileLink",
    text: "src/client/styles.css",
    tool: "write",
  })).toBe("src/client/styles.css");
});

test("read links open as views and write links open as diffs", () => {
  expect(fileOpenModeFromHint({ className: "row_fileLink", tool: "read", text: "a.ts" })).toBe("view");
  expect(fileOpenModeFromHint({ className: "row_fileLink", tool: "write", text: "a.ts" })).toBe("diff");
  expect(fileOpenModeFromHint({ className: "abc_fileMention", title: "a.ts" })).toBe("view");
  expect(fileOpenModeFromHint({ className: "row_fileLink", text: "a.ts" })).toBe("view");
  expect(fileOpenModeFromHint({ className: "row_fileLink", tool: "tool/write", text: "a.ts" })).toBe("diff");
});

test("an explicit open mode wins over DOM tool inference", () => {
  expect(fileOpenModeFromHint({ className: "fileLink", tool: "write", mode: "view" })).toBe("view");
});

test("file mentions keep the path and expose a line target", () => {
  expect(parseOpenTarget("src/foo.ts:12")).toEqual({ path: "src/foo.ts", line: 12 });
  expect(parseOpenTarget("src/foo.ts#L8")).toEqual({ path: "src/foo.ts", line: 8 });
  expect(parseOpenTarget("src/foo.ts:8:2")).toEqual({ path: "src/foo.ts", line: 8 });
  expect(parseOpenTarget("./src/foo.ts")).toEqual({ path: "src/foo.ts" });
  expect(filePathFromOpenHint({
    className: "abc_fileMention",
    title: "src/client/ui.tsx:40",
    text: "ui.tsx:40",
  })).toBe("src/client/ui.tsx");
  expect(fileOpenTargetFromHint({
    className: "abc_fileMention",
    title: "src/client/ui.tsx#L40",
    text: "ui.tsx",
  })).toEqual({ path: "src/client/ui.tsx", line: 40 });
});
