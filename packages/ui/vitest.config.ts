import { fileURLToPath } from "node:url";
import { svelte } from "@sveltejs/vite-plugin-svelte";
import { defineConfig } from "vitest/config";

// Component tests (D82): Svelte's own mount() in happy-dom, no testing-library.
export default defineConfig({
  plugins: [svelte()],
  resolve: {
    // Svelte's client build, so mount() exists under Vitest.
    conditions: ["browser"],
    alias: {
      $lib: fileURLToPath(new URL("./src/lib", import.meta.url)),
      "@vantage/core/track": fileURLToPath(new URL("../core/src/track.ts", import.meta.url)),
    },
  },
  test: {
    name: "ui",
    environment: "happy-dom",
    include: ["test/**/*.test.ts"],
  },
});
