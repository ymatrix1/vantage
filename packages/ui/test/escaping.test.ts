import { afterEach, describe, expect, it, vi } from "vitest";
import {
  cleanup,
  emptyFacets,
  fakeApi,
  group,
  item,
  press,
  renderApp,
  rows,
  track,
  traceOf,
} from "./helpers";

afterEach(cleanup);

// Synthetic hostile strings: markup and script-like text that must stay text.
const IMG = `<img src=x onerror="window.pwned=1">`;
const SCRIPT = `<script>window.pwned=1</script>`;
const BOLD = `<b id="injected">bold</b>`;

describe("API strings render as text, never HTML", () => {
  it("escapes titles, repo, flag reasons and trace entries", async () => {
    fakeApi({
      track: () => ({
        body: track([
          item({
            id: "x",
            title: `${IMG} ${BOLD}`,
            repo: SCRIPT,
            flags: [{ kind: "k", severity: "amber", reason: `${IMG}reason` }],
          }),
        ]),
      }),
      trace: () => ({
        body: traceOf("x", {
          transitions: [{ from: BOLD, to: IMG, at: "t", eventId: 1, reason: SCRIPT }],
          proofs: [
            {
              eventId: 2,
              level: 1,
              state: IMG,
              weakReason: BOLD,
              command: SCRIPT,
              ranAt: "",
              type: IMG,
              stale: false,
            },
          ],
          asked: { at: "", anchorKind: "branch", anchorValue: BOLD, sessionId: IMG },
          events: [{ eventId: 3, source: IMG, kind: SCRIPT, occurredAt: "", rule: BOLD, undone: false }],
        }),
      }),
    });
    const root = renderApp();
    await vi.waitFor(() => expect(rows(root)).toHaveLength(1));
    press("j");
    press("Enter");
    await vi.waitFor(() => expect(root.textContent).toContain("Stage history"));

    // No element was created from the strings.
    expect(root.querySelector("img")).toBeNull();
    expect(root.querySelector("script")).toBeNull();
    expect(root.querySelector("#injected")).toBeNull();
    expect(root.querySelector("b")).toBeNull();
    expect(Reflect.get(window, "pwned")).toBeUndefined();

    // The markup is visible as literal text.
    const text = root.textContent ?? "";
    expect(text).toContain(IMG);
    expect(text).toContain(SCRIPT);
    expect(text).toContain(BOLD);
    expect(rows(root)[0]?.textContent).toContain(`${IMG} ${BOLD}`);
  });
});

describe("the new controls render API strings as text too", () => {
  it("escapes group labels, facet values, active chips and the empty-result text", async () => {
    const facets = {
      ...emptyFacets(),
      repo: { [IMG]: 2 },
      branch: { [BOLD]: 1 },
      age: { today: 1, week: 0, older: 0 },
    };
    fakeApi({
      track: () => ({
        body: track([item({ id: "g1", title: "Row" })], {
          facets,
          groups: [group(`g"><b id="injected">`, `${SCRIPT}${BOLD}`, [item({ id: "g1", title: "Row" })])],
        }),
      }),
    });
    const root = renderApp(`?repo=${encodeURIComponent(IMG)}&q=${encodeURIComponent(BOLD)}`);
    await vi.waitFor(() => expect(rows(root)).toHaveLength(1));
    expect(root.querySelector("img")).toBeNull();
    expect(root.querySelector("script")).toBeNull();
    expect(root.querySelector("#injected")).toBeNull();
    expect(root.querySelector("b")).toBeNull();
    const text = root.textContent ?? "";
    expect(text).toContain(`${SCRIPT}${BOLD}`);
    expect(text).toContain(IMG);
    expect(text).toContain(BOLD);
  });
});
