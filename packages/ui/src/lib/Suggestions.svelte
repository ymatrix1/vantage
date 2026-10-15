<script lang="ts">
  // Classifier suggestions bar (docs/specs/classify.md#ui). Self-contained: it fetches its own data and tells the page
  // through `onchange` when titles may have changed. Nothing is applied without a preview the user confirms, and every
  // change is one batch with one undo. All text from the API renders as text.
  import { onMount } from "svelte";
  import {
    apply,
    decideOne,
    fetchOpen,
    fetchStatus,
    preview,
    startRun,
    undo,
    type ClassifyStatus,
    type Filter,
    type Kind,
    type Preview,
    type Suggestion,
  } from "./classify-client";

  let { onchange = () => {} }: { onchange?: () => void } = $props();

  let status = $state<ClassifyStatus | null>(null);
  let error = $state("");
  let notice = $state("");
  let reviewing = $state(false);
  let rows = $state<Suggestion[]>([]);
  let confirming = $state<Preview | null>(null);
  let action = $state<"accept" | "dismiss">("accept");
  let minConfidence = $state("0.8");
  let kind = $state<"all" | Kind>("all");
  let timer: ReturnType<typeof setTimeout> | undefined;

  const filter = (): Filter => ({
    ...(minConfidence === "0" ? {} : { minConfidence: Number(minConfidence) }),
    ...(kind === "all" ? {} : { kinds: [kind] }),
  });
  const open = $derived(status ? status.counts.open.title + status.counts.open.topic + status.counts.open.group : 0);

  async function refresh(): Promise<void> {
    try {
      status = await fetchStatus();
      error = "";
      if (reviewing) rows = (await fetchOpen()).rows;
      if (status.job.state === "running") timer = setTimeout(refresh, 2000);
    } catch {
      error = "Can't read suggestions. Is the daemon running?";
    }
  }
  onMount(() => {
    void refresh();
    return () => clearTimeout(timer);
  });

  async function run(fn: () => Promise<void>): Promise<void> {
    try {
      await fn();
      error = "";
    } catch {
      error = "That did not work. Nothing was changed.";
    }
  }

  const begin = (a: "accept" | "dismiss") =>
    run(async () => {
      action = a;
      confirming = await preview(a, filter());
    });
  const repreview = () => (confirming ? run(async () => { confirming = await preview(action, filter()); }) : undefined);
  const confirm = () =>
    run(async () => {
      if (!confirming) return;
      const r = await apply(action, filter(), confirming.token);
      notice = `${action === "accept" ? "Accepted" : "Dismissed"} ${r.total}.`;
      confirming = null;
      await refresh();
      onchange();
    });
  const decide = (a: "accept" | "dismiss", id: number) =>
    run(async () => {
      await decideOne(a, id);
      await refresh();
      onchange();
    });
  const undoLast = () =>
    run(async () => {
      const r = await undo();
      notice = `Undid a batch of ${r.undone.total}.`;
      await refresh();
      onchange();
    });
  const classify = () =>
    run(async () => {
      await startRun();
      notice = "Classifying in the background. You can keep working.";
      await refresh();
    });
  const toggleReview = () =>
    run(async () => {
      reviewing = !reviewing;
      if (reviewing) rows = (await fetchOpen()).rows;
    });
</script>

{#if status}
  <section class="mb-4 rounded-lg border border-border p-3 text-sm" aria-label="Suggestions">
    <div class="flex flex-wrap items-center gap-2">
      <h2 class="font-medium">Suggestions</h2>
      {#if open > 0}
        <span data-testid="counts" class="text-muted-foreground"
          >{status.counts.open.title} titles · {status.counts.open.topic} topics · {status.counts.open.group} groups</span
        >
        <button type="button" class="rounded border border-border px-2 py-0.5" onclick={() => begin("accept")}>Accept all…</button>
        <button type="button" class="rounded border border-border px-2 py-0.5" onclick={toggleReview}>
          {reviewing ? "Hide review" : "Review"}
        </button>
        <button type="button" class="rounded border border-border px-2 py-0.5" onclick={() => begin("dismiss")}>Dismiss all…</button>
      {:else if status.enabled}
        <span class="text-muted-foreground">None waiting.</span>
      {:else}
        <span class="text-muted-foreground">The classifier is off. Run `vantage classify --dry-run` to see what it would send.</span>
      {/if}
      {#if status.lastBatch}
        <button type="button" class="rounded border border-border px-2 py-0.5" onclick={undoLast}>
          Undo this batch ({status.lastBatch.total})
        </button>
      {/if}
      {#if status.enabled && status.job.state === "idle"}
        <button type="button" class="ml-auto rounded border border-border px-2 py-0.5" onclick={classify}>Classify now</button>
      {/if}
    </div>

    {#if status.job.state === "running"}
      <p class="mt-2 text-muted-foreground" role="status">
        Classifying: {status.job.callsDone} of {status.job.callsPlanned} calls, {status.job.suggestions} suggestions.
      </p>
    {:else if status.job.capReached || status.job.stoppedEarly}
      <p class="mt-2 text-muted-foreground" role="status">
        {status.job.capReached ? "Stopped at the daily call cap." : "Stopped after repeated failures; those items have no suggestion."}
      </p>
    {/if}
    {#if status.job.lastAuto && status.job.lastAuto.total > 0}
      <p class="mt-2" role="status">Auto-accept applied {status.job.lastAuto.total}. Use "Undo this batch" to revert it.</p>
    {/if}
    {#if notice}<p class="mt-2" role="status">{notice}</p>{/if}
    {#if error}<p class="mt-2 text-red-600" role="alert">{error}</p>{/if}

    {#if confirming}
      <div class="mt-3 rounded border border-border p-3" data-testid="preview">
        <p class="font-medium">
          {action === "accept" ? "Accept" : "Dismiss"} {confirming.total} suggestions? Nothing is applied until you confirm.
        </p>
        <p class="text-muted-foreground">
          {confirming.byKind.title} titles · {confirming.byKind.topic} topics · {confirming.byKind.group} groups
        </p>
        <div class="my-2 flex flex-wrap gap-3">
          <label
            >Confidence
            <select bind:value={minConfidence} onchange={repreview}>
              <option value="0.9">at least 0.9</option>
              <option value="0.8">at least 0.8</option>
              <option value="0.5">at least 0.5</option>
              <option value="0">any</option>
            </select>
          </label>
          <label
            >Kind
            <select bind:value={kind} onchange={repreview}>
              <option value="all">all</option>
              <option value="title">titles</option>
              <option value="topic">topics</option>
              <option value="group">groups</option>
            </select>
          </label>
        </div>
        <ul class="mb-2 space-y-1">
          {#each confirming.sample as s (s.id)}
            <li>
              <span class="text-muted-foreground">{s.kind} {s.confidence.toFixed(2)}</span>
              {s.itemTitle} → <span class="font-medium">{s.summary}</span>
            </li>
          {/each}
        </ul>
        <div class="flex gap-2">
          <button type="button" class="rounded border border-border px-2 py-0.5 font-medium" disabled={confirming.total === 0} onclick={confirm}>
            Confirm: {action === "accept" ? "accept" : "dismiss"} {confirming.total}
          </button>
          <button type="button" class="rounded border border-border px-2 py-0.5" onclick={() => (confirming = null)}>Cancel</button>
        </div>
      </div>
    {/if}

    {#if reviewing}
      <ul class="mt-3 space-y-1" data-testid="review">
        {#each rows as s (s.id)}
          <li class="flex flex-wrap items-baseline gap-2">
            <span class="text-muted-foreground">{s.kind} {s.confidence.toFixed(2)}</span>
            <span>{s.itemTitle} → <span class="font-medium">{s.summary}</span></span>
            {#if s.reason}<span class="text-xs text-muted-foreground">{s.reason}</span>{/if}
            <button type="button" class="ml-auto rounded border border-border px-2 py-0.5" onclick={() => decide("accept", s.id)}>Accept</button>
            <button type="button" class="rounded border border-border px-2 py-0.5" onclick={() => decide("dismiss", s.id)}>Dismiss</button>
          </li>
        {:else}
          <li class="text-muted-foreground">Nothing to review.</li>
        {/each}
      </ul>
    {/if}
  </section>
{/if}
