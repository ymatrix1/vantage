<script lang="ts">
  // The six-dot track. Shape carries state first, colour second (visual-language spec).
  import { TRACK_STAGES, dotsFor, type DotState, type TrackItem } from "@vantage/core/track";

  let { item }: { item: Pick<TrackItem, "stage" | "proofStatus" | "docsOnly" | "flags"> } = $props();

  const dots = $derived(dotsFor(item));
  const WORDS: Record<DotState, string> = {
    done: "done",
    current: "in progress",
    no_proof: "no proof",
    needs_you: "needs you",
    skipped: "skipped or not set up",
    not_yet: "not yet",
  };
</script>

<span class="inline-flex items-center gap-1" role="img" aria-label={TRACK_STAGES.map((s, i) => `${s}: ${WORDS[dots[i] ?? "not_yet"]}`).join(", ")}>
  {#each dots as state, i (i)}
    <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true" data-state={state}>
      <title>{TRACK_STAGES[i]}: {WORDS[state]}</title>
      {#if state === "done"}
        <circle cx="8" cy="8" r="5.5" fill="var(--dot-green)" />
      {:else if state === "current"}
        <circle cx="8" cy="8" r="5" fill="none" stroke="var(--dot-blue)" stroke-width="3" />
      {:else if state === "no_proof"}
        <circle cx="8" cy="8" r="5.5" fill="none" stroke="var(--dot-amber)" stroke-width="1.5" />
        <path d="M8 2.5 A5.5 5.5 0 0 0 8 13.5 Z" fill="var(--dot-amber)" />
      {:else if state === "needs_you"}
        <circle cx="8" cy="8" r="5" fill="none" stroke="var(--dot-red)" stroke-width="2" />
        <circle cx="13" cy="3" r="2" fill="var(--dot-red)" />
      {:else if state === "skipped"}
        <circle cx="8" cy="8" r="5.5" fill="none" stroke="var(--dot-gray)" stroke-width="1.5" stroke-dasharray="2.5 2" />
      {:else}
        <circle cx="8" cy="8" r="5.5" fill="none" stroke="var(--dot-light)" stroke-width="1" />
      {/if}
    </svg>
  {/each}
</span>
