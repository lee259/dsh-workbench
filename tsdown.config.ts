import { defineConfig } from "tsdown";

export default defineConfig({
  entry: "src/client.ts",
  format: "iife",
  outDir: "lib",
  platform: "browser",
  sourcemap: false,
  clean: false,
  deps: {
    // DSH injects client.js as a classic <script>. Leftover ESM imports
    // prevent window.__ModuleLoader__.load from running.
    alwaysBundle: () => true,
  },
  alias: {
    react: new URL("./src/client/react-bridge.ts", import.meta.url).pathname,
    "react/jsx-runtime": new URL("./src/client/react-bridge.ts", import.meta.url).pathname,
    "react/jsx-dev-runtime": new URL("./src/client/react-bridge.ts", import.meta.url).pathname,
  },
});
