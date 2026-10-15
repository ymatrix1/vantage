<script lang="ts">
  // The top view: what needs me now, where things stand, what is moving. Read-only; the counts and
  // the "show all" buttons filter the list below (D182). Never shows prompt text, only titles and reasons.
  import { TRACK_STAGES } from "@vantage/core/track";
  import type { TrackRow } from "./contract";
  import { ago } from "./relative-time";
  import { humanTitle } from "./title";
  import { stageLabel } from "./stage-label";
  import type { Summary } from "./summary";
  import type { ViewState } from "./view";

  let {
    summary,
    now,
    onchange,
  }: {
    summary: Summary | null;
    now: Date;
    onchange: (patch: Partial<ViewState>) => void;
  } = $props();

  const stages = $derived(TRACK_STAGES.slice(0, 3));
  const total = $derived(summary ? stages.reduce((n, s) => n + (summary.stages[s] ?? 0), 0) : 0);
  const reason = (i: TrackRow): string => i.flags[0]?.reason ?? stageLabel(i);
</script>

{#if summary}
  <section class="mb-4 grid gap-3 md:grid-cols-3" aria-label="Overview">
    <div class="card md:col-span-2">
      <p class="card-title">Needs you now</p>
      {#if summary.needs.length === 0}
        <p class="text-sm text-muted-foreground">Nothing is waiting on you.</p>
      {:else}
        <ul class="divide-y divide-border">
          {#each summary.needs as i (i.id)}
            <li class="py-2 first:pt-0 last:pb-0">
              <p class="truncate text-sm font-medium">{humanTitle(i)}</p>
              <p class="truncate text-xs text-muted-foreground" title={reason(i)}>{reason(i)} · {ago(i.lastActivity, now)}</p>
            </li>
          {/each}
        </ul>
        {#if summary.needsYou > summary.needs.length}
          <button type="button" class="mt-2 text-xs underline" onclick={() => onchange({ group: "attention", flag: ["thrashing", "unproven_claim"], page: 1 })}>
            Show all {summary.needsYou}
          </button>
        {/if}
      {/if}
    </div>

    <div class="card">
      <p class="card-title">Where things stand</p>
      <ul class="space-y-1.5">
        {#each stages as s (s)}
          {@const n = summary.stages[s] ?? 0}
          <li>
            <button type="button" class="flex w-full items-center gap-2 text-left text-sm" onclick={() => onchange({ stage: [s], page: 1 })}>
              <span class="w-14 capitalize">{s}</span>
              <span class="h-1.5 flex-1 overflow-hidden rounded-full bg-muted" aria-hidden="true">
                <span class="block h-full rounded-full bg-foreground/60" style:width={`${total === 0 ? 0 : Math.round((n / total) * 100)}%`}></span>
              </span>
              <span class="w-8 text-right tabular-nums text-muted-foreground">{n}</span>
            </button>
          </li>
        {/each}
      </ul>
      <p class="mt-2 text-xs text-muted-foreground">Reviewed, Shipped, Verified need sources not set up yet.</p>
    </div>

    {#if summary.progress.length > 0}
      <div class="card md:col-span-3">
        <p class="card-title">In progress, latest first</p>
        <ul class="grid gap-x-6 gap-y-1 sm:grid-cols-3">
          {#each summary.progress as i (i.id)}
            <li class="min-w-0 text-sm">
              <p class="truncate">{humanTitle(i)}</p>
              <p class="truncate text-xs text-muted-foreground">{stageLabel(i)} · {ago(i.lastActivity, now)}</p>
            </li>
          {/each}
        </ul>
      </div>
    {/if}
  </section>
{/if}
