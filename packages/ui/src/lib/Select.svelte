<script lang="ts">
  // A themed single-choice list (D184). Replaces the native <select>, whose open list is drawn by the
  // browser or OS and ignores the dark theme. Pattern: the WAI-ARIA select-only combobox, so the keys are
  // Arrow Up and Down, Home, End, Enter and Space to choose, Esc to close and typing to jump to an option.
  // No portal: the list sits under the button, so it works in the sticky toolbar and in tests.
  interface Option {
    value: string;
    label: string;
  }

  let {
    value,
    options,
    label,
    onchange,
    class: cls = "",
  }: {
    value: string;
    options: readonly Option[];
    /** The accessible name (the visible label sits next to the control). */
    label: string;
    onchange: (value: string) => void;
    class?: string;
  } = $props();

  const uid = $props.id();
  const listId = `${uid}-list`;
  let open = $state(false);
  let active = $state(0);
  let button = $state<HTMLButtonElement | null>(null);
  let list = $state<HTMLUListElement | null>(null);
  let typed = "";
  let typedTimer: ReturnType<typeof setTimeout> | null = null;

  const selectedIndex = $derived(Math.max(0, options.findIndex((o) => o.value === value)));
  const current = $derived(options[selectedIndex]?.label ?? "");

  const reveal = (): void =>
    queueMicrotask(() => list?.querySelector("[data-active='true']")?.scrollIntoView?.({ block: "nearest" }));

  function show(): void {
    active = selectedIndex;
    open = true;
    reveal();
  }
  function close(refocus = true): void {
    open = false;
    if (refocus) button?.focus();
  }
  function choose(i: number): void {
    const o = options[i];
    close();
    if (o && o.value !== value) onchange(o.value);
  }
  function move(to: number): void {
    active = Math.min(options.length - 1, Math.max(0, to));
    reveal();
  }
  function jump(ch: string): void {
    if (typedTimer) clearTimeout(typedTimer);
    typed += ch.toLowerCase();
    typedTimer = setTimeout(() => (typed = ""), 600);
    const base = open ? active : selectedIndex;
    const from = typed.length === 1 ? base + 1 : base;
    const hit = options.map((_, n) => (from + n) % options.length).find((i) => options[i]?.label.toLowerCase().startsWith(typed));
    if (hit === undefined) return;
    if (open) move(hit);
    else onchange(options[hit]?.value ?? value);
  }
  function key(e: KeyboardEvent): void {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      if (!open) show();
      else move(active + (e.key === "ArrowDown" ? 1 : -1));
    } else if (e.key === "Home" || e.key === "End") {
      e.preventDefault();
      if (!open) show();
      move(e.key === "Home" ? 0 : options.length - 1);
    } else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      if (!open) show();
      else choose(active);
    } else if (e.key === "Escape" && open) {
      e.preventDefault();
      e.stopPropagation();
      close();
    } else if (e.key === "Tab" && open) {
      close(false);
    } else if (e.key.length === 1) {
      e.preventDefault();
      jump(e.key);
    }
  }
  function outside(e: PointerEvent): void {
    if (open && e.target instanceof Node && !button?.parentElement?.contains(e.target)) close(false);
  }
</script>

<svelte:window onpointerdown={outside} />

<span class={`relative inline-block ${cls}`}>
  <button
    bind:this={button}
    type="button"
    role="combobox"
    class="ctl ctl-select text-left"
    aria-label={label}
    aria-haspopup="listbox"
    aria-expanded={open}
    aria-controls={listId}
    aria-activedescendant={open ? `${uid}-o${active}` : undefined}
    onclick={() => (open ? close() : show())}
    onkeydown={key}
  >
    {current}
  </button>
  {#if open}
    <ul
      bind:this={list}
      id={listId}
      role="listbox"
      aria-label={label}
      class="absolute left-0 z-30 mt-1 max-h-64 min-w-full overflow-auto rounded-md border border-border bg-background p-1 text-sm text-foreground shadow-md"
    >
      {#each options as o, i (o.value)}
<!-- Keys are handled on the combobox button (aria-activedescendant), so the options need none. -->
        <!-- svelte-ignore a11y_click_events_have_key_events -->
        <li
          id={`${uid}-o${i}`}
          role="option"
          tabindex="-1"
          aria-selected={o.value === value}
          data-active={i === active}
          class="flex cursor-pointer items-center justify-between gap-3 whitespace-nowrap rounded px-2 py-1.5 data-[active=true]:bg-accent data-[active=true]:text-accent-foreground"
          onpointermove={() => (active = i)}
          onclick={() => choose(i)}
        >
          {o.label}
          {#if o.value === value}
            <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M2 6.5l2.5 2.5L10 3" /></svg>
          {/if}
        </li>
      {/each}
    </ul>
  {/if}
</span>
