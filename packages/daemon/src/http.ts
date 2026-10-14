// Local HTTP server for the UI (D32, docs/ARCHITECTURE.md#local-security). Read-only in Phase 1.
// Order of checks: method, Host (DNS rebinding), Origin (cross-site), token. No CORS headers.
// The WebSocket upgrade for `/api/live` runs the same checks in the same order before the 101.
import { createServer, type IncomingMessage, type Server, type ServerResponse } from "node:http";
import { existsSync, readFileSync, statSync } from "node:fs";
import type { Duplex } from "node:stream";
import { extname, join, normalize, sep } from "node:path";
import { diagnosticsView, traceView, trackView } from "./api.ts";
import { LIVE_PROTOCOL, type LiveHub } from "./live.ts";
import { tokenMatches } from "./token.ts";
import type { Store } from "./store.ts";

export const BIND_HOST = "127.0.0.1";

export interface HttpOptions {
  store: Store;
  token: string;
  /** 0 picks a free port. */
  port?: number;
  /** Directory with the built UI (index.html and assets); omitted means API only. */
  uiDir?: string;
  /** Extra Host and Origin values allowed, e.g. the Vite dev server `127.0.0.1:5173`. */
  extraHosts?: readonly string[];
  /** Pushes for `GET /api/live`; without it the upgrade is refused with 404. */
  live?: LiveHub;
  now?: () => Date;
}

export interface HttpHandle {
  server: Server;
  port: number;
  close(): Promise<void>;
}

const CSP =
  "default-src 'none'; script-src 'self'; style-src 'self' 'unsafe-inline'; connect-src 'self'; img-src 'self' data:; base-uri 'none'; form-action 'none'; frame-ancestors 'none'";
const MIME: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".svg": "image/svg+xml",
  ".json": "application/json",
};
const CRLF = "\r\n";
const STATUS_TEXT: Record<number, string> = {
  400: "Bad Request",
  401: "Unauthorized",
  403: "Forbidden",
  404: "Not Found",
  405: "Method Not Allowed",
  500: "Internal Server Error",
  503: "Service Unavailable",
};
const SAFE_HEADERS = {
  "Cache-Control": "no-store",
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "no-referrer",
};

function send(res: ServerResponse, status: number, body: unknown, extra: Record<string, string> = {}): void {
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cross-Origin-Resource-Policy": "same-origin",
    ...SAFE_HEADERS,
    ...extra,
  });
  res.end(JSON.stringify(body));
}
const refuse = (res: ServerResponse, status: number, error: string): void => send(res, status, { error });

function bearer(req: IncomingMessage): string | undefined {
  const h = req.headers["authorization"];
  return typeof h === "string" && h.startsWith("Bearer ") ? h.slice(7).trim() : undefined;
}

/**
 * A browser WebSocket cannot set headers, so the token rides in `Sec-WebSocket-Protocol` next to
 * the fixed protocol name (D81); it is never in the URL (D75). Returns the token or undefined.
 */
function liveToken(req: IncomingMessage): string | undefined {
  const h = req.headers["sec-websocket-protocol"];
  if (typeof h !== "string") return undefined;
  const parts = h.split(",").map((p) => p.trim());
  return parts.includes(LIVE_PROTOCOL) ? parts.find((p) => p !== LIVE_PROTOCOL && p !== "") : undefined;
}

function serveStatic(uiDir: string, path: string, res: ServerResponse): boolean {
  let rel: string;
  try {
    rel = path === "/" ? "index.html" : normalize(decodeURIComponent(path)).replace(/^[/\\]+/, "");
  } catch {
    return false;
  }
  const file = join(uiDir, rel);
  if (!file.startsWith(uiDir + sep) || !existsSync(file) || !statSync(file).isFile()) return false;
  res.writeHead(200, {
    "Content-Type": MIME[extname(file)] ?? "application/octet-stream",
    "Content-Security-Policy": CSP,
    ...SAFE_HEADERS,
  });
  res.end(readFileSync(file));
  return true;
}

export function startHttp(options: HttpOptions): Promise<HttpHandle> {
  const { store, token, uiDir } = options;
  const now = options.now ?? (() => new Date());
  let port = 0;
  const allowed = (): Set<string> =>
    new Set([`127.0.0.1:${port}`, `localhost:${port}`, ...(options.extraHosts ?? [])]);

  /** Host (DNS rebinding) then Origin (cross-site); shared by requests and upgrades. */
  const originCheck = (req: IncomingMessage): string | null => {
    const hosts = allowed();
    if (!hosts.has((req.headers.host ?? "").toLowerCase())) return "bad host";
    const origin = req.headers["origin"];
    if (origin !== undefined) {
      const o = typeof origin === "string" ? origin.toLowerCase() : "";
      if (!o.startsWith("http://") || !hosts.has(o.slice("http://".length))) return "bad origin";
    }
    return null;
  };

  const handle = (req: IncomingMessage, res: ServerResponse): void => {
    try {
      if (req.method !== "GET" && req.method !== "HEAD") {
        return send(res, 405, { error: "read-only API" }, { Allow: "GET, HEAD" });
      }
      const bad = originCheck(req);
      if (bad) return refuse(res, 403, bad);
      const url = new URL(req.url ?? "/", "http://127.0.0.1");
      if (!url.pathname.startsWith("/api/")) {
        // The UI shell holds no data, so it needs no token; every data call does.
        if (uiDir && serveStatic(uiDir, url.pathname, res)) return;
        return refuse(res, 404, "not found");
      }
      if (!tokenMatches(token, bearer(req))) return refuse(res, 401, "missing or wrong token");

      if (url.pathname === "/api/live") return refuse(res, 426, "websocket upgrade required");
      if (url.pathname === "/api/track") return send(res, 200, trackView(store, now()));
      if (url.pathname === "/api/diagnostics") return send(res, 200, diagnosticsView(store, now()));
      const m = /^\/api\/items\/([^/]+)\/trace$/.exec(url.pathname);
      if (m) {
        let id: string;
        try {
          id = decodeURIComponent(m[1] ?? "");
        } catch {
          return refuse(res, 400, "bad item id");
        }
        const trace = traceView(store, id);
        return trace ? send(res, 200, trace) : refuse(res, 404, "no such item");
      }
      return refuse(res, 404, "not found");
    } catch {
      return refuse(res, 500, "internal error");
    }
  };

  /** Same checks, same order as `handle`, all before the 101 (D32, D81). */
  const upgrade = (req: IncomingMessage, socket: Duplex, head: Buffer): void => {
    const reject = (status: number, error: string): void => {
      const body = JSON.stringify({ error });
      socket.end(
        [
          `HTTP/1.1 ${status} ${STATUS_TEXT[status] ?? "Error"}`,
          "Content-Type: application/json",
          `Content-Length: ${Buffer.byteLength(body)}`,
          "Connection: close",
          "Cache-Control: no-store",
          "",
          body,
        ].join(CRLF),
      );
    };
    try {
      if (req.method !== "GET") return reject(405, "read-only API");
      const bad = originCheck(req);
      if (bad) return reject(403, bad);
      const url = new URL(req.url ?? "/", "http://127.0.0.1");
      if (!url.pathname.startsWith("/api/")) return reject(404, "not found");
      if (!tokenMatches(token, liveToken(req))) return reject(401, "missing or wrong token");
      if (url.pathname !== "/api/live" || !options.live) return reject(404, "not found");
      const key = req.headers["sec-websocket-key"];
      if (
        String(req.headers["upgrade"]).toLowerCase() !== "websocket" ||
        req.headers["sec-websocket-version"] !== "13" ||
        typeof key !== "string" ||
        Buffer.from(key, "base64").length !== 16
      ) {
        return reject(400, "bad websocket handshake");
      }
      if (options.live.full()) return reject(503, "too many live connections");
      options.live.accept(req, socket, head);
    } catch {
      reject(500, "internal error");
    }
  };

  return new Promise((resolve, fail) => {
    const server = createServer(handle);
    server.on("upgrade", upgrade);
    server.once("error", fail);
    server.listen(options.port ?? 0, BIND_HOST, () => {
      const addr = server.address();
      port = typeof addr === "object" && addr ? addr.port : 0;
      resolve({
        server,
        port,
        close: () =>
          new Promise<void>((done) => {
            options.live?.close();
            server.closeAllConnections();
            server.close(() => done());
          }),
      });
    });
  });
}
