<script lang="ts">
  import { onMount } from "svelte";
  import type { ItemDetailView, TraceResponse } from "@vantage/core/track";
  import { describeError, fetchItem, fetchTrace, fetchTrack } from "$lib/api";
  import { COLLAPSED_BY_DEFAULT, type GroupBy, type TrackRow, type TrackView } from "$lib/contract";
  import { foldGroups } from "$lib/fold";
  import Header from "$lib/Header.svelte";
  import Legend from "$lib/Legend.svelte";
  import Overview from "$lib/Overview.svelte";
  import { applyPush, mergeCounts, startLive } from "$lib/live";
  import Pagination from "$lib/Pagination.svelte";
  import { sectionsOf } from "$lib/projects";
  import Row from "$lib/Row.svelte";
  import { summaryOf, type Summary } from "$lib/summary";
  import Toolbar from "$lib/Toolbar.svelte";
  import { ago } from "$lib/relative-time";
  import { activeFilters, apiQuery, blockers, clearFilters, parseView, toQuery, type ViewState } from "$lib/view";

  const POLL_MS = 5000;
  const FACET_REFRESH_MS = 1000;
  const EXPAND_ALL_MAX = 20;
  // The overview asks for a page no list uses (25, 50, 100), so tests and logs can tell the two apart.
  const SUMMARY_PAGE = 30;
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
  let summary = $state<Summary | null>(null);
  let error = $state<string | null>(null);
  let loading = $state(true);
  // True while a request for the current view is in flight and the previous rows are still shown.
  let refreshing = $state(false);
  let now = $state(new Date());
  let selected = $state<string | null>(null);
  // Rows opened inline, with what was fetched for each (the trace and the item detail).
  let open = $state<Record<string, boolean>>({});
  let traces = $state<Record<string, TraceResponse>>({});
  let details = $state<Record<string, ItemDetailView>>({});
  let detailFailed = $state<Record<string, boolean>>({});
  let traceFailed = $state<Record<string, boolean>>({});
  let showKeys = $state(false);
  let showLegend = $state(false);
  // True while the socket is open: pushes replace polling (D81).
  let live = $state(false);
  // Sections the user opened or closed; anything else follows COLLAPSED_BY_DEFAULT.
  let collapsedBy = $state<Record<string, boolean>>({});
  function toggleHelp(): void {
    const next = !(showKeys || showLegend);
    showKeys = next;
    showLegend = next;
  }
  let searchEl = $state<HTMLInputElement | null>(null);

  let seq = 0;
  let controller: AbortController | null = null;
  let facetTimer: ReturnType<typeof setTimeout> | null = null;

  const isCollapsed = (id: string): boolean => collapsedBy[id] ?? COLLAPSED_BY_DEFAULT.includes(id);
  const sections = $derived(data ? sectionsOf(view.group, foldGroups(view, data, now), now) : []);
  const flat = $derived<TrackRow[]>(sections.filter((s) => !isCollapsed(s.id)).flatMap((s) => s.items));
  const unconfigured = $derived(data ? data.sources.filter((s) => s.state === "unconfigured") : []);
  const filters = $derived(activeFilters(view));
  const why = $derived(data && data.page.total === 0 ? blockers(view, data.facets).filter((b) => b.wouldShow !== 0) : []);
  const nothingAtAll = $derived(
    data !== null && data.page.total === 0 && filters.length === 0 && why.length === 0,
  );

  /** The header's counts: the same filters, grouped by attention, one row (only the totals matter). */
  async function loadSummary(): Promise<void> {
    const asked = toQuery({ ...view, group: "attention", sort: "activity", order: "desc", page: 1, pageSize: SUMMARY_PAGE }, true);
    try {
      const v = await fetchTrack(asked);
      if (asked === toQuery({ ...view, group: "attention", sort: "activity", order: "desc", page: 1, pageSize: SUMMARY_PAGE }, true)) summary = summaryOf(v);
    } catch {
      // The header keeps its last counts; the list has its own error line.
    }
  }

  async function load(): Promise<void> {
    const mine = ++seq;
    controller?.abort();
    const ctl = new AbortController();
    controller = ctl;
    refreshing = true;
    void loadSummary();
    try {
      const next = await fetchTrack(apiQuery(view), ctl.signal);
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
    open = {};
    void load();
  }

  function scheduleFacets(): void {
    if (facetTimer) return;
    facetTimer = setTimeout(async () => {
      facetTimer = null;
      const asked = apiQuery(view);
      const mine = seq;
      void loadSummary();
      try {
        const fresh = await fetchTrack(asked);
        if (mine !== seq || asked !== apiQuery(view) || !data) return;
        data = mergeCounts(data, fresh);
      } catch {
        // Counts stay as they were; the next push or poll tries again.
      }
    }, FACET_REFRESH_MS);
  }

  async function expand(id: string): Promise<void> {
    open[id] = true;
    delete detailFailed[id];
    delete traceFailed[id];
    const [t, d] = await Promise.allSettled([fetchTrace(id), fetchItem(id)]);
    if (t.status === "fulfilled") traces[id] = t.value;
    // One row's trace failing (a 404 for an item a pass removed) must not turn the whole page offline.
    else traceFailed[id] = true;
    if (d.status === "fulfilled") details[id] = d.value;
    else detailFailed[id] = true;
  }

  function collapse(id: string): void {
    delete open[id];
  }

  function toggle(id: string): void {
    if (open[id]) collapse(id);
    else void expand(id);
  }

  /** `e`: opens every row of the section the selected row is in (or the first open section). */
  function expandSection(): void {
    const open1 = sections.filter((s) => !isCollapsed(s.id));
    const sec = open1.find((s) => s.items.some((i) => i.id === selected)) ?? open1[0];
    for (const i of sec?.items.slice(0, EXPAND_ALL_MAX) ?? []) if (!open[i.id]) void expand(i.id);
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

  const KEY_GROUP: Record<string, GroupBy> = { "1": "attention", "2": "repo", "3": "stage", "4": "none" };

  function onKey(e: KeyboardEvent): void {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    const el = e.target;
    if (el instanceof HTMLElement && (el.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(el.tagName))) return;
    const group = KEY_GROUP[e.key];
    if (e.key === "j") move(1);
    else if (e.key === "k") move(-1);
    else if (e.key === "Enter" && selected) toggle(selected);
    else if (e.key === "e") expandSection();
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
      } else open = {};
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
      open = {};
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
  <main class="mx-auto max-w-4xl px-6 pb-6">
    <!-- Sticky: the summary line and the controls stay in view while the list scrolls. -->
    <div class="sticky top-0 z-20 -mx-6 mb-2 border-b border-border bg-background px-6 pt-4" data-testid="sticky-top">
      <div class="flex items-center justify-between gap-3">
        <h1 class="text-xl font-semibold">Track</h1>
        <button
          type="button"
          class="ctl ctl-icon text-muted-foreground"
          aria-expanded={showLegend}
          aria-controls="dot-legend"
          aria-label="Help: what the dots mean and the keyboard keys"
          title="What the dots mean, and keys (?)"
          onclick={toggleHelp}
        >
          ?
        </button>
      </div>
      <Header {summary} {view} {now} stale={data?.stale ?? false} offline={error !== null} onchange={go} />
      {#if data}
        <Toolbar {view} facets={data.facets} onchange={go} onclear={() => go(clearFilters(view))} bind:searchEl />
      {/if}
    </div>

    {#if showLegend}<Legend onclose={() => (showLegend = false)} />{/if}
    {#if data && !nothingAtAll}<Overview {summary} {now} onchange={go} />{/if}

    {#if data?.stale}
      <p class="mb-3 rounded-lg border border-border bg-muted px-3 py-2 text-sm" role="status">
        Rows not refreshed since {data.lastPassAt ? ago(data.lastPassAt, now) : "start"}. Is the daemon running?
      </p>
    {/if}
    {#if error}
      <p class="mb-3 rounded-lg border border-border bg-muted px-3 py-2 text-sm" role="alert">{error}</p>
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
      {#if data.page.pages > 1}<Pagination top page={data.page} onpage={(n) => go({ page: n })} onsize={(n) => go({ pageSize: n, page: 1 })} />{/if}
      <div class:opacity-60={refreshing} aria-busy={refreshing}>
        {#each sections as s (s.id)}
          {@const collapsed = isCollapsed(s.id)}
          <section class="mb-5" aria-label={s.label}>
            {#if view.group !== "none"}
              <div class="mb-1 flex flex-wrap items-baseline gap-x-3 text-sm text-muted-foreground">
                <h2 class="font-medium">
                  <button
                    type="button"
                    class="flex items-center gap-1"
                    aria-expanded={!collapsed}
                    aria-controls={`group-${s.id}`}
                    onclick={() => (collapsedBy[s.id] = !collapsed)}
                  >
                    <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
                      {#if collapsed}<path d="M4 2l4 4-4 4" />{:else}<path d="M2 4l4 4 4-4" />{/if}
                    </svg>
                    {s.label} · {s.total}{#if s.items.length !== s.total}<span class="font-normal">{" "}({s.items.length} on this page)</span>{/if}
                  </button>
                </h2>
                {#if s.needsYou !== null}
                  <span class="text-xs">{s.needsYou} need you, {s.inProgress} in progress{#if s.lastActivity}, last active {ago(s.lastActivity, now)}{/if}</span>
                {/if}
                {#if s.url}
                  <a class="text-xs underline" href={s.url} target="_blank" rel="noopener noreferrer" aria-label={`Open ${s.label} on the remote`}>repo</a>
                {/if}
              </div>
            {/if}
            {#if !collapsed}
              <ul id={`group-${s.id}`} class="overflow-hidden rounded-lg border border-border">
                {#each s.items as item (item.id)}
                  <Row
                    {item}
                    idx={flat.indexOf(item)}
                    selected={selected === item.id}
                    isOpen={open[item.id] === true}
                    {now}
                    trace={traces[item.id] ?? null}
                    detail={details[item.id] ?? null}
                    detailFailed={detailFailed[item.id] === true}
                    traceFailed={traceFailed[item.id] === true}
                    onselect={() => {
                      selected = item.id;
                      toggle(item.id);
                    }}
                  />
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
        <p><kbd>Enter</kbd> open or close the row's details</p>
        <p><kbd>e</kbd> open every row of this group</p>
        <p><kbd>/</kbd> search</p>
        <p><kbd>[</kbd> / <kbd>]</kbd> previous, next page</p>
        <p><kbd>1</kbd> / <kbd>2</kbd> / <kbd>3</kbd> / <kbd>4</kbd> group by attention, repo, stage, none</p>
        <p><kbd>Esc</kbd> close details</p>
        <p><kbd>?</kbd> this map</p>
      </aside>
    {/if}
  </main>
</div>
