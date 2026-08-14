import assert from "node:assert/strict";
import test from "node:test";
import { filePathFromBlock } from "../lib/client/tool-path.js";

test("filePathFromBlock reads a running call's path", () => {
  assert.equal(filePathFromBlock({ argsRaw: JSON.stringify({ path: "src/index.ts" }) }), "src/index.ts");
});

test("filePathFromBlock prefers file_path on a settled call", () => {
  assert.equal(filePathFromBlock({
    kind: "tool-result",
    call: { argsRaw: JSON.stringify({ file_path: "./AGENTS.md", path: "other.ts" }) },
  }), "AGENTS.md");
});

test("filePathFromBlock ignores a call with no file argument", () => {
  assert.equal(filePathFromBlock({ argsRaw: JSON.stringify({ command: "ls" }) }), undefined);
});
