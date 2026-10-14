import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    // Workspace packages point at dist; tests run against source.
    alias: {
      "@vantage/core": fileURLToPath(new URL("./packages/core/src/index.ts", import.meta.url)),
      "@vantage/daemon": fileURLToPath(new URL("./packages/daemon/src/index.ts", import.meta.url)),
    },
  },
  test: { include: ["packages/*/test/**/*.test.ts", "tools/test/**/*.test.ts"] },
});
