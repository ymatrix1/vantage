<script lang="ts">
  import Select from "./Select.svelte";
  import { PAGE_SIZES, type PageInfo } from "./contract";

  let {
    page,
    onpage,
    onsize,
    top = false,
  }: {
    page: PageInfo;
    onpage: (n: number) => void;
    onsize: (n: number) => void;
    /** The pager above the list: its own landmark name, and no page-size selector (the bottom one has it). */
    top?: boolean;
  } = $props();

  const first = $derived(page.total === 0 ? 0 : (page.page - 1) * page.pageSize + 1);
  const last = $derived(Math.min(page.total, page.page * page.pageSize));
  const atStart = $derived(page.page <= 1);
  const atEnd = $derived(page.page >= page.pages);
</script>

<nav class={top ? "mb-3 flex flex-wrap items-center justify-between gap-3 text-sm" : "mt-3 flex flex-wrap items-center justify-between gap-3 text-sm"} aria-label={top ? "Pages, top of list" : "Pages"}>
  <p class="text-muted-foreground" aria-live="polite">{first} to {last} of {page.total}</p>
  <div class="flex items-center gap-1">
    <button type="button" class="rounded-md border border-border px-2 py-1 disabled:opacity-40" disabled={atStart} aria-label="First page" onclick={() => onpage(1)}>First</button>
    <button type="button" class="rounded-md border border-border px-2 py-1 disabled:opacity-40" disabled={atStart} aria-label="Previous page" onclick={() => onpage(page.page - 1)}>Previous</button>
    <span class="px-2 text-muted-foreground">Page {page.page} of {Math.max(1, page.pages)}</span>
    <button type="button" class="rounded-md border border-border px-2 py-1 disabled:opacity-40" disabled={atEnd} aria-label="Next page" onclick={() => onpage(page.page + 1)}>Next</button>
    <button type="button" class="rounded-md border border-border px-2 py-1 disabled:opacity-40" disabled={atEnd} aria-label="Last page" onclick={() => onpage(page.pages)}>Last</button>
  </div>
  {#if !top}
  <div class="flex items-center gap-2 text-xs text-muted-foreground">
      <span>Per page</span>
      <Select
        label="Per page"
        value={String(page.pageSize)}
        options={PAGE_SIZES.map((n) => ({ value: String(n), label: String(n) }))}
        onchange={(v) => onsize(Number(v))}
      />
    </div>
  {/if}
</nav>
