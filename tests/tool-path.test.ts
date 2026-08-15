import { filePathFromBlock } from "../src/client/capture/tool-path.js";
import { expect, test } from "vitest";

test("filePathFromBlock reads a running call's path", () => {
  expect(filePathFromBlock({ argsRaw: JSON.stringify({ path: "src/index.ts" }) })).toBe("src/index.ts");
});

test("filePathFromBlock prefers file_path on a settled call", () => {
  expect(filePathFromBlock({
    kind: "tool-result",
    call: { argsRaw: JSON.stringify({ file_path: "./AGENTS.md", path: "other.ts" }) },
  })).toBe("AGENTS.md");
});

test("filePathFromBlock ignores a call with no file argument", () => {
  expect(filePathFromBlock({ argsRaw: JSON.stringify({ command: "ls" }) })).toBe(undefined);
});
