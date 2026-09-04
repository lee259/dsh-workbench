import { systemOpenCommand } from "../src/host/system-open.js";
import { expect, test } from "vitest";

test("uses the system default application on macOS", () => {
  expect(systemOpenCommand("darwin", "/repo/src/main.ts")).toEqual({ command: "open", args: ["/repo/src/main.ts"] });
});

test("uses each platform's default file opener", () => {
  expect(systemOpenCommand("win32", "C:/repo/main.ts")).toEqual({ command: "cmd.exe", args: ["/c", "start", "", "C:/repo/main.ts"] });
  expect(systemOpenCommand("linux", "/repo/main.ts")).toEqual({ command: "xdg-open", args: ["/repo/main.ts"] });
});
