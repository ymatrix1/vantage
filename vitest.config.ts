import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    // Workspace packages point at dist; tests run against source.
    alias: {
      "@vantage/core/status-line": fileURLToPath(
        new URL("./packages/core/src/status-line.ts", import.meta.url),
      ),
      "@vantage/core": fileURLToPath(new URL("./packages/core/src/index.ts", import.meta.url)),
      "@vantage/daemon": fileURLToPath(new URL("./packages/daemon/src/index.ts", import.meta.url)),
    },
  },
  test: {
    include: ["packages/*/test/**/*.test.ts", "tools/test/**/*.test.ts"],
    // Tests that open SQLite files and spawn processes ran past the 5 s default on shared Windows
    // runners (stages.test.ts "migration 3" timed out once on windows-latest, then passed on rerun).
    testTimeout: 20_000,
    hookTimeout: 20_000,
  },
});
