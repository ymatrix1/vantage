<script lang="ts">
  // One dot (D183). Default: a full-colour filled circle per state. Colour-blind friendly: the shape-first
  // style of D34 (ring, half, dash) in a colour-blind-safe palette. Either way the dot has a title and the
  // row has an accessible name in words, so colour is never the only signal.
  // Skipped is a short dash with no ring so it cannot be mistaken for "not yet".
  import type { DotState } from "@vantage/core/track";
  import { settings } from "./settings.svelte";

  let { state, title }: { state: DotState; title: string } = $props();
</script>

<svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true" data-state={state} data-style={settings.cb ? "shape" : "colour"}>
  <title>{title}</title>
  {#if state === "skipped"}
    <path d="M5 8h6" fill="none" stroke="var(--dot-gray)" stroke-width="2" stroke-linecap="round" />
  {:else if !settings.cb}
    <circle cx="8" cy="8" r="5.5" fill={`var(--dot-${state === "done" ? "green" : state === "current" ? "blue" : state === "no_proof" ? "amber" : state === "needs_you" ? "red" : "light"})`} />
  {:else if state === "done"}
    <circle cx="8" cy="8" r="5.5" fill="var(--dot-green)" />
  {:else if state === "current"}
    <circle cx="8" cy="8" r="5" fill="none" stroke="var(--dot-blue)" stroke-width="3" />
  {:else if state === "no_proof"}
    <circle cx="8" cy="8" r="5.5" fill="none" stroke="var(--dot-amber)" stroke-width="1.5" />
    <path d="M8 2.5 A5.5 5.5 0 0 0 8 13.5 Z" fill="var(--dot-amber)" />
  {:else if state === "needs_you"}
    <circle cx="8" cy="8" r="5" fill="none" stroke="var(--dot-red)" stroke-width="2" />
    <circle cx="13" cy="3" r="2" fill="var(--dot-red)" />
  {:else}
    <circle cx="8" cy="8" r="5.5" fill="none" stroke="var(--dot-light)" stroke-width="1" />
  {/if}
</svg>
