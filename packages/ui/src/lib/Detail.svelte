<script lang="ts">
  // L3: what is behind a row. Why it is flagged, its sessions (derived ones nested), files by base name,
  // where it lives, the timeline and proofs (Trace), and actions. Every string renders as text.
  import { projectNameOf, type ItemDetailView, type ItemSession, type TraceResponse } from "@vantage/core/track";
  import type { TrackRow } from "./contract";
  import { branchLink, cdCommand, commitLink, repoLink, resumeCommand } from "./links";
  import { sessionLabel } from "./proof-line";
  import { ago } from "./relative-time";
  import { nestSessions, type SessionNode } from "./sessions";
  import Trace from "./Trace.svelte";

  let {
    item,
    trace,
    detail,
    detailFailed,
    traceFailed,
    now,
    repoUrl,
  }: {
    item: TrackRow;
    trace: TraceResponse | null;
    detail: ItemDetailView | null;
    detailFailed: boolean;
    traceFailed: boolean;
    now: Date;
    repoUrl: string | null;
  } = $props();

  const FILES_SHOWN = 6;
  const tree = $derived(detail ? nestSessions(detail.sessions) : []);
  const branch = $derived(item.branch ?? detail?.branch ?? null);
  const branchUrl = $derived(branchLink(repoUrl, branch));
  const commitUrl = $derived(commitLink(repoUrl, detail?.lastCommitSha));
  const cd = $derived(cdCommand(detail?.worktreePath));
  const files = $derived(detail?.files.names ?? []);
  const hiddenFiles = $derived(Math.max(0, (detail?.files.total ?? 0) - Math.min(files.length, FILES_SHOWN)));
  let copied = $state<string | null>(null);

  /** The newest session is the one to reopen from the item's action bar. */
  const latest = $derived(
    detail ? ([...detail.sessions].toSorted((a, b) => (a.lastAt < b.lastAt ? 1 : -1))[0] ?? null) : null,
  );
  const resumeLatest = $derived(latest ? resumeCommand(latest.id, latest.cwd ?? detail?.worktreePath) : null);

  async function copy(what: string, text: string): Promise<void> {
    try {
      await navigator.clipboard.writeText(text);
      copied = what;
    } catch {
      copied = `Could not copy ${what.toLowerCase()}`;
    }
  }
</script>

{#snippet sessionNode(n: SessionNode, depth: number)}
  <li>
    <span class="text-muted-foreground" style={`padding-left: ${depth * 1}rem`}>
      {#if depth > 0}continues above:{" "}{/if}<span class="text-foreground" title={n.session.id}>{sessionLabel(n.session.name, n.session.id)}</span>, {ago(n.session.lastAt, now)}, {n.session.events} events
    </span>
    {#if resumeCommand(n.session.id, n.session.cwd)}
      <button type="button" class="ml-2 rounded-md border border-border px-1.5 text-xs hover:bg-muted" onclick={() => void copy("Resume command", resumeCommand(n.session.id, n.session.cwd) ?? "")}>Open in Claude</button>
    {/if}
    {#if n.children.length > 0}
      <ul>
        {#each n.children as c (c.session.id)}{@render sessionNode(c, depth + 1)}{/each}
      </ul>
    {/if}
  </li>
{/snippet}

<div class="space-y-3 border-t border-border bg-muted/50 px-4 py-3 text-sm" aria-label="Details">
  {#if item.flags.length > 0}
    <section>
      <h3 class="font-medium">Why it needs you</h3>
      <ul>
        {#each item.flags as f (f.kind)}
          <li class="text-muted-foreground">{f.reason}</li>
        {/each}
      </ul>
    </section>
  {/if}

  {#if detail}
    <section>
      <h3 class="font-medium">Sessions · {detail.sessions.length}</h3>
      {#if tree.length > 0}
        <ul>{#each tree as n (n.session.id)}{@render sessionNode(n, 0)}{/each}</ul>
      {:else}
        <p class="text-muted-foreground">No session linked.</p>
      {/if}
    </section>
    <section>
      <h3 class="font-medium">Files touched · {detail.files.total}</h3>
      {#if files.length > 0}
        <p class="text-muted-foreground">
          {files.slice(0, FILES_SHOWN).join(", ")}{#if hiddenFiles > 0}{" "}
            <details class="inline">
              <summary class="inline cursor-pointer underline">and {hiddenFiles} more</summary>
              <span>{files.slice(FILES_SHOWN).join(", ")}{#if detail.files.total > files.length}, and {detail.files.total - files.length} not listed{/if}</span>
            </details>
          {/if}
        </p>
      {:else}
        <p class="text-muted-foreground">No edited file recorded.</p>
      {/if}
    </section>
    <section>
      <h3 class="font-medium">Where it lives</h3>
      <ul class="text-muted-foreground">
        {#if detail.repos.length > 0}
          <li>
            {detail.repos.length > 1 ? "Repos" : "Repo"}:
            {#each detail.repos as r (r)}
              {@const url = repoLink(r)}
              {#if url}<a class="mr-1 rounded-full border border-border px-1.5 hover:bg-muted" href={url} target="_blank" rel="noopener noreferrer" title={r}>{projectNameOf(r) ?? r}</a>{:else}<span class="mr-1 rounded-full border border-border px-1.5" title={r}>{projectNameOf(r) ?? r}</span>{/if}
            {/each}
          </li>
        {/if}
        {#if branch}<li>Branch: <code>{branch}</code></li>{/if}
        {#if detail.lastCommitSha}<li>Last commit: <code>{detail.lastCommitSha.slice(0, 10)}</code></li>{/if}
        {#if detail.worktreePath}<li>Folder: <code>{detail.worktreePath}</code></li>{/if}
      </ul>
    </section>
  {:else if detailFailed}
    <p class="text-muted-foreground">Sessions and files are not available right now.</p>
  {:else}
    <p class="text-muted-foreground">Loading…</p>
  {/if}

  {#if trace}<Trace {trace} embedded />{:else if traceFailed}<p class="text-muted-foreground">History is not available right now.</p>{:else}<p class="text-muted-foreground">Loading…</p>{/if}

  <section aria-label="Actions" class="flex flex-wrap items-center gap-2">
    {#if branchUrl}
      <a class="rounded-md border border-border px-2 py-1 text-xs hover:bg-muted" href={branchUrl} target="_blank" rel="noopener noreferrer">Open branch on the remote</a>
    {/if}
    {#if commitUrl}
      <a class="rounded-md border border-border px-2 py-1 text-xs hover:bg-muted" href={commitUrl} target="_blank" rel="noopener noreferrer">Open last commit</a>
    {/if}
    {#if branch}
      <button type="button" class="rounded-md border border-border px-2 py-1 text-xs hover:bg-muted" onclick={() => void copy("Branch name", branch)}>Copy branch name</button>
    {/if}
    {#if resumeLatest}
      <button type="button" class="rounded-md border border-border px-2 py-1 text-xs hover:bg-muted" title="Copies the command that reopens the latest session in its folder" onclick={() => void copy("Resume command", resumeLatest)}>Open in Claude</button>
    {/if}
    {#if cd}
      <button type="button" class="rounded-md border border-border px-2 py-1 text-xs hover:bg-muted" onclick={() => void copy("cd command", cd)}>Copy cd command</button>
    {/if}
    <span class="text-xs text-muted-foreground" role="status">{#if copied}{copied.startsWith("Could not") ? copied : `${copied} copied`}{/if}</span>
  </section>
</div>
