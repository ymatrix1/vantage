// Regression guard for bean vantage-8oas: svelte-check must resolve `.svelte` imports from .ts files with
// real component types. The directive below only holds while App's props are typed as "none": if resolution
// breaks (TS7016) or App loses real types (for example a loose `any` import), `pnpm check` fails here.
// Every .svelte file imported from .ts needs `<script lang="ts">`, or svelte-check types it as JS (TS7016).
import { mount } from "svelte";
import App from "./App.svelte";

// @ts-expect-error App takes no props, so unknown props must be rejected
export const guard = () => mount(App, { target: document.body, props: { nope: 1 } });
