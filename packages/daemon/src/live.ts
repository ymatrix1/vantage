// Live updates for the Track page (D81, docs/specs/web-ui.md#api-daemon-to-ui). A dependency-free,
// send-only WebSocket: the daemon pushes `item.changed`, `flag.raised`, `source.health` and `resync`;
// the client never sends data. The HTTP layer runs every security check before `accept` is called.
import { createHash } from "node:crypto";
import { Socket } from "node:net";
import type { IncomingMessage } from "node:http";
import type { Duplex } from "node:stream";
import type { SourceHealth, TrackItem } from "@vantage/core";
import { trackView } from "./api.ts";
import type { Store } from "./store.ts";

export const LIVE_PROTOCOL = "vantage.v1";
export const MAX_LIVE_CLIENTS = 8;
export const LIVE_PING_MS = 15_000;
const GUID = "258EAFA5-E914-47DA-95CA-C5AB0DC85B11";
const MAX_CLIENT_PAYLOAD = 125;
const MAX_BUFFERED = 1_000_000;

export type LiveMessage =
  | { type: "item.changed"; id: string; isNew: boolean; fields: Partial<Omit<TrackItem, "id">> }
  | { type: "flag.raised"; itemId: string; kind: string; severity: string }
  | { type: "source.health"; sources: SourceHealth[] }
  | { type: "resync" };
/** Every message carries when the last pass ran, so the page can keep its stale banner honest. */
export type LiveEnvelope = LiveMessage & { at: string; lastPassAt: string | null };

function frame(opcode: number, payload: Buffer): Buffer {
  const n = payload.length;
  const head =
    n < 126
      ? Buffer.from([0x80 | opcode, n])
      : n < 65_536
        ? Buffer.from([0x80 | opcode, 126, n >> 8, n & 0xff])
        : (() => {
            const b = Buffer.alloc(10);
            b[0] = 0x80 | opcode;
            b[1] = 127;
            b.writeBigUInt64BE(BigInt(n), 2);
            return b;
          })();
  return Buffer.concat([head, payload]);
}
/** Sends a close frame and drops the connection without waiting for the peer to answer. */
function shut(socket: Duplex, code: number): void {
  socket.write(closeFrame(code), () => socket.destroy());
}
const closeFrame = (code: number): Buffer => frame(0x8, Buffer.from([code >> 8, code & 0xff]));

export function acceptKey(key: string): string {
  return createHash("sha1")
    .update(key + GUID)
    .digest("base64");
}

interface Client {
  socket: Duplex;
  alive: boolean;
  buf: Buffer;
}

export interface LiveHub {
  readonly clients: number;
  /** True when one more client would exceed the cap. */
  full(): boolean;
  /** Completes the handshake on an already-checked upgrade request. */
  accept(req: IncomingMessage, socket: Duplex, head: Buffer): void;
  /** Diffs the Track view against the last one and pushes what changed. */
  publish(): void;
  close(): void;
}

export interface LiveOptions {
  store: Store;
  maxClients?: number;
  pingMs?: number;
  now?: () => Date;
}

export function createLiveHub(options: LiveOptions): LiveHub {
  const { store } = options;
  const max = options.maxClients ?? MAX_LIVE_CLIENTS;
  const now = options.now ?? (() => new Date());
  const clients = new Set<Client>();
  let items = new Map<string, string>();
  let sources = "";
  let known = new Map<string, TrackItem>();
  let primed = false;

  const drop = (c: Client): void => {
    clients.delete(c);
    c.socket.destroy();
  };
  const send = (c: Client, data: Buffer): void => {
    if (c.socket.destroyed || c.socket.writableLength > MAX_BUFFERED) return drop(c);
    c.socket.write(data);
  };
  const broadcast = (msgs: LiveMessage[], lastPassAt: string | null): void => {
    if (clients.size === 0) return;
    const at = now().toISOString();
    for (const m of msgs) {
      const data = frame(0x1, Buffer.from(JSON.stringify({ ...m, at, lastPassAt })));
      for (const c of clients) send(c, data);
    }
  };

  const publish = (): void => {
    const view = trackView(store, now());
    const nextKnown = new Map<string, TrackItem>(view.groups.flatMap((g) => g.items).map((i) => [i.id, i]));
    const next = new Map([...nextKnown].map(([id, i]) => [id, JSON.stringify(i)]));
    const nextSources = JSON.stringify(view.sources);
    const msgs: LiveMessage[] = [];
    if (primed) {
      for (const [id, item] of nextKnown) {
        const before = known.get(id);
        if (items.get(id) === next.get(id)) continue;
        const fields: Record<string, unknown> = {};
        for (const [k, v] of Object.entries(item)) {
          if (k === "id") continue;
          if (!before || JSON.stringify(Reflect.get(before, k)) !== JSON.stringify(v)) fields[k] = v;
        }
        msgs.push({ type: "item.changed", id, isNew: !before, fields });
        const had = new Set((before?.flags ?? []).map((f) => f.kind));
        for (const f of item.flags) {
          if (!had.has(f.kind))
            msgs.push({ type: "flag.raised", itemId: id, kind: f.kind, severity: f.severity });
        }
      }
      if ([...known.keys()].some((id) => !nextKnown.has(id))) msgs.push({ type: "resync" });
      if (nextSources !== sources) msgs.push({ type: "source.health", sources: view.sources });
    }
    items = next;
    known = nextKnown;
    sources = nextSources;
    primed = true;
    broadcast(msgs, view.lastPassAt);
  };

  const onData = (c: Client, chunk: Buffer): void => {
    c.buf = Buffer.concat([c.buf, chunk]);
    // The client only ever sends control frames; anything else, or anything big, ends the session.
    while (c.buf.length >= 2) {
      const b0 = c.buf[0] ?? 0;
      const b1 = c.buf[1] ?? 0;
      const opcode = b0 & 0x0f;
      const len = b1 & 0x7f;
      if (
        !(b1 & 0x80) ||
        !(b0 & 0x80) ||
        len > MAX_CLIENT_PAYLOAD ||
        (opcode !== 0x8 && opcode !== 0x9 && opcode !== 0xa)
      ) {
        shut(c.socket, !(b1 & 0x80) ? 1002 : 1008);
        return void clients.delete(c);
      }
      const total = 6 + len;
      if (c.buf.length < total) return;
      const mask = c.buf.subarray(2, 6);
      const payload = Buffer.from(c.buf.subarray(6, total).map((b, i) => b ^ (mask[i % 4] ?? 0)));
      c.buf = c.buf.subarray(total);
      if (opcode === 0xa) c.alive = true;
      else if (opcode === 0x9) send(c, frame(0xa, payload));
      else {
        shut(c.socket, 1000);
        return void clients.delete(c);
      }
    }
  };

  const timer = setInterval(() => {
    for (const c of clients) {
      if (!c.alive) {
        drop(c);
        continue;
      }
      c.alive = false;
      send(c, frame(0x9, Buffer.alloc(0)));
    }
  }, options.pingMs ?? LIVE_PING_MS);
  timer.unref();

  return {
    get clients() {
      return clients.size;
    },
    full: () => clients.size >= max,
    accept(req, socket, head) {
      const key = req.headers["sec-websocket-key"];
      socket.write(
        [
          "HTTP/1.1 101 Switching Protocols",
          "Upgrade: websocket",
          "Connection: Upgrade",
          `Sec-WebSocket-Accept: ${acceptKey(String(key))}`,
          `Sec-WebSocket-Protocol: ${LIVE_PROTOCOL}`,
          "Cache-Control: no-store",
          "\r\n",
        ].join("\r\n"),
      );
      if (socket instanceof Socket) socket.setNoDelay(true);
      const c: Client = { socket, alive: true, buf: Buffer.alloc(0) };
      clients.add(c);
      socket.on("data", (d: Buffer) => onData(c, d));
      socket.on("end", () => drop(c)); // the HTTP server keeps half-open sockets alive
      socket.on("close", () => clients.delete(c));
      socket.on("error", () => drop(c));
      if (head.length > 0) onData(c, head);
      // Pushes are diffs, so a new client must baseline on the next publish.
      if (!primed) publish();
    },
    publish,
    close() {
      clearInterval(timer);
      for (const c of clients) {
        shut(c.socket, 1001);
        clients.delete(c);
      }
    },
  };
}
