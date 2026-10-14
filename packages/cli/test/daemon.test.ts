// Hermetic: loopback only, temp VANTAGE_HOME, ephemeral port, synthetic data.
import { request } from "node:http";
import { DatabaseSync } from "node:sqlite";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  AlreadyRunningError,
  loadMigrations,
  readHealth,
  readRepos,
  startDaemon,
  type DaemonHandle,
} from "@vantage/daemon";
import { collect } from "@vantage/hooks";
import { statusLine } from "@vantage/hooks";
import { runCli, trackUrl } from "../src/cli.ts";

const hook = (extra: object): string => JSON.stringify({ session_id: "s-e2e", cwd: "/w/demo", ...extra });
let home = "";
let daemon: DaemonHandle | null = null;
const lines: string[] = [];

beforeEach(() => {
  home = mkdtempSync(join(tmpdir(), "vantage-daemon-e2e-"));
  lines.length = 0;
});
afterEach(async () => {
  await daemon?.stop();
  daemon = null;
  rmSync(home, { recursive: true, force: true });
});

const boot = async (extra: Parameters<typeof startDaemon>[0] = {}): Promise<DaemonHandle> => {
  daemon = await startDaemon({
    home,
    port: 0,
    projectsDir: join(home, "no-transcripts"),
    repos: [],
    ingestMs: 50,
    stageMs: 50,
    log: (l) => lines.push(l),
    ...extra,
  });
  return daemon;
};

function get(port: number, path: string, token?: string): Promise<{ status: number; body: string }> {
  return new Promise((resolve, reject) => {
    const req = request(
      {
        host: "127.0.0.1",
        port,
        path,
        headers: { host: `127.0.0.1:${port}`, ...(token ? { authorization: `Bearer ${token}` } : {}) },
      },
      (res) => {
        let body = "";
        res.on("data", (c: Buffer) => (body += c.toString()));
        res.on("end", () => resolve({ status: res.statusCode ?? 0, body }));
      },
    );
    req.on("error", reject);
    req.end();
  });
}

async function until(check: () => boolean, ms = 5000): Promise<void> {
  const end = Date.now() + ms;
  while (!check()) {
    if (Date.now() > end) throw new Error("timed out");
    await new Promise((r) => setTimeout(r, 25));
  }
}

describe("daemon end to end", () => {
  it("spool in, status.json out, status line prints the item, /api/track serves it", async () => {
    const d = await boot();
    const spool = join(home, "spool");
    expect(
      collect(
        hook({
          hook_event_name: "PostToolUse",
          tool_use_id: "t1",
          tool_name: "Edit",
          tool_input: { file_path: "/w/demo/a.ts" },
        }),
        spool,
      ),
    ).toBe(true);
    collect(hook({ hook_event_name: "Stop", stop_hook_active: false }), spool);

    const statusPath = join(home, "status.json");
    await until(() => existsSync(statusPath) && readFileSync(statusPath, "utf8").includes("s-e2e"));

    const line = statusLine(JSON.stringify({ session_id: "s-e2e", cwd: "/w/demo" }), {
      VANTAGE_HOME: home,
      NO_COLOR: "1",
    });
    expect(line).toContain("demo");
    expect(line).not.toContain("offline");

    const track = await get(d.port, "/api/track", d.token);
    expect(track.status).toBe(200);
    const body = JSON.parse(track.body);
    expect(body.groups.flatMap((g: { items: unknown[] }) => g.items).length).toBeGreaterThanOrEqual(1);
    expect((await get(d.port, "/api/track")).status).toBe(401);
  });

  it("writes a health file for doctor and logs no content", async () => {
    const d = await boot();
    await until(() => readHealth(home)?.port === d.port);
    expect(readHealth(home)).toMatchObject({ pid: process.pid, state: "running", repos: 0 });
    expect(lines.some((l) => l.startsWith("serving 127.0.0.1:"))).toBe(true);
    expect(lines.join("\n")).not.toMatch(/\/w\/|command|prompt/);
  });

  it("refuses a second start without touching the store, and recovers a stale lock", async () => {
    await boot();
    const dbBefore = readFileSync(join(home, "vantage.db")).length;
    await expect(startDaemon({ home, port: 0, repos: [] })).rejects.toBeInstanceOf(AlreadyRunningError);
    expect(readFileSync(join(home, "vantage.db")).length).toBe(dbBefore);

    await daemon?.stop();
    daemon = null;
    writeFileSync(join(home, "daemon.lock"), "2147483646"); // a pid no process has
    await boot();
    expect(readHealth(home)?.state).toBe("running");
  });

  it("stops cleanly: port closed, lock released, health says stopped", async () => {
    const d = await boot();
    await d.stop();
    daemon = null;
    expect(existsSync(join(home, "daemon.lock"))).toBe(false);
    expect(readHealth(home)?.state).toBe("stopped");
    await expect(get(d.port, "/api/track", d.token)).rejects.toThrow(/ECONNREFUSED/);
  });

  it("treats a missing config as no repos", () => {
    expect(readRepos(home, {})).toEqual([]);
    writeFileSync(join(home, "config.toml"), 'repos = [\n  "/a/b",\n  \'/c/d\',\n]\nproof_gate = "warn"\n');
    expect(readRepos(home, {})).toEqual(["/a/b", "/c/d"]);
    expect(readRepos(home, { VANTAGE_REPOS: "/x" })).toEqual(["/x"]);
  });
});

const dbPath = (): string => join(home, "vantage.db");

const ledger = (): { number: number; sha256: string }[] => {
  const db = new DatabaseSync(dbPath(), { readOnly: true });
  try {
    return db
      .prepare("SELECT number, sha256 FROM schema_migrations ORDER BY number")
      .all()
      .map((r) => ({ number: Number(r["number"]), sha256: String(r["sha256"]) }));
  } finally {
    db.close();
  }
};
/** A database as the release before the ledger left it: migrations 1..4 and `schema_meta`, one event. */
const writeOldDatabase = (): void => {
  mkdirSync(home, { recursive: true });
  const old = new DatabaseSync(dbPath());
  for (const m of loadMigrations().filter((x) => x.number <= 5)) old.exec(m.sql);
  old.exec(`DELETE FROM schema_meta; INSERT INTO schema_meta (version) VALUES (5);
    INSERT INTO events (source, source_id, kind, occurred_at, ingested_at, payload_json)
      VALUES ('claude_code', 'old1', 'file.edited', '2026-01-05T09:00:00Z', '2026-01-05T09:00:00Z', '{}');`);
  old.close();
};

describe("migrations at start", () => {
  it("the daemon starts on a fresh home and records every migration", async () => {
    const d = await boot();
    await d.stop();
    daemon = null;
    expect(ledger().map((r) => r.number)).toEqual(loadMigrations().map((m) => m.number));
  });

  it("the daemon starts on a database from before the ledger and keeps its events", async () => {
    writeOldDatabase();
    const d = await boot();
    const track = await get(d.port, "/api/track", d.token);
    expect(track.status).toBe(200);
    await d.stop();
    daemon = null;
    expect(ledger()).toEqual(loadMigrations().map((m) => ({ number: m.number, sha256: m.sha256 })));
    const db = new DatabaseSync(dbPath(), { readOnly: true });
    expect(Number(db.prepare("SELECT COUNT(*) AS n FROM events WHERE source_id = 'old1'").get()?.["n"])).toBe(
      1,
    );
    db.close();
  });

  it("vantage start says why and exits 1 when an applied migration was edited, leaving no lock", async () => {
    const first = await boot();
    await first.stop();
    daemon = null;
    const db = new DatabaseSync(dbPath());
    db.exec("UPDATE schema_migrations SET sha256 = 'deadbeef' WHERE number = 2");
    db.close();
    const c = io({ VANTAGE_HOME: home, VANTAGE_REPOS: "", VANTAGE_PROJECTS_DIR: join(home, "none") });
    expect(await runCli(["start", "--port", "0"], c.io)).toBe(1);
    expect(c.err.join("\n")).toMatch(
      /Could not start: Migration 0002-links\.sql was changed after it was applied/,
    );
    expect(existsSync(join(home, "daemon.lock"))).toBe(false);
  });
});

const io = (env: NodeJS.ProcessEnv, extra: object = {}) => {
  const out: string[] = [];
  const err: string[] = [];
  return {
    out,
    err,
    io: { out: (l: string) => out.push(l), err: (l: string) => err.push(l), env, ...extra },
  };
};

describe("vantage start and open", () => {
  it("start exits non-zero and says so when one is already running", async () => {
    await boot();
    const c = io({ VANTAGE_HOME: home });
    expect(await runCli(["start", "--port", "0"], c.io)).toBe(1);
    expect(c.err.join("\n")).toContain("already running");
  });

  it("open prints the fragment URL and --print does not open a browser", async () => {
    const d = await boot();
    await until(() => readHealth(home)?.port === d.port);
    let opened = "";
    const c = io({ VANTAGE_HOME: home }, { open: (u: string) => (opened = u) });
    expect(await runCli(["open", "--print"], c.io)).toBe(0);
    expect(opened).toBe("");
    expect(c.out[0]).toBe(trackUrl(d.port, d.token));
    expect(c.out[0]).toMatch(/^http:\/\/127\.0\.0\.1:\d+\/#token=[0-9a-f]{64}$/);
    expect(c.out[0]).not.toContain("?");
    expect(await runCli(["open"], c.io)).toBe(0);
    expect(opened).toBe(c.out[1]);
  });

  it("open says so when nothing is running", async () => {
    const c = io({ VANTAGE_HOME: home });
    expect(await runCli(["open"], c.io)).toBe(1);
    expect(c.err.join("")).toContain("vantage start");
  });

  it("start runs until the stop signal, then shuts down cleanly", async () => {
    mkdirSync(home, { recursive: true });
    const ac = new AbortController();
    const stopSignal = new Promise<void>((r) => ac.signal.addEventListener("abort", () => r()));
    const c = io(
      { VANTAGE_HOME: home, VANTAGE_REPOS: "", VANTAGE_PROJECTS_DIR: join(home, "none") },
      { stopSignal },
    );
    const running = runCli(["start", "--port", "0"], c.io);
    await until(() => readHealth(home)?.state === "running");
    ac.abort();
    expect(await running).toBe(0);
    expect(existsSync(join(home, "daemon.lock"))).toBe(false);
    expect(c.out.join("\n")).toContain("stopped");
  });
});
