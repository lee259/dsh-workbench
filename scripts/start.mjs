import { spawn } from "node:child_process";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const plugin = fileURLToPath(new URL("..", import.meta.url));
const target = resolve(process.argv.slice(2).find((arg) => arg !== "--") ?? process.cwd());
const dsh = process.env.DSH_BIN ?? "pnpm";
const prefix = dsh === "pnpm" || dsh.endsWith("/pnpm") ? ["dlx", "@deepseek-ai/dsh"] : [];

function run(command, args, cwd = target) {
  return new Promise((resolveExit, reject) => {
    const child = spawn(command, args, { cwd, stdio: "inherit", shell: true });
    child.on("error", reject);
    child.on("exit", (code) => {
      if (code === 0) resolveExit();
      else reject(new Error(`${command} exited with ${code ?? 1}`));
    });
  });
}

await run("pnpm", ["run", "build"], plugin);
await run(dsh, [...prefix, "plugin", "--profile", "web", "add", plugin]);
await run(dsh, [...prefix, "web"]);
