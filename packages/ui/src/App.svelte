<script lang="ts">
  import { onMount } from "svelte";
  import type { TraceResponse, TrackItem, TrackResponse } from "@vantage/core/track";
  import { describeError, fetchTrace, fetchTrack } from "$lib/api";
  import Dots from "$lib/Dots.svelte";
  import { applyPush, startLive } from "$lib/live";
  import Trace from "$lib/Trace.svelte";
  import { ago } from "$lib/relative-time";

  const POLL_MS = 5000;

  let data = $state<TrackResponse | null>(null);
  let error = $state<string | null>(null);
  let loading = $state(true);
  let now = $state(new Date());
  let selected = $state<string | null>(null);
  let open = $state<string | null>(null);
  let trace = $state<TraceResponse | null>(null);
  let showKeys = $state(false);
  // True while the socket is open: pushes replace polling (D81).
  let live = $state(false);

  const flat = $derived<TrackItem[]>(data ? data.groups.flatMap((g) => g.items) : []);
  const total = $derived(flat.length);
  const unconfigured = $derived(data ? data.sources.filter((s) => s.state === "unconfigured") : []);
  const flagOf = (i: TrackItem): string => i.flags[0]?.reason ?? "";

  async function load(): Promise<void> {
    try {
      data = await fetchTrack();
      error = null;
    } catch (e) {
      error = describeError(e);
    } finally {
      loading = false;
      now = new Date();
    }
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

  function onKey(e: KeyboardEvent): void {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    const el = e.target;
    if (el instanceof HTMLElement && (el.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(el.tagName))) return;
    if (e.key === "j") move(1);
    else if (e.key === "k") move(-1);
    else if (e.key === "Enter" && selected) void toggle(selected);
    else if (e.key === "Escape") {
      if (showKeys) showKeys = false;
      else {
        open = null;
        trace = null;
      }
    } else if (e.key === "?") showKeys = !showKeys;
  }

  onMount(() => {
    void load();
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
        const next = applyPush(data, push);
        if (next) {
          data = next;
          error = null;
          now = new Date();
        } else void load();
      },
      onDown() {
        live = false;
      },
    });
    return () => {
      clearInterval(t);
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
      <button class="text-sm text-muted-foreground underline" onclick={() => (showKeys = !showKeys)}>? keys</button>
    </header>

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
    {:else if data && total === 0}
      <p class="py-12 text-center text-muted-foreground">No work yet. Run <code>vantage init</code> in a repo to start.</p>
    {:else if data}
      {#each data.groups as g (g.attention)}
        {#if g.items.length > 0}
          <section class="mb-5" aria-label={g.label}>
            <h2 class="mb-1 text-sm font-medium text-muted-foreground">{g.label} · {g.items.length}</h2>
            <ul class="overflow-hidden rounded-lg border border-border">
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
                      <span class="block truncate text-xs text-muted-foreground">{item.repo ?? item.id}</span>
                    </span>
                    <Dots {item} />
                    <span class="hidden w-56 truncate text-xs text-muted-foreground sm:block">{flagOf(item)}</span>
                    <span class="w-20 text-right text-xs text-muted-foreground">{ago(item.lastActivity, now)}</span>
                  </button>
                  {#if open === item.id}
                    {#if trace}<Trace {trace} />{:else}<p class="px-4 py-3 text-sm text-muted-foreground">Loading…</p>{/if}
                  {/if}
                </li>
              {/each}
            </ul>
          </section>
        {/if}
      {/each}
      {#if unconfigured.length > 0}
        <p class="text-xs text-muted-foreground">
          Not set up, so those stages stay hollow: {unconfigured.map((s) => s.source).join(", ")}.
        </p>
      {/if}
    {/if}

    {#if showKeys}
      <aside class="fixed bottom-4 right-4 rounded-lg border border-border bg-background p-4 text-sm shadow" aria-label="Keyboard map">
        <p><kbd>j</kbd> / <kbd>k</kbd> next, previous row</p>
        <p><kbd>Enter</kbd> why this row looks this way</p>
        <p><kbd>Esc</kbd> close</p>
        <p><kbd>?</kbd> this map</p>
      </aside>
    {/if}
  </main>
</div>
