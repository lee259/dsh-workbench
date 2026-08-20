import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: [
      { find: "@deepseek-ai/dsh-client-ui-primitives", replacement: new URL("./tests/dsh-client-ui-primitives.ts", import.meta.url).pathname },
      { find: /^react\/jsx-dev-runtime$/, replacement: new URL("./src/client/react-bridge.ts", import.meta.url).pathname },
      { find: /^react\/jsx-runtime$/, replacement: new URL("./src/client/react-bridge.ts", import.meta.url).pathname },
      { find: /^react$/, replacement: new URL("./src/client/react-bridge.ts", import.meta.url).pathname },
    ],
  },
  // JSX is compiled through the bridge so tests use the same host React
  // indirection as the browser bundle.
  test: {
    include: ["tests/**/*.test.ts"],
    setupFiles: ["tests/setup.ts"],
  },
});
