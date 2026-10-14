// Local HTTP server for the UI (D32, docs/ARCHITECTURE.md#local-security). Read-only in Phase 1.
// Order of checks: method, Host (DNS rebinding), Origin (cross-site), token. No CORS headers.
import { createServer, type IncomingMessage, type Server, type ServerResponse } from "node:http";
import { existsSync, readFileSync, statSync } from "node:fs";
import { extname, join, normalize, sep } from "node:path";
import { diagnosticsView, traceView, trackView } from "./api.ts";
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

  const handle = (req: IncomingMessage, res: ServerResponse): void => {
    try {
      if (req.method !== "GET" && req.method !== "HEAD") {
        return send(res, 405, { error: "read-only API" }, { Allow: "GET, HEAD" });
      }
      const hosts = allowed();
      if (!hosts.has((req.headers.host ?? "").toLowerCase())) return refuse(res, 403, "bad host");
      const origin = req.headers["origin"];
      if (origin !== undefined) {
        const o = typeof origin === "string" ? origin.toLowerCase() : "";
        if (!o.startsWith("http://") || !hosts.has(o.slice("http://".length))) {
          return refuse(res, 403, "bad origin");
        }
      }
      const url = new URL(req.url ?? "/", "http://127.0.0.1");
      if (!url.pathname.startsWith("/api/")) {
        // The UI shell holds no data, so it needs no token; every data call does.
        if (uiDir && serveStatic(uiDir, url.pathname, res)) return;
        return refuse(res, 404, "not found");
      }
      if (!tokenMatches(token, bearer(req))) return refuse(res, 401, "missing or wrong token");

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

  return new Promise((resolve, fail) => {
    const server = createServer(handle);
    server.once("error", fail);
    server.listen(options.port ?? 0, BIND_HOST, () => {
      const addr = server.address();
      port = typeof addr === "object" && addr ? addr.port : 0;
      resolve({
        server,
        port,
        close: () =>
          new Promise<void>((done) => {
            server.closeAllConnections();
            server.close(() => done());
          }),
      });
    });
  });
}
