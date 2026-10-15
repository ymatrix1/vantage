<script lang="ts">
  // L2: one work item. Title is the most human name we have; the subtitle is the branch and a short
  // time, never the worktree folder. The link icon sits beside the row button, not inside it.
  import type { ItemDetailView, TraceResponse } from "@vantage/core/track";
  import type { TrackRow } from "./contract";
  import Detail from "./Detail.svelte";
  import Dots from "./Dots.svelte";
  import { branchLink, repoLink } from "./links";
  import { ago } from "./relative-time";
  import { stageLabel } from "./stage-label";
  import { humanTitle } from "./title";

  let {
    item,
    idx,
    selected,
    isOpen,
    now,
    trace,
    detail,
    detailFailed,
    traceFailed,
    onselect,
  }: {
    item: TrackRow;
    idx: number;
    selected: boolean;
    isOpen: boolean;
    now: Date;
    trace: TraceResponse | null;
    detail: ItemDetailView | null;
    detailFailed: boolean;
    traceFailed: boolean;
    onselect: () => void;
  } = $props();

  const repoUrl = $derived(repoLink(item.repo));
  const branchUrl = $derived(branchLink(repoUrl, item.branch));
  const reasons = $derived(item.flags.map((f) => f.reason));
</script>

<li class="border-b border-border last:border-b-0" aria-current={selected}>
  <div class="flex items-center" class:bg-muted={selected}>
    <button
      id={`row-${idx}`}
      class="flex min-w-0 flex-1 items-center gap-4 px-4 py-2 text-left hover:bg-muted"
      aria-expanded={isOpen}
      onclick={onselect}
    >
      <span class="min-w-0 flex-1">
        <span class="block truncate font-medium">{humanTitle(item)}</span>
        <span class="block truncate text-xs text-muted-foreground">
          {#if item.org}<span title="Organization">{item.org === "local" ? "Local" : item.org}</span>{" · "}{/if}{#if item.branch}<span>{item.branch}</span>{" · "}{/if}<span>{ago(item.lastActivity, now)}</span>
          {#if (item.sessionCount ?? 0) > 1}<span class="ml-1 rounded-full border border-border px-1.5">{item.sessionCount} sessions</span>{/if}
          <span class="md:hidden"> · {stageLabel(item)}</span>
        </span>
        {#if reasons.length > 0}
          <span class="block truncate text-xs text-muted-foreground" title={reasons.join("; ")}>{reasons.join("; ")}</span>
        {/if}
      </span>
      <Dots {item} />
      <span class="hidden w-44 shrink-0 text-xs md:block">{stageLabel(item)}</span>
    </button>
    {#if branchUrl}
      <a
        class="px-3 py-2 text-muted-foreground hover:text-foreground"
        href={branchUrl}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Open this branch on the remote"
        title="Open this branch on the remote"
      >
        <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="4.5" cy="3.5" r="1.5" /><circle cx="4.5" cy="12.5" r="1.5" /><circle cx="11.5" cy="5.5" r="1.5" />
          <path d="M4.5 5v6M11.5 7c0 2.5-3 2.5-7 4" />
        </svg>
      </a>
    {/if}
    <!-- Slots for later sources: a PR link (GitHub source) and a ticket link (tracker, D90). -->
  </div>
  {#if isOpen}
    <Detail {item} {trace} {detail} {detailFailed} {traceFailed} {now} {repoUrl} />
  {/if}
</li>
