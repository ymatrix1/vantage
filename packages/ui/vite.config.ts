import { fileURLToPath } from "node:url";
import { svelte } from "@sveltejs/vite-plugin-svelte";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [tailwindcss(), svelte()],
  resolve: {
    alias: {
      $lib: fileURLToPath(new URL("./src/lib", import.meta.url)),
      // Pure view rules shared with the daemon; bundled from source so the UI never needs core's Node build.
      "@vantage/core/track": fileURLToPath(new URL("../core/src/track.ts", import.meta.url)),
    },
  },
  server: { host: "127.0.0.1" },
});
