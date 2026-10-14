// Fallback for `.svelte` imports from .ts files: svelte-check on this Windows setup doesn't resolve them
// (bean vantage-8oas). Real component types still come from svelte-check for .svelte-to-.svelte imports.
declare module "*.svelte" {
  import type { Component } from "svelte";
  const component: Component;
  export default component;
}
