import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fakeApi, item, renderApp, rows, track } from "./helpers";

afterEach(cleanup);

describe("screen states (web-ui spec)", () => {
  it("loading: shows skeleton rows before the first response", () => {
    fakeApi({ track: () => ({ body: track([item()]) }) });
    const root = renderApp();
    expect(root.querySelector("[aria-busy='true']")).not.toBeNull();
    expect(rows(root)).toHaveLength(0);
  });

  it("loading ends and rows show once data arrives", async () => {
    fakeApi({ track: () => ({ body: track([item()]) }) });
    const root = renderApp();
    await vi.waitFor(() => expect(rows(root)).toHaveLength(1));
    expect(root.querySelector("[aria-busy='true']")).toBeNull();
    expect(root.textContent).toContain("Add retry to sync");
  });

  it("empty: says how to start, no rows", async () => {
    fakeApi({ track: () => ({ body: track([]) }) });
    const root = renderApp();
    await vi.waitFor(() => expect(root.textContent).toContain("No work yet."));
    expect(root.textContent).toContain("vantage init");
    expect(rows(root)).toHaveLength(0);
  });

  it("error: unreachable daemon gives one actionable line", async () => {
    fakeApi({ track: () => "network-error" });
    const root = renderApp();
    await vi.waitFor(() => expect(root.querySelector("[role='alert']")).not.toBeNull());
    expect(root.querySelector("[role='alert']")?.textContent).toContain("vantage start");
    expect(root.querySelector("[aria-busy='true']")).toBeNull();
  });

  it("error: a rejected token says to reopen from vantage open", async () => {
    fakeApi({ track: () => ({ status: 401 }) });
    const root = renderApp();
    await vi.waitFor(() => expect(root.querySelector("[role='alert']")).not.toBeNull());
    expect(root.querySelector("[role='alert']")?.textContent).toContain("vantage open");
  });

  it("stale: banner names the age and keeps the rows", async () => {
    const old = new Date(Date.now() - 20 * 60_000).toISOString();
    fakeApi({ track: () => ({ body: track([item()], { stale: true, lastPassAt: old }) }) });
    const root = renderApp();
    await vi.waitFor(() => expect(root.querySelector("[role='status']")).not.toBeNull());
    expect(root.querySelector("[role='status']")?.textContent).toMatch(/not refreshed since 20 min ago/);
    expect(rows(root)).toHaveLength(1);
  });

  it("not stale: no banner", async () => {
    fakeApi({ track: () => ({ body: track([item()]) }) });
    const root = renderApp();
    await vi.waitFor(() => expect(rows(root)).toHaveLength(1));
    expect(root.querySelector("[role='status']")).toBeNull();
  });

  it("partial: rows show normally, unconfigured sources are named, dots stay hollow", async () => {
    const body = track([item()], {
      sources: [
        { source: "agent", state: "ok", events: 3, lastEventAt: null },
        { source: "github", state: "unconfigured", events: 0, lastEventAt: null },
        { source: "ci", state: "unconfigured", events: 0, lastEventAt: null },
      ],
    });
    fakeApi({ track: () => ({ body }) });
    const root = renderApp();
    await vi.waitFor(() => expect(rows(root)).toHaveLength(1));
    expect(root.textContent).toContain("stay hollow: github, ci");
    // Shipped and Verified have no configured source: dashed, never green.
    expect(root.querySelectorAll("svg[data-state='skipped']").length).toBeGreaterThanOrEqual(2);
    expect(root.querySelectorAll("svg[data-state='done']")).toHaveLength(1);
  });

  it("partial: no note when every source is configured", async () => {
    fakeApi({ track: () => ({ body: track([item()]) }) });
    const root = renderApp();
    await vi.waitFor(() => expect(rows(root)).toHaveLength(1));
    expect(root.textContent).not.toContain("stay hollow");
  });
});
