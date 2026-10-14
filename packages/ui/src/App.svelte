<script lang="ts">
  import { onMount } from "svelte";
  import type { TraceResponse } from "@vantage/core/track";
  import { describeError, fetchTrace, fetchTrack } from "$lib/api";
  import { COLLAPSED_BY_DEFAULT, GROUP_VALUES, type GroupBy, type TrackRow, type TrackView } from "$lib/contract";
  import Dots from "$lib/Dots.svelte";
  import { foldGroups } from "$lib/fold";
  import Legend from "$lib/Legend.svelte";
  import { stageLabel } from "$lib/stage-label";
  import { applyPush, mergeCounts, startLive } from "$lib/live";
  import Pagination from "$lib/Pagination.svelte";
  import Toolbar from "$lib/Toolbar.svelte";
  import Trace from "$lib/Trace.svelte";
  import { ago } from "$lib/relative-time";
  import { activeFilters, blockers, clearFilters, parseView, toQuery, type ViewState } from "$lib/view";

  const POLL_MS = 5000;
  const FACET_REFRESH_MS = 1000;
  // Only the query string of the view is remembered here; the token never goes to localStorage (D75).
  const VIEW_KEY = "vantage.view";
  const SINCE_WORDS = { "24h": "24 hours", "7d": "7 days", "30d": "30 days", all: "all time" } as const;
  const FILTER_WORDS: Record<string, string> = {
    repo: "repo",
    branch: "branch",
    stage: "stage",
    proof: "proof",
    flag: "flag",
    hasEdits: "has code edits",
    search: "search",
    since: "time range",
  };

  function remembered(): string {
    try {
      return localStorage.getItem(VIEW_KEY) ?? "";
    } catch {
      return "";
    }
  }
  function initialView(): ViewState {
    const fromUrl = window.location.search.slice(1);
    if (fromUrl) return parseView(fromUrl);
    const saved = parseView(remembered());
    syncUrl(saved, true);
    return saved;
  }
  function syncUrl(v: ViewState, replace: boolean): void {
    const q = toQuery(v);
    // Path and query only: no fragment, so no token can ride along in the address bar or history.
    const url = window.location.pathname + (q ? `?${q}` : "");
    if (url === window.location.pathname + window.location.search) return;
    if (replace) history.replaceState(null, "", url);
    else history.pushState(null, "", url);
  }

  let view = $state<ViewState>(initialView());
  let data = $state<TrackView | null>(null);
  let error = $state<string | null>(null);
  let loading = $state(true);
  // True while a request for the current view is in flight and the previous rows are still shown.
  let refreshing = $state(false);
  let now = $state(new Date());
  let selected = $state<string | null>(null);
  let open = $state<string | null>(null);
  let trace = $state<TraceResponse | null>(null);
  let showKeys = $state(false);
  let showLegend = $state(false);
  // True while the socket is open: pushes replace polling (D81).
  let live = $state(false);
  // Groups the user opened or closed; anything else follows COLLAPSED_BY_DEFAULT.
  let collapsedBy = $state<Record<string, boolean>>({});
  let searchEl = $state<HTMLInputElement | null>(null);

  let seq = 0;
  let controller: AbortController | null = null;
  let facetTimer: ReturnType<typeof setTimeout> | null = null;

  const isCollapsed = (id: string): boolean => collapsedBy[id] ?? COLLAPSED_BY_DEFAULT.includes(id);
  const groups = $derived(data ? foldGroups(view, data, now) : []);
  const flat = $derived<TrackRow[]>(groups.filter((g) => !isCollapsed(g.id)).flatMap((g) => g.items));
  const unconfigured = $derived(data ? data.sources.filter((s) => s.state === "unconfigured") : []);
  const filters = $derived(activeFilters(view));
  const why = $derived(data && data.page.total === 0 ? blockers(view, data.facets).filter((b) => b.wouldShow !== 0) : []);
  const nothingAtAll = $derived(
    data !== null && data.page.total === 0 && filters.length === 0 && why.length === 0,
  );

  async function load(): Promise<void> {
    const mine = ++seq;
    controller?.abort();
    const ctl = new AbortController();
    controller = ctl;
    refreshing = true;
    try {
      const next = await fetchTrack(toQuery(view, true), ctl.signal);
      if (mine !== seq) return;
      // A page past the end (a shared link, or rows that vanished): land on the last real page.
      if (next.page.pages > 0 && view.page > next.page.pages) {
        go({ page: next.page.pages }, true);
        return;
      }
      data = next;
      error = null;
    } catch (e) {
      if (mine !== seq) return;
      error = describeError(e);
    } finally {
      if (mine === seq) {
        loading = false;
        refreshing = false;
        now = new Date();
      }
    }
  }

  /** Changes the view: URL, local memory and a reload. `replace` keeps history short while typing. */
  function go(patch: Partial<ViewState>, replace = false): void {
    view = { ...view, ...patch };
    syncUrl(view, replace);
    try {
      localStorage.setItem(VIEW_KEY, toQuery(view));
    } catch {
      // Storage blocked: the URL still carries the view.
    }
    selected = null;
    open = null;
    trace = null;
    void load();
  }

  function scheduleFacets(): void {
    if (facetTimer) return;
    facetTimer = setTimeout(async () => {
      facetTimer = null;
      const asked = toQuery(view, true);
      const mine = seq;
      try {
        const fresh = await fetchTrack(asked);
        if (mine !== seq || asked !== toQuery(view, true) || !data) return;
        data = mergeCounts(data, fresh);
      } catch {
        // Counts stay as they were; the next push or poll tries again.
      }
    }, FACET_REFRESH_MS);
  }

  async function toggle(id: string): Promise<void> {
    if (open === id) {
      open = null;
      trace = null;
      return;
    }
    open = id;
    trace = null;
    try {
      const t = await fetchTrace(id);
      if (open === id) trace = t;
    } catch (e) {
      error = describeError(e);
    }
  }

  function move(step: number): void {
    if (flat.length === 0) return;
    const at = flat.findIndex((i) => i.id === selected);
    const next = Math.min(flat.length - 1, Math.max(0, at < 0 ? (step > 0 ? 0 : flat.length - 1) : at + step));
    selected = flat[next]?.id ?? null;
    document.getElementById(`row-${next}`)?.scrollIntoView({ block: "nearest" });
  }

  function turn(step: number): void {
    if (!data) return;
    const n = view.page + step;
    if (n >= 1 && n <= data.page.pages) go({ page: n });
  }

  const KEY_GROUP: Record<string, GroupBy> = { "1": GROUP_VALUES[0], "2": GROUP_VALUES[1], "3": GROUP_VALUES[2], "4": GROUP_VALUES[3] };

  function onKey(e: KeyboardEvent): void {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    const el = e.target;
    if (el instanceof HTMLElement && (el.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(el.tagName))) return;
    const group = KEY_GROUP[e.key];
    if (e.key === "j") move(1);
    else if (e.key === "k") move(-1);
    else if (e.key === "Enter" && selected) void toggle(selected);
    else if (e.key === "/") {
      e.preventDefault();
      searchEl?.focus();
    } else if (e.key === "]") turn(1);
    else if (e.key === "[") turn(-1);
    else if (group && group !== view.group) go({ group, page: 1 });
    else if (e.key === "Escape") {
      if (showKeys || showLegend) {
        showKeys = false;
        showLegend = false;
      } else {
        open = null;
        trace = null;
      }
    } else if (e.key === "?") {
      const next = !(showKeys || showLegend);
      showKeys = next;
      showLegend = next;
    }
  }

  function relax(filter: string): void {
    if (filter === "search") go({ q: "", page: 1 });
    else if (filter === "since") go({ since: "all", page: 1 });
    else if (filter === "hasEdits") go({ hasEdits: null, page: 1 });
    else go({ [filter]: [], page: 1 });
  }

  onMount(() => {
    void load();
    const onPop = (): void => {
      view = parseView(window.location.search.slice(1));
      selected = null;
      open = null;
      trace = null;
      void load();
    };
    window.addEventListener("popstate", onPop);
    const t = setInterval(() => {
      if (!live) void load();
    }, POLL_MS);
    const stop = startLive({
      onOpen() {
        live = true;
        void load();
      },
      onPush(push) {
        if (!data) return;
        const { view: next, refresh } = applyPush(data, push);
        data = next;
        error = null;
        now = new Date();
        if (refresh === "full") void load();
        else if (refresh === "facets") scheduleFacets();
      },
      onDown() {
        live = false;
      },
    });
    return () => {
      window.removeEventListener("popstate", onPop);
      clearInterval(t);
      if (facetTimer) clearTimeout(facetTimer);
      controller?.abort();
      stop();
    };
  });
</script>

<svelte:window onkeydown={onKey} />

<div
  class="min-h-screen"
  style="--dot-green: oklch(0.65 0.17 150); --dot-blue: oklch(0.6 0.17 250); --dot-amber: oklch(0.75 0.16 75); --dot-red: oklch(0.6 0.22 27); --dot-gray: oklch(0.6 0 0); --dot-light: oklch(0.8 0 0);"
>
  <main class="mx-auto max-w-4xl p-6">
    <header class="mb-4 flex items-baseline justify-between">
      <h1 class="text-xl font-semibold">Track</h1>
      <span class="flex gap-3 text-sm">
        <button
          type="button"
          class="text-muted-foreground underline"
          aria-expanded={showLegend}
          aria-controls="dot-legend"
          onclick={() => (showLegend = !showLegend)}
        >
          What the dots mean
        </button>
        <button type="button" class="text-muted-foreground underline" onclick={() => (showKeys = !showKeys)}>? keys</button>
      </span>
    </header>

    {#if showLegend}<Legend onclose={() => (showLegend = false)} />{/if}

    {#if data?.stale}
      <p class="mb-3 rounded-lg border border-border bg-muted px-3 py-2 text-sm" role="status">
        Rows not refreshed since {data.lastPassAt ? ago(data.lastPassAt, now) : "start"}. Is the daemon running?
      </p>
    {/if}
    {#if error}
      <p class="mb-3 rounded-lg border border-border bg-muted px-3 py-2 text-sm" role="alert">{error}</p>
    {/if}

    {#if data}
      <Toolbar {view} facets={data.facets} onchange={go} onclear={() => go(clearFilters(view))} bind:searchEl />
    {/if}

    {#if loading}
      <ul class="space-y-2" aria-label="Loading" aria-busy="true">
        {#each [0, 1, 2, 3] as n (n)}
          <li class="h-11 animate-pulse rounded-lg bg-muted"></li>
        {/each}
      </ul>
    {:else if data && nothingAtAll}
      <p class="py-12 text-center text-muted-foreground">No work yet. Run <code>vantage init</code> in a repo to start.</p>
    {:else if data && data.page.total === 0}
      <section class="rounded-lg border border-border p-4 text-sm" aria-label="No results">
        <p class="font-medium">
          {filters.length === 0 ? `Nothing active in the last ${SINCE_WORDS[view.since]}.` : "Nothing matches these filters."}
        </p>
        <ul class="mt-2 space-y-1">
          {#each why as b (b.filter)}
            <li>
              The {FILTER_WORDS[b.filter] ?? b.filter} filter hides {b.wouldShow === null ? "everything that matched the rest" : `${b.wouldShow} ${b.wouldShow === 1 ? "item" : "items"}`}.
              <button type="button" class="underline" onclick={() => relax(b.filter)}>Remove it</button>
            </li>
          {/each}
        </ul>
        {#if filters.length > 0}
          <button type="button" class="mt-3 underline" onclick={() => go(clearFilters(view))}>Clear all filters</button>
        {/if}
      </section>
    {:else if data}
      {#if refreshing}<p class="sr-only" role="status">Updating</p>{/if}
      <div class:opacity-60={refreshing} aria-busy={refreshing}>
        {#each groups as g (g.id)}
          {@const collapsed = isCollapsed(g.id)}
          <section class="mb-5" aria-label={g.label}>
            {#if view.group !== "none"}
              <h2 class="mb-1 text-sm font-medium text-muted-foreground">
                <button
                  type="button"
                  class="flex items-center gap-1"
                  aria-expanded={!collapsed}
                  aria-controls={`group-${g.id}`}
                  onclick={() => (collapsedBy[g.id] = !collapsed)}
                >
                  <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
                    {#if collapsed}<path d="M4 2l4 4-4 4" />{:else}<path d="M2 4l4 4 4-4" />{/if}
                  </svg>
                  {g.label} · {g.total}{#if g.items.length !== g.total}<span class="font-normal">{" "}({g.items.length} on this page)</span>{/if}
                </button>
              </h2>
            {/if}
            {#if !collapsed}
              <ul id={`group-${g.id}`} class="overflow-hidden rounded-lg border border-border">
                {#each g.items as item (item.id)}
                  {@const idx = flat.indexOf(item)}
                  <li class="border-b border-border last:border-b-0" aria-current={selected === item.id}>
                    <button
                      id={`row-${idx}`}
                      class="flex w-full items-center gap-4 px-4 py-2 text-left hover:bg-muted"
                      class:bg-muted={selected === item.id}
                      aria-expanded={open === item.id}
                      onclick={() => {
                        selected = item.id;
                        void toggle(item.id);
                      }}
                    >
                      <span class="min-w-0 flex-1">
                        <span class="block truncate font-medium">{item.title}</span>
                        <span class="block truncate text-xs text-muted-foreground">{item.repo ?? item.id}{#if (item.sessionCount ?? 0) > 1}<span> · {item.sessionCount} sessions</span>{/if}<span class="md:hidden"> · {stageLabel(item)}</span></span>
                      </span>
                      <Dots {item} />
                      <span class="hidden w-44 shrink-0 text-xs md:block">{stageLabel(item)}</span>
                      <span class="hidden w-56 sm:block">
                        {#each item.flags as f (f.kind)}
                          <span class="block truncate text-xs text-muted-foreground" title={f.reason}>{f.reason}</span>
                        {/each}
                      </span>
                      <span class="w-20 text-right text-xs text-muted-foreground">{ago(item.lastActivity, now)}</span>
                    </button>
                    {#if open === item.id}
                      {#if trace}<Trace {trace} />{:else}<p class="px-4 py-3 text-sm text-muted-foreground">Loading…</p>{/if}
                    {/if}
                  </li>
                {/each}
              </ul>
            {/if}
          </section>
        {/each}
      </div>
      <Pagination page={data.page} onpage={(n) => go({ page: n })} onsize={(n) => go({ pageSize: n, page: 1 })} />
      {#if unconfigured.length > 0}
        <p class="mt-4 text-xs text-muted-foreground">
          Not set up, so those stages stay hollow: {unconfigured.map((s) => s.source).join(", ")}.
        </p>
      {/if}
    {/if}

    {#if showKeys}
      <aside class="fixed bottom-4 right-4 rounded-lg border border-border bg-background p-4 text-sm shadow" aria-label="Keyboard map">
        <p><kbd>j</kbd> / <kbd>k</kbd> next, previous row</p>
        <p><kbd>Enter</kbd> why this row looks this way</p>
        <p><kbd>/</kbd> search</p>
        <p><kbd>[</kbd> / <kbd>]</kbd> previous, next page</p>
        <p><kbd>1</kbd> / <kbd>2</kbd> / <kbd>3</kbd> / <kbd>4</kbd> group by attention, repo, stage, none</p>
        <p><kbd>Esc</kbd> close</p>
        <p><kbd>?</kbd> this map</p>
      </aside>
    {/if}
  </main>
</div>
