// Synthetic events only.
import { request } from "node:http";
import { mkdtempSync, rmSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { VantageEvent } from "@vantage/core";
import {
  BIND_HOST,
  DEFAULT_QUERY,
  Store,
  loadMigrations,
  loadOrCreateToken,
  runStagePass,
  startHttp,
  trackView,
  type HttpHandle,
} from "../src/index.ts";

let dir = "";
let store: Store;
let http: HttpHandle;
const TOKEN = "t".repeat(64);
const NOW = new Date("2026-01-05T11:00:00Z");

let n = 0;
const put = (
  branch: string,
  kind: VantageEvent["kind"],
  m: number,
  payload: Record<string, unknown>,
): void => {
  store.insertEvent(
    {
      sourceId: `h${++n}`,
      source: "claude_code",
      kind,
      timestamp: `2026-01-05T09:${String(m).padStart(2, "0")}:00Z`,
      sessionId: `s-${branch}`,
      payload: { branch, ...payload },
    },
    "2026-01-05T10:00:00Z",
  );
};

beforeEach(async () => {
  dir = mkdtempSync(join(tmpdir(), "vantage-http-"));
  store = new Store(join(dir, "v.db"));
  // ftk-1: edited, then a passing test run (proven). ftk-2: edited, session stopped with no proof (flag).
  put("feat/ftk-1-proven", "file.edited", 1, { path: "/w/a.ts" });
  put("feat/ftk-1-proven", "command.ran", 2, { command: "vitest run a", ok: true });
  put("feat/ftk-2-claim", "file.edited", 3, { path: "/w/b.ts" });
  put("feat/ftk-2-claim", "session.stopped", 4, {});
  runStagePass(store, {}, NOW);
  http = await startHttp({ store, token: TOKEN, now: () => NOW });
});
afterEach(async () => {
  await http.close();
  store.close();
  rmSync(dir, { recursive: true, force: true });
});

interface Reply {
  status: number;
  body: string;
  headers: Record<string, string | string[] | undefined>;
}
/** Raw request so Host and Origin can be forged (fetch forbids setting them). */
function call(path: string, headers: Record<string, string> = {}, method = "GET"): Promise<Reply> {
  return new Promise((resolve, reject) => {
    const req = request(
      {
        host: BIND_HOST,
        port: http.port,
        path,
        method,
        headers: { host: `127.0.0.1:${http.port}`, ...headers },
      },
      (res) => {
        let body = "";
        res.on("data", (c: Buffer) => (body += c.toString()));
        res.on("end", () => resolve({ status: res.statusCode ?? 0, body, headers: res.headers }));
      },
    );
    req.on("error", reject);
    req.end();
  });
}
const auth = { authorization: `Bearer ${TOKEN}` };

describe("server security (D32)", () => {
  it("binds to 127.0.0.1 only", () => {
    const a = http.server.address();
    expect(a).toMatchObject({ address: "127.0.0.1", family: "IPv4" });
  });

  it("rejects a missing or wrong token", async () => {
    expect((await call("/api/track")).status).toBe(401);
    expect((await call("/api/track", { authorization: "Bearer nope" })).status).toBe(401);
    expect((await call("/api/track", { authorization: TOKEN })).status).toBe(401);
    expect((await call("/api/diagnostics")).status).toBe(401);
    expect((await call("/api/items/x/trace")).status).toBe(401);
  });

  it("never accepts the token in the query string", async () => {
    expect((await call(`/api/track?token=${TOKEN}`)).status).toBe(401);
  });

  it("rejects a wrong Host even with a valid token (DNS rebinding)", async () => {
    expect((await call("/api/track", { ...auth, host: "evil.example" })).status).toBe(403);
    expect((await call("/api/track", { ...auth, host: `evil.example:${http.port}` })).status).toBe(403);
    expect((await call("/api/track", { ...auth, host: "127.0.0.1:1" })).status).toBe(403);
  });

  it("rejects a foreign or opaque Origin even with a valid token (cross-site)", async () => {
    for (const origin of [
      "https://evil.example",
      "http://127.0.0.1:1",
      "null",
      `https://127.0.0.1:${http.port}`,
    ]) {
      expect({ origin, status: (await call("/api/track", { ...auth, origin })).status }).toEqual({
        origin,
        status: 403,
      });
    }
  });

  it("accepts the own origin and localhost host", async () => {
    expect((await call("/api/track", { ...auth, origin: `http://127.0.0.1:${http.port}` })).status).toBe(200);
    expect((await call("/api/track", { ...auth, host: `localhost:${http.port}` })).status).toBe(200);
  });

  it("allows only GET and HEAD, and sends no CORS headers", async () => {
    for (const m of ["POST", "PUT", "DELETE", "PATCH", "OPTIONS"]) {
      expect({ m, status: (await call("/api/track", auth, m)).status }).toEqual({ m, status: 405 });
    }
    const ok = await call("/api/track", { ...auth, origin: `http://127.0.0.1:${http.port}` });
    expect(Object.keys(ok.headers).filter((h) => h.startsWith("access-control-"))).toEqual([]);
    expect(ok.headers["cache-control"]).toBe("no-store");
  });

  it("does not change state on GET", async () => {
    const count = (): number => Number(store.db.prepare("SELECT COUNT(*) AS n FROM events").get()?.["n"]);
    const before = [count(), JSON.stringify(store.db.prepare("SELECT * FROM work_items").all())];
    for (const p of ["/api/track", "/api/diagnostics", "/api/items/issue%3AFTK-1/trace"]) await call(p, auth);
    expect([count(), JSON.stringify(store.db.prepare("SELECT * FROM work_items").all())]).toEqual(before);
  });

  it("creates the token file with user-only mode and reuses it", () => {
    const path = join(dir, "sub", "token");
    const t = loadOrCreateToken(path);
    expect(t).toMatch(/^[0-9a-f]{64}$/);
    expect(loadOrCreateToken(path)).toBe(t);
    // POSIX modes mean nothing on Windows; there the check is vacuously 0.
    const loose = process.platform === "win32" ? 0 : statSync(path).mode & 0o077;
    expect(loose).toBe(0);
  });
});

describe("read-only API over a synthetic store", () => {
  it("GET /api/track groups by attention with stage, proof and flags", async () => {
    const r = await call("/api/track", auth);
    expect(r.status).toBe(200);
    const body = JSON.parse(r.body);
    expect(body.groups.map((g: { attention: string }) => g.attention)).toEqual([
      "needs_you",
      "in_progress",
      "waiting",
      "done",
    ]);
    const needs = body.groups[0].items;
    const going = body.groups[1].items;
    expect(needs.map((i: { id: string }) => i.id)).toEqual(["issue:FTK-2"]);
    expect(needs[0].flags[0].kind).toBe("unproven_claim");
    expect(going[0]).toMatchObject({ id: "issue:FTK-1", stage: "proven", proofStatus: "fresh" });
    expect(body.stale).toBe(false);
    const states = Object.fromEntries(
      body.sources.map((s: { source: string; state: string }) => [s.source, s.state]),
    );
    expect(states).toMatchObject({ claude_code: "ok", github: "unconfigured" });
  });

  it("marks the page stale when the last pass is old", async () => {
    const late = await startHttp({ store, token: TOKEN, now: () => new Date("2026-01-05T12:00:00Z") });
    try {
      const r = await new Promise<string>((resolve) => {
        request(
          {
            host: BIND_HOST,
            port: late.port,
            path: "/api/track",
            headers: { host: `127.0.0.1:${late.port}`, ...auth },
          },
          (res) => {
            let b = "";
            res.on("data", (c: Buffer) => (b += c.toString()));
            res.on("end", () => resolve(b));
          },
        ).end();
      });
      expect(JSON.parse(r).stale).toBe(true);
    } finally {
      await late.close();
    }
  });

  it("GET /api/items/:id/trace explains the item: events with rules, transitions, proofs", async () => {
    const r = await call(`/api/items/${encodeURIComponent("issue:FTK-1")}/trace`, auth);
    expect(r.status).toBe(200);
    const t = JSON.parse(r.body);
    expect(t.events.length).toBe(2);
    expect(t.events[0]).toMatchObject({ kind: "file.edited", rule: "issue-key-branch", undone: false });
    expect(t.transitions.map((x: { to: string }) => x.to)).toContain("proven");
    expect(t.proofs[0]).toMatchObject({ state: "fresh", command: "vitest run a" });
  });

  it("returns 404 for an unknown item and a bad escape", async () => {
    expect((await call("/api/items/nope/trace", auth)).status).toBe(404);
    expect((await call("/api/items/%E0%A4%A/trace", auth)).status).toBe(400);
  });

  it("GET /api/diagnostics reports source health basics", async () => {
    const d = JSON.parse((await call("/api/diagnostics", auth)).body);
    expect(d).toMatchObject({ events: 4, items: 2, schemaVersion: loadMigrations().length });
    expect(d.sources.find((s: { source: string }) => s.source === "claude_code").events).toBe(4);
  });

  it("serves unknown API paths as 404", async () => {
    expect((await call("/api/nope", auth)).status).toBe(404);
    expect((await call("/", auth)).status).toBe(404);
  });
});

describe("performance budget (web-ui spec)", () => {
  it("builds the Track response for 500 synthetic items well under the 300 ms first-paint budget", () => {
    const at = "2026-01-05T09:00:00Z";
    store.transaction(() => {
      for (let i = 0; i < 500; i++) {
        store.db
          .prepare(
            `INSERT INTO work_items (item_key, title, stage, proof_status, first_activity, last_activity, created_at, updated_at)
             VALUES (?, ?, 'built', 'none', ?, ?, ?, ?)`,
          )
          .run(`issue:SYN-${i}`, `Synthetic ${i}`, at, at, at, at);
      }
    });
    const t0 = performance.now();
    const body = JSON.stringify(trackView(store, NOW, { ...DEFAULT_QUERY, pageSize: 100, since: "all" }));
    const ms = performance.now() - t0;
    const parsed = JSON.parse(body);
    expect(parsed.page.total).toBe(502);
    expect(parsed.groups.flatMap((g: { items: unknown[] }) => g.items)).toHaveLength(100);
    expect(ms).toBeLessThan(100);
  });
});
