import { readFileSync, writeFileSync } from "node:fs";

const css = readFileSync(new URL("../src/client/styles.css", import.meta.url), "utf8");
const source = `export const WORKBENCH_CSS = ${JSON.stringify(css)};\n`;
writeFileSync(new URL("../src/client/styles.generated.ts", import.meta.url), source);
