import { readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const entry = fileURLToPath(new URL("../src/client/styles.css", import.meta.url));
function expand(file) {
  const source = readFileSync(file, "utf8");
  return source.replace(/@import\s+["']([^"']+)["'];?/g, (_, imported) => {
    if (!imported.startsWith(".")) return _;
    return expand(resolve(dirname(file), imported));
  });
}

const css = expand(entry);
const source = `export const WORKBENCH_CSS = ${JSON.stringify(css)};\n`;
writeFileSync(new URL("../src/client/styles.generated.ts", import.meta.url), source);
