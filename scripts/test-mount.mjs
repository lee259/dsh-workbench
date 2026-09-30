import { spawn } from "node:child_process";
import { mkdtemp, mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const scratch = await mkdtemp(join(tmpdir(), "dsh-workbench-mount-"));
const workspace = join(scratch, "workspace");
const profile = join(scratch, "home/profiles/web");
const env = { ...process.env, DSH_HOME: join(scratch, "home") };
const dshCommand = process.env.DSH_BIN ?? "pnpm";
const dshVersion = process.env.DSH_VERSION ?? "0.1.7-rc.2";
const dshPrefix = process.env.DSH_BIN ? [] : ["dlx", `@deepseek-ai/dsh@${dshVersion}`];
const children = new Set();
let webLog = "";

function stop(child) {
  if (child.exitCode !== null) return;
  try {
    if (process.platform === "win32") child.kill();
    else process.kill(-child.pid, "SIGTERM");
  } catch { /* already exited */ }
}
function start(command, args, options = {}) {
  const child = spawn(command, args, { cwd: root, env, detached: process.platform !== "win32", stdio: "inherit", ...options });
  children.add(child);
  child.on("exit", () => children.delete(child));
  return child;
}
function run(command, args, options) {
  return new Promise((resolve, reject) => {
    const child = start(command, args, options);
    const timer = setTimeout(() => { stop(child); reject(new Error(`${command} timed out`)); }, 300_000);
    child.on("error", (error) => { clearTimeout(timer); reject(error); });
    child.on("exit", (code) => {
      clearTimeout(timer);
      if (code === 0) resolve();
      else reject(new Error(`${command} exited with ${code}`));
    });
  });
}
for (const signal of ["SIGINT", "SIGTERM"]) process.on(signal, () => {
  for (const child of children) stop(child);
  process.exit(1);
});

try {
  await mkdir(profile, { recursive: true });
  await mkdir(workspace);
  await writeFile(join(workspace, "sample.m"), "% mount smoke\nx = 1;\n");
  await writeFile(join(workspace, "other.ts"), "export const other = 2;\n");
  await writeFile(join(workspace, "readme.md"), "# Mount smoke\n");
  await writeFile(join(profile, "package.json"), JSON.stringify({ name: "dsh-workbench-smoke", private: true, dependencies: {}, dsh: { profile: { bundles: ["@deepseek-ai/dsh-base", "@deepseek-ai/dsh-web-app"] } } }));
  await writeFile(join(profile, "cordis.patch.yml"), "[]\n");
  await writeFile(join(profile, "pnpm-workspace.yaml"), "packages:\n  - .\nnodeLinker: hoisted\nautoInstallPeers: false\nonlyBuiltDependencies:\n  - node-pty\n  - protobufjs\nminimumReleaseAgeExclude:\n  - '@deepseek-ai/*'\n");
  await run("pnpm", ["run", "build"]);
  await run("pnpm", ["pack", "--pack-destination", scratch]);
  const tarball = (await readdir(scratch)).find((file) => file.endsWith(".tgz"));
  if (!tarball) throw new Error("Package tarball missing");
  await run(dshCommand, [...dshPrefix, "plugin", "--profile", "web", "add", `file:${join(scratch, tarball)}`]);
  const installed = JSON.parse(await readFile(join(profile, "package.json"), "utf8"));
  if (!installed.dsh?.profile?.bundles?.includes("dsh-workbench")) throw new Error("Plugin not registered in scratch profile");
  const server = start(dshCommand, [...dshPrefix, "web", "--port", "0", "--no-open"], { cwd: workspace, stdio: ["ignore", "pipe", "pipe"] });
  const url = await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("DSH did not become ready within 120 seconds")), 120_000);
    const capture = (chunk) => {
      webLog += chunk.toString();
      const match = webLog.match(/dsh web: (http:\/\/127\.0\.0\.1:\d+[^\s]*)/);
      if (match) { clearTimeout(timer); resolve(match[1]); }
    };
    server.stdout.on("data", capture);
    server.stderr.on("data", capture);
    server.on("error", (error) => { clearTimeout(timer); reject(error); });
    server.on("exit", (code) => { clearTimeout(timer); reject(new Error(`DSH exited before readiness: ${code}`)); });
  });
  console.log(`DSH ${dshVersion} ready; testing the installed tarball in Chromium.`);
  await run("pnpm", ["exec", "playwright", "test"], { env: { ...env, DSH_E2E_URL: url, DSH_E2E_WORKSPACE: workspace, DSH_E2E_VERSION: dshVersion } });
} catch (error) {
  console.error(webLog.replace(/token=[^\s&]+/g, "token=[redacted]").slice(-8000));
  throw error;
} finally {
  for (const child of children) stop(child);
  await rm(scratch, { recursive: true, force: true });
}
