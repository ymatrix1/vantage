<script lang="ts">
  // Why this item changed (D45): stage history, proofs and the events that linked in, by rule.
  import type { TraceResponse } from "@vantage/core/track";

  let { trace }: { trace: TraceResponse } = $props();
</script>

<div class="space-y-3 border-t border-border bg-muted/50 px-4 py-3 text-sm">
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
        <li class="text-muted-foreground">
          L{p.level} {p.state}{p.weakReason ? ` (${p.weakReason})` : ""}: <code>{p.command}</code>
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
