import { execFile } from "node:child_process";

export function systemOpenCommand(platform: string, path: string): { command: string; args: string[] } {
  if (platform === "darwin") return { command: "open", args: [path] };
  if (platform === "win32") return { command: "cmd.exe", args: ["/c", "start", "", path] };
  return { command: "xdg-open", args: [path] };
}

export async function openInSystem(path: string, platform = process.platform): Promise<void> {
  const target = systemOpenCommand(platform, path);
  await new Promise<void>((resolve, reject) => {
    execFile(target.command, target.args, (error) => error ? reject(error) : resolve());
  });
}
