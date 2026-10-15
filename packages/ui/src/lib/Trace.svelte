<script lang="ts">
  // Why this item changed (D45): stage history, proofs and the events that linked in, by rule.
  import type { TraceResponse } from "@vantage/core/track";
  import { askedLine, proofLine } from "./proof-line";

  // `embedded` drops the panel chrome when the parent (the inline detail) already draws it.
  let { trace, embedded = false }: { trace: TraceResponse; embedded?: boolean } = $props();
  const now = new Date();
</script>

<div class={embedded ? "space-y-3" : "space-y-3 border-t border-border bg-muted/50 px-4 py-3 text-sm"}>
  <section>
    <h3 class="font-medium">What made it Asked</h3>
    <p class="text-muted-foreground">{trace.asked ? askedLine(trace.asked, now) : "No record of what started it."}</p>
  </section>
  <section>
    <h3 class="font-medium">Stage history</h3>
    <ul>
      {#each trace.transitions as t (t.at + t.to)}
        <li class="text-muted-foreground">{t.from ?? "start"} → {t.to}: {t.reason}</li>
      {:else}
        <li class="text-muted-foreground">No stage change yet.</li>
      {/each}
    </ul>
  </section>
  <section>
    <h3 class="font-medium">Proofs</h3>
    <ul>
      {#each trace.proofs as p (p.eventId)}
        {@const l = proofLine(p, now)}
        <li class="flex items-center gap-2 text-muted-foreground">
          <span class="inline-flex" role="img" aria-label={l.resultLabel} title={l.resultLabel}>
            <svg width="14" height="14" viewBox="0 0 16 16" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
              {#if l.result === "pass"}<path d="M3 8.5l3.5 3.5L13 4.5" />
              {:else if l.result === "fail"}<path d="M4 4l8 8M12 4l-8 8" />
              {:else if l.result === "stale"}<circle cx="8" cy="8" r="5.5" /><path d="M8 5v3.5l2 1.5" />
              {:else}<path d="M4 8h8" />{/if}
            </svg>
          </span>
          <span class="text-foreground">{l.kind}</span>
          <span>{l.resultLabel}{l.note ? `, ${l.note}` : ""} · L{l.level} · {l.age}{l.stale ? " · edited since" : ""}</span>
          <code class="min-w-0 truncate" title={l.command}>{l.command}</code>
        </li>
      {:else}
        <li class="text-muted-foreground">No proof recorded.</li>
      {/each}
    </ul>
  </section>
  <section>
    <h3 class="font-medium">Linked events</h3>
    <ul>
      {#each trace.events as e (e.eventId)}
        <li class="text-muted-foreground">
          {e.kind} from {e.source}, linked by {e.rule ?? "unknown rule"}{e.undone ? " (undone)" : ""}
        </li>
      {:else}
        <li class="text-muted-foreground">No events linked.</li>
      {/each}
    </ul>
  </section>
</div>
