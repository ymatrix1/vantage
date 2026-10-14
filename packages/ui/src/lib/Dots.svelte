<script lang="ts">
  // The six-dot track. Shape carries state first, colour second (visual-language spec).
  import { TRACK_STAGES, dotsFor, type TrackItem } from "@vantage/core/track";
  import Dot from "./Dot.svelte";
  import { DOT_WORDS } from "./legend";

  let { item }: { item: Pick<TrackItem, "stage" | "proofStatus" | "docsOnly" | "flags"> } = $props();

  const dots = $derived(dotsFor(item));
</script>

<span
  class="inline-flex shrink-0 items-center gap-1"
  role="img"
  aria-label={TRACK_STAGES.map((s, i) => `${s}: ${DOT_WORDS[dots[i] ?? "not_yet"]}`).join(", ")}
>
  {#each dots as state, i (i)}
    <Dot {state} title={`${TRACK_STAGES[i]}: ${DOT_WORDS[state]}`} />
  {/each}
</span>
