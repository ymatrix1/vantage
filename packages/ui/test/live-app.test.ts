import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, FakeSocket, fakeApi, item, renderApp, rows, track } from "./helpers";

beforeEach(() =>
  vi.useFakeTimers({ toFake: ["setInterval", "clearInterval", "setTimeout", "clearTimeout"] }),
);
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

const trackCalls = (api: ReturnType<typeof fakeApi>): number =>
  api.mock.calls.filter(([u]) => u === "/api/track").length;

async function ready() {
  const api = fakeApi({ track: () => ({ body: track([item({ id: "a", title: "Before" })]) }) });
  const root = renderApp();
  await vi.waitFor(() => expect(rows(root)).toHaveLength(1));
  return { api, root, sock: FakeSocket.all[0] };
}

const changed = (fields: Record<string, unknown>) => ({
  type: "item.changed",
  id: "a",
  isNew: false,
  fields,
  at: new Date().toISOString(),
  lastPassAt: new Date().toISOString(),
});

describe("live updates (D81)", () => {
  it("opens the socket with the token in the subprotocol", async () => {
    const { sock } = await ready();
    expect(sock.url).toMatch(/\/api\/live$/);
    expect(sock.protocols[0]).toBe("vantage.v1");
    expect(sock.protocols[1]).toMatch(/^[0-9a-f]{32}$/);
  });

  it("a push updates the row without another fetch", async () => {
    const { api, root, sock } = await ready();
    sock.open();
    await vi.waitFor(() => expect(trackCalls(api)).toBe(2)); // initial load + refetch on open
    await new Promise((r) => setImmediate(r)); // let that refetch land before pushing
    const before = trackCalls(api);
    sock.push(changed({ title: "After" }));
    await vi.waitFor(() => expect(root.textContent).toContain("After"));
    expect(root.textContent).not.toContain("Before");
    expect(trackCalls(api)).toBe(before);
  });

  it("polls while the socket is down and stops polling while it is up", async () => {
    const { api, sock } = await ready();
    const base = trackCalls(api);
    await vi.advanceTimersByTimeAsync(5000);
    expect(trackCalls(api)).toBe(base + 1);
    sock.open();
    await vi.advanceTimersByTimeAsync(0);
    const open = trackCalls(api);
    await vi.advanceTimersByTimeAsync(15_000);
    expect(trackCalls(api)).toBe(open);
  });

  it("a dropped socket falls back to polling", async () => {
    const { api, sock } = await ready();
    sock.open();
    await vi.advanceTimersByTimeAsync(0);
    sock.drop();
    const down = trackCalls(api);
    await vi.advanceTimersByTimeAsync(5000);
    expect(trackCalls(api)).toBeGreaterThan(down);
  });

  it("a resync push refetches", async () => {
    const { api, sock } = await ready();
    sock.open();
    await vi.advanceTimersByTimeAsync(0);
    const before = trackCalls(api);
    sock.push({ type: "resync", at: new Date().toISOString(), lastPassAt: null });
    await vi.advanceTimersByTimeAsync(0);
    expect(trackCalls(api)).toBe(before + 1);
  });
});
