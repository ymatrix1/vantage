<script lang="ts">
  // Search, filter chips with live counts, sort and group-by. It owns no data: every change goes up
  // through onchange and comes back as the new `view` (the URL is the source of truth, see App).
  import { GROUP_VALUES, SINCE_VALUES, SORT_VALUES, Q_MAX, type Facets, type GroupBy, type Since, type Sort } from "./contract";
  import { FILTER_KEYS, activeFilters, defaultOrder, type FilterKey, type ViewState } from "./view";

  let {
    view,
    facets,
    onchange,
    onclear,
    searchEl = $bindable(null),
  }: {
    view: ViewState;
    facets: Facets;
    onchange: (patch: Partial<ViewState>, replace?: boolean) => void;
    onclear: () => void;
    searchEl?: HTMLInputElement | null;
  } = $props();

  const DEBOUNCE_MS = 250;
  const TITLES: Record<FilterKey, string> = {
    org: "Organization",
    repo: "Repo",
    branch: "Branch",
    stage: "Stage",
    proof: "Proof",
    flag: "Flag",
  };
  const SINCE_LABEL: Record<Since, string> = { "24h": "24 hours", "7d": "7 days", "30d": "30 days", all: "All time" };
  const SORT_LABEL: Record<Sort, string> = {
    activity: "Recent activity",
    stage: "Stage",
    title: "Title",
    repo: "Repo",
    flags: "Flags",
  };
  const GROUP_LABEL: Record<GroupBy, string> = {
    attention: "Attention",
    org: "Organization",
    repo: "Repo",
    stage: "Stage",
    day: "Day",
    none: "No grouping",
  };
  const words = (v: string): string => v.replaceAll("_", " ");

  let text = $state("");
  let timer: ReturnType<typeof setTimeout> | null = null;
  // The URL changed from outside (back button, clear all): the box follows it.
  $effect(() => {
    text = view.q;
  });

  function typed(): void {
    if (timer) clearTimeout(timer);
    timer = setTimeout(commit, DEBOUNCE_MS);
  }
  function commit(): void {
    if (timer) clearTimeout(timer);
    timer = null;
    const q = text.trim().slice(0, Q_MAX);
    if (q !== view.q) onchange({ q, page: 1 }, true);
  }
  function searchKey(e: KeyboardEvent): void {
    if (e.key === "Enter") commit();
    else if (e.key === "Escape") searchEl?.blur();
  }

  const options = (k: FilterKey): [string, number][] => {
    const counts = facets[k];
    const seen = new Set(Object.keys(counts));
    for (const v of view[k]) seen.add(v);
    return [...seen].map((v): [string, number] => [v, counts[v] ?? 0]).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  };
  function toggle(k: FilterKey, v: string): void {
    const cur = view[k];
    onchange({ [k]: cur.includes(v) ? cur.filter((x) => x !== v) : [...cur, v], page: 1 });
  }
  const sinceCount = (s: Since): number | null =>
    s === "24h" ? facets.age.today : s === "7d" ? facets.age.today + facets.age.week : s === "all" ? facets.age.today + facets.age.week + facets.age.older : null;
  const filtered = $derived(activeFilters(view).length > 0);
  // The filter panel starts closed: the page shows one calm line of controls (D182). Filters that are
  // already on keep a count on the button and a chip below, so nothing hides silently.
  let panelOpen = $state(false);
  const activeCount = $derived(activeFilters(view).filter((f) => f !== "search").length);
</script>

<form class="mb-3 space-y-3" role="search" aria-label="Track controls" onsubmit={(e) => e.preventDefault()}>
  <div class="flex flex-wrap items-center gap-2">
    <label class="min-w-44 flex-1">
      <span class="sr-only">Search title, repo or branch; press / to focus</span>
      <input
        bind:this={searchEl}
        bind:value={text}
        oninput={typed}
        onkeydown={searchKey}
        type="search"
        maxlength={Q_MAX}
        placeholder="Search title, repo or branch   ( / )"
        autocomplete="off"
        class="ctl w-full"
      />
    </label>

    <label class="flex items-center gap-2 text-xs text-muted-foreground">
      <span>Group by</span>
      <select
        class="ctl ctl-select"
        value={view.group}
        onchange={(e) => onchange({ group: GROUP_VALUES.find((g) => g === e.currentTarget.value) ?? "attention", page: 1 })}
      >
        {#each GROUP_VALUES as g (g)}<option value={g}>{GROUP_LABEL[g]}</option>{/each}
      </select>
    </label>

    <div class="flex items-center gap-2 text-xs text-muted-foreground">
      <label class="flex items-center gap-2">
        <span>Sort by</span>
        <select
          class="ctl ctl-select"
          value={view.sort}
          onchange={(e) => {
            const sort = SORT_VALUES.find((s) => s === e.currentTarget.value) ?? "activity";
            onchange({ sort, order: defaultOrder(sort), page: 1 });
          }}
        >
          {#each SORT_VALUES as s (s)}<option value={s}>{SORT_LABEL[s]}</option>{/each}
        </select>
      </label>
      <button
        type="button"
        class="ctl ctl-icon"
        aria-label={view.order === "desc" ? "Descending, switch to ascending" : "Ascending, switch to descending"}
        onclick={() => onchange({ order: view.order === "desc" ? "asc" : "desc", page: 1 })}
      >
        <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
          {#if view.order === "desc"}<path d="M7 2v10M3 8l4 4 4-4" />{:else}<path d="M7 12V2M3 6l4-4 4 4" />{/if}
        </svg>
      </button>
    </div>

    <button type="button" class="ctl" aria-expanded={panelOpen} aria-controls="filter-panel" onclick={() => (panelOpen = !panelOpen)}>
      Filters{#if activeCount > 0}<span class="ml-1.5 rounded-full bg-foreground px-1.5 text-xs text-background">{activeCount}</span>{/if}
    </button>
  </div>

  <div id="filter-panel" class="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-muted/40 p-3" role="group" aria-label="Filters" hidden={!panelOpen}>
    <span class="chip-group" role="group" aria-label="Active in the last">
      {#each SINCE_VALUES as s (s)}
        {@const n = sinceCount(s)}
        <button type="button" class="chip-seg" aria-pressed={view.since === s} onclick={() => onchange({ since: s, page: 1 })}>
          {SINCE_LABEL[s]}{#if n !== null}<span class="ml-1.5 text-muted-foreground">{n}</span>{/if}
        </button>
      {/each}
    </span>

    <button type="button" class="chip" aria-pressed={view.hasEdits === true} onclick={() => onchange({ hasEdits: view.hasEdits === true ? null : true, page: 1 })}>
      Has code edits<span class="ml-1.5 text-muted-foreground">{facets.hasEdits.true}</span>
    </button>

    {#each FILTER_KEYS as k (k)}
      {@const opts = options(k)}
      {#if opts.length > 0}
        <details class="relative">
          <summary class="chip list-none" class:chip-on={view[k].length > 0}>
            {TITLES[k]}{#if view[k].length > 0}<span class="ml-1.5">{view[k].length}</span>{/if}
          </summary>
          <ul class="absolute z-10 mt-1 max-h-64 min-w-48 overflow-auto rounded-md border border-border bg-background p-1 shadow-md" aria-label={`${TITLES[k]} filter`}>
            {#each opts as [v, n] (v)}
              <li>
                <button
                  type="button"
                  class="flex w-full items-center justify-between gap-3 rounded px-2 py-1.5 text-left text-xs hover:bg-muted"
                  aria-pressed={view[k].includes(v)}
                  onclick={() => toggle(k, v)}
                >
                  <span class="truncate" class:font-medium={view[k].includes(v)}>
                    {#if view[k].includes(v)}<svg class="mr-1 inline" width="10" height="10" viewBox="0 0 10 10" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M1.5 5.5l2.5 2.5 4.5-5.5" /></svg>{/if}{words(v)}
                  </span>
                  <span class="text-muted-foreground">{n}</span>
                </button>
              </li>
            {/each}
          </ul>
        </details>
      {/if}
    {/each}

    {#if filtered}
      <button type="button" class="ml-auto text-xs text-muted-foreground underline" onclick={onclear}>Clear all filters</button>
    {/if}
  </div>

  {#if view.q || FILTER_KEYS.some((k) => view[k].length > 0)}
    <ul class="flex flex-wrap gap-1" aria-label="Active filters">
      {#if view.q}
        <li>
          <button type="button" class="rounded-full border border-border bg-muted px-2 py-0.5 text-xs" aria-label={`Remove search ${view.q}`} onclick={() => onchange({ q: "", page: 1 })}>
            search: {view.q} ×
          </button>
        </li>
      {/if}
      {#each FILTER_KEYS as k (k)}
        {#each view[k] as v (v)}
          <li>
            <button type="button" class="rounded-full border border-border bg-muted px-2 py-0.5 text-xs" aria-label={`Remove ${TITLES[k]} ${words(v)}`} onclick={() => toggle(k, v)}>
              {TITLES[k].toLowerCase()}: {words(v)} ×
            </button>
          </li>
        {/each}
      {/each}
    </ul>
  {/if}
</form>
