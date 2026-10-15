<script lang="ts">
  // What the six dots mean. Drawn with the same Dot component as the rows so the shapes match.
  // Not modal: nothing here traps focus, and Esc (handled by the page) closes it.
  import { TRACK_STAGES } from "@vantage/core/track";
  import Dot from "./Dot.svelte";
  import { COLOUR_LEGEND, DOT_WORDS, STAGE_LEGEND, STATE_LEGEND, STATE_ORDER } from "./legend";
  import { setColourBlind, settings } from "./settings.svelte";

  let { onclose }: { onclose: () => void } = $props();
</script>

<section id="dot-legend" class="mb-4 rounded-lg border border-border p-4 text-sm" aria-labelledby="dot-legend-title">
  <div class="mb-2 flex items-baseline justify-between">
    <h2 id="dot-legend-title" class="font-medium">What the dots mean</h2>
    <button type="button" class="text-xs text-muted-foreground underline" onclick={onclose}>Close</button>
  </div>
  <p class="mb-3 text-muted-foreground">
    Each dot also has its state in words (hover, or read by a screen reader). An agent saying "done" never moves a dot: only evidence does.
  </p>
  <div class="grid gap-4 sm:grid-cols-2">
    <div>
      <h3 class="mb-1 text-xs font-medium text-muted-foreground">Six stages, left to right</h3>
      <ol class="space-y-1">
        {#each TRACK_STAGES as s (s)}
          <li><span class="font-medium">{STAGE_LEGEND[s].name}</span> <span class="text-muted-foreground">{STAGE_LEGEND[s].question}</span></li>
        {/each}
      </ol>
    </div>
    <div>
      <h3 class="mb-1 text-xs font-medium text-muted-foreground">Six dot states</h3>
      <ul class="space-y-1">
        {#each STATE_ORDER as st (st)}
          <li class="flex items-center gap-2">
            <Dot state={st} title={DOT_WORDS[st]} />
            <span><span class="font-medium">{(settings.cb ? STATE_LEGEND : COLOUR_LEGEND)[st].shape}.</span> <span class="text-muted-foreground">{STATE_LEGEND[st].meaning}</span></span>
          </li>
        {/each}
      </ul>
    </div>
  </div>
  <label class="mt-3 flex items-center gap-2 text-sm">
    <input type="checkbox" checked={settings.cb} onchange={(e) => setColourBlind(e.currentTarget.checked)} />
    Colour-blind friendly: shapes (ring, half, dash) and safe colours
  </label>
</section>
