<script lang="ts">
  // L0: how is it going, in one line. Each number filters the list when clicked.
  import type { ViewState } from "./view";
  import { needsYouDetail, type Summary } from "./summary";

  let {
    summary,
    view,
    now,
    stale,
    offline,
    onchange,
  }: {
    summary: Summary | null;
    view: ViewState;
    now: Date;
    stale: boolean;
    offline: boolean;
    onchange: (patch: Partial<ViewState>) => void;
  } = $props();

  const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const DAY_MS = 86_400_000;
  const RANGE: Record<string, { label: string; days: number | null }> = {
    "24h": { label: "Today", days: 1 },
    "7d": { label: "Last 7 days", days: 7 },
    "30d": { label: "Last 30 days", days: 30 },
    all: { label: "All time", days: null },
  };
  const FLAGGED = ["thrashing", "unproven_claim", "forgotten"];

  const day = (d: Date): string => `${MONTHS[d.getMonth()] ?? ""} ${d.getDate()}`;
  const range = $derived(RANGE[view.since] ?? { label: "Last 7 days", days: 7 });
  const dates = $derived(range.days === null ? "" : `${day(new Date(now.getTime() - (range.days - 1) * DAY_MS))} to ${day(now)}`);
  const detail = $derived(summary ? needsYouDetail(summary) : "");
  const link = "underline decoration-dotted underline-offset-2 hover:decoration-solid";
</script>

<div class="flex flex-wrap items-baseline gap-x-2 gap-y-1 py-2 text-sm" role="group" aria-label="Summary">
  <strong class="font-semibold">{range.label}:</strong>
  {#if summary}
    <button type="button" class={link} onclick={() => onchange({ flag: ["none"], page: 1 })}>{summary.inProgress} in progress</button>,
    <button type="button" class={link} onclick={() => onchange({ flag: FLAGGED, page: 1 })}>{summary.needsYou} need you</button>
    {#if detail}<span class="text-muted-foreground">({detail})</span>{/if},
    <button type="button" class={link} onclick={() => onchange({ since: "all", page: 1 })}>{summary.older} older</button>
  {:else}
    <span class="text-muted-foreground">counting…</span>
  {/if}
  {#if dates}<span class="text-xs text-muted-foreground">{dates}</span>{/if}
  {#if offline}
    <span class="rounded-full border border-border px-2 text-xs">Offline</span>
  {:else if stale}
    <span class="rounded-full border border-border px-2 text-xs">Stale</span>
  {/if}
</div>
