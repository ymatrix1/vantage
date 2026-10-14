// Synthetic events only. Loopback, ephemeral port, temp directory; no network, no real home.
import { request } from "node:http";
import type { IncomingMessage } from "node:http";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { Duplex } from "node:stream";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { VantageEvent } from "@vantage/core";
import {
  BIND_HOST,
  LIVE_PROTOCOL,
  Store,
  createLiveHub,
  createStageLoop,
  startHttp,
  type HttpHandle,
  type LiveHub,
} from "../src/index.ts";

let dir = "";
let store: Store;
let http: HttpHandle;
let hub: LiveHub;
let nowMs = Date.parse("2026-01-05T11:00:00Z");
const now = (): Date => new Date(nowMs);
const TOKEN = "t".repeat(64);
const KEY = Buffer.alloc(16, 7).toString("base64");

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

async function start(opts: { maxClients?: number; pingMs?: number } = {}): Promise<void> {
  hub = createLiveHub({ store, now, ...opts });
  hub.publish();
  http = await startHttp({ store, token: TOKEN, live: hub, now });
}

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "vantage-live-"));
  store = new Store(join(dir, "v.db"));
  put("feat/ftk-1-proven", "file.edited", 1, { path: "/w/a.ts" });
  put("feat/ftk-1-proven", "command.ran", 2, { command: "vitest run a", ok: true });
});
afterEach(async () => {
  await http.close();
  store.close();
  rmSync(dir, { recursive: true, force: true });
});

interface Upgraded {
  status: number;
  body: string;
  socket: Duplex | null;
  res: IncomingMessage | null;
}
/** Raw upgrade request so Host, Origin and the token can be forged or left out. */
function upgrade(
  headers: Record<string, string> = {},
  method = "GET",
  path = "/api/live",
): Promise<Upgraded> {
  return new Promise((resolve, reject) => {
    const req = request({
      host: BIND_HOST,
      port: http.port,
      path,
      method,
      headers: {
        host: `127.0.0.1:${http.port}`,
        connection: "Upgrade",
        upgrade: "websocket",
        "sec-websocket-version": "13",
        "sec-websocket-key": KEY,
        "sec-websocket-protocol": `${LIVE_PROTOCOL}, ${TOKEN}`,
        ...headers,
      },
    });
    req.on("upgrade", (res, socket) => {
      socket.resume();
      resolve({ status: res.statusCode ?? 0, body: "", socket, res });
    });
    req.on("response", (res) => {
      let body = "";
      res.on("data", (c: Buffer) => (body += c.toString()));
      res.on("end", () => resolve({ status: res.statusCode ?? 0, body, socket: null, res }));
    });
    req.on("error", reject);
    req.end();
  });
}

type Msg = Record<string, unknown>;
const parse = (data: unknown): Msg => Object.fromEntries(Object.entries(JSON.parse(String(data))));
const open = (): Promise<WebSocket> =>
  new Promise((resolve, reject) => {
    const ws = new WebSocket(`ws://${BIND_HOST}:${http.port}/api/live`, [LIVE_PROTOCOL, TOKEN]);
    ws.addEventListener("open", () => resolve(ws));
    ws.addEventListener("error", () => reject(new Error("ws error")));
  });
const next = (ws: WebSocket): Promise<Msg> =>
  new Promise((resolve) => {
    ws.addEventListener("message", (e) => resolve(parse(e.data)), { once: true });
  });
const httpGet = (headers: Record<string, string>): Promise<number> =>
  new Promise((resolve, reject) => {
    const req = request(
      {
        host: BIND_HOST,
        port: http.port,
        path: "/api/live",
        headers: { host: `127.0.0.1:${http.port}`, ...headers },
      },
      (res) => {
        res.resume();
        resolve(res.statusCode ?? 0);
      },
    );
    req.on("error", reject);
    req.end();
  });

describe("GET /api/live upgrade checks (D32, D81)", () => {
  beforeEach(() => start());

  it("rejects a wrong Host before upgrading", async () => {
    const r = await upgrade({ host: "evil.example" });
    expect(r.status).toBe(403);
    expect(r.socket).toBeNull();
    expect(hub.clients).toBe(0);
  });

  it("rejects a foreign Origin before upgrading", async () => {
    for (const origin of ["https://evil.example", "http://127.0.0.1:1", "null"]) {
      const r = await upgrade({ origin });
      expect({ origin, status: r.status }).toEqual({ origin, status: 403 });
    }
    expect(hub.clients).toBe(0);
  });

  it("rejects a missing token with 401", async () => {
    expect((await upgrade({ "sec-websocket-protocol": LIVE_PROTOCOL })).status).toBe(401);
    expect(hub.clients).toBe(0);
  });

  it("rejects a wrong token with 401", async () => {
    expect((await upgrade({ "sec-websocket-protocol": `${LIVE_PROTOCOL}, nope` })).status).toBe(401);
    expect(hub.clients).toBe(0);
  });

  it("never accepts the token in the query string", async () => {
    const r = await upgrade({ "sec-websocket-protocol": LIVE_PROTOCOL }, "GET", `/api/live?token=${TOKEN}`);
    expect(r.status).toBe(401);
  });

  it("rejects a non-GET method", async () => {
    expect((await upgrade({}, "POST")).status).toBe(405);
  });

  it("runs Host before Origin before token", async () => {
    const bad = { host: "evil.example", origin: "https://evil.example", "sec-websocket-protocol": "x" };
    expect((await upgrade(bad)).status).toBe(403);
    expect((await upgrade({ origin: "https://evil.example", "sec-websocket-protocol": "x" })).status).toBe(
      403,
    );
  });

  it("refuses a malformed handshake and unknown paths", async () => {
    expect((await upgrade({ "sec-websocket-version": "8" })).status).toBe(400);
    expect((await upgrade({}, "GET", "/api/nope")).status).toBe(404);
  });

  it("accepts the own origin and selects only the fixed protocol", async () => {
    const r = await upgrade({ origin: `http://127.0.0.1:${http.port}` });
    expect(r.status).toBe(101);
    expect(r.res?.headers["sec-websocket-protocol"]).toBe(LIVE_PROTOCOL);
    r.socket?.destroy();
  });

  it("answers a plain GET to /api/live with 426, after the token check", async () => {
    expect(await httpGet({})).toBe(401);
    expect(await httpGet({ authorization: `Bearer ${TOKEN}` })).toBe(426);
  });
});

describe("live pushes", () => {
  it("pushes item.changed and flag.raised within 2 s of a stage pass, with no command text", async () => {
    await start();
    const ws = await open();
    const loop = createStageLoop({ store, now, onPass: () => hub.publish() });
    loop.tick(); // ftk-1 is edited and proven; baseline for the diff
    // The agent edits again and stops with no proof: a new item with a flag.
    put("feat/ftk-2-claim", "file.edited", 3, { path: "/w/some/dir/claimed.ts", command: "SECRET-COMMAND" });
    put("feat/ftk-2-claim", "session.stopped", 4, {});
    const msgs: Msg[] = [];
    const t0 = performance.now();
    const got = new Promise<number>((resolve) => {
      ws.addEventListener("message", (e) => {
        msgs.push(parse(e.data));
        if (msgs.some((m) => m["type"] === "flag.raised")) resolve(performance.now() - t0);
      });
    });
    nowMs += 1000;
    loop.tick();
    const ms = await got;
    expect(ms).toBeLessThan(2000);
    const changed = msgs.find((m) => m["type"] === "item.changed" && m["id"] === "issue:FTK-2");
    expect(changed).toMatchObject({
      type: "item.changed",
      isNew: true,
      fields: { stage: expect.any(String) },
    });
    expect(msgs.find((m) => m["type"] === "flag.raised")).toMatchObject({ itemId: "issue:FTK-2" });
    const wire = JSON.stringify(msgs);
    expect(wire).not.toContain("SECRET");
    // Flag reasons may name a file by base name (D84), never its folders.
    expect(wire).toContain("claimed.ts");
    expect(wire).not.toContain("some/dir");
    expect(Object.keys(msgs[0] ?? {})).toContain("lastPassAt");
    ws.close();
    console.log(`stage pass to client message: ${ms.toFixed(1)} ms`);
  });

  it("sends nothing when a pass changes nothing, and pushes only changed fields", async () => {
    await start();
    const loop = createStageLoop({ store, now, onPass: () => hub.publish() });
    loop.tick();
    const ws = await open();
    const seen: Msg[] = [];
    ws.addEventListener("message", (e) => seen.push(parse(e.data)));
    loop.tick();
    await new Promise((r) => setTimeout(r, 100));
    expect(seen).toEqual([]);
    put("feat/ftk-1-proven", "file.edited", 9, { path: "/w/a.ts" });
    nowMs += 1000;
    const p = next(ws);
    loop.tick();
    const m = await p;
    expect(m).toMatchObject({ type: "item.changed", isNew: false });
    expect(Object.keys(Object.fromEntries(Object.entries(m["fields"] ?? {})))).not.toContain("title");
    ws.close();
  });

  it("pushes source.health when a source first reports", async () => {
    await start();
    const ws = await open();
    const p = next(ws);
    store.insertEvent(
      {
        sourceId: "g1",
        source: "git",
        kind: "commit.created",
        timestamp: "2026-01-05T09:30:00Z",
        payload: {},
      } satisfies VantageEvent,
      "2026-01-05T10:00:00Z",
    );
    hub.publish();
    const m = await p;
    expect(m["type"]).toBe("source.health");
    ws.close();
  });
});

describe("limits", () => {
  it("refuses connections over the cap with 503", async () => {
    await start({ maxClients: 2 });
    const a = await upgrade();
    const b = await upgrade();
    expect([a.status, b.status]).toEqual([101, 101]);
    const c = await upgrade();
    expect(c.status).toBe(503);
    a.socket?.destroy();
    await new Promise((r) => setTimeout(r, 50));
    const d = await upgrade();
    expect(d.status).toBe(101);
    d.socket?.destroy();
    b.socket?.destroy();
  });

  it("drops a client that never answers a ping", async () => {
    await start({ pingMs: 40 });
    const r = await upgrade();
    const closed = new Promise<void>((resolve) => r.socket?.on("close", () => resolve()));
    await closed; // never pongs, so the second sweep drops it
    expect(hub.clients).toBe(0);
  });

  it("closes a client that sends a data frame", async () => {
    await start();
    const r = await upgrade();
    const closed = new Promise<void>((resolve) => r.socket?.on("close", () => resolve()));
    // Masked text frame, 1 byte: not allowed, the client may only send control frames.
    r.socket?.write(Buffer.from([0x81, 0x81, 1, 2, 3, 4, 0x41 ^ 1]));
    await closed;
    expect(hub.clients).toBe(0);
  });
});
