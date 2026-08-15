import { spawn } from "node:child_process";
import { homedir } from "node:os";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const plugin = fileURLToPath(new URL("..", import.meta.url));
const requested = process.argv.slice(2).find((arg) => arg !== "--");
const debugWorkspace = resolve(homedir(), ".dsh/debug-workspace");
const target = resolve(requested ?? (process.cwd() === plugin ? debugWorkspace : process.cwd()));
const profile = process.env.DSH_PROFILE ?? "web-debug";
const port = process.env.DSH_PORT ?? (profile === "web-debug" ? "8788" : "");
const dsh = process.env.DSH_BIN ?? "pnpm";
const prefix = dsh === "pnpm" || dsh.endsWith("/pnpm") ? ["dlx", "@deepseek-ai/dsh"] : [];

function run(command, args, cwd = target) {
  return new Promise((resolveExit, reject) => {
    const child = spawn(command, args, {
      cwd,
      stdio: "inherit",
      // Keep argument boundaries intact on Unix. The DSH CLI may be a
      // regular executable path (DSH_BIN), so routing it through /bin/sh
      // makes the local start path fail in restricted environments.
      shell: process.platform === "win32",
    });
    child.on("error", reject);
    child.on("exit", (code) => {
      if (code === 0) resolveExit();
      else reject(new Error(`${command} exited with ${code ?? 1}`));
    });
  });
}

await run("pnpm", ["run", "build"], plugin);
await run(dsh, [...prefix, "plugin", "--profile", profile, "add", plugin]);
await run(dsh, [...prefix, "--profile", profile, ...(port ? ["--port", port] : [])]);
