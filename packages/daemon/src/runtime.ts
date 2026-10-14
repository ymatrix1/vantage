// The long-running daemon (docs/specs/operations.md#daemon-lifecycle): spool ingest and transcript
// backfill, the git scan loop, the stage loop that writes the status line file, and the secured
// HTTP server, all in one process. One instance per home directory.
import { closeSync, mkdirSync, openSync, readFileSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { delimiter, join } from "node:path";
import { STATUS_FILE } from "@vantage/core";
import { createGitLoop, type GitLoop } from "./git-loop.ts";
import { startHttp, type HttpHandle } from "./http.ts";
import { createLiveHub } from "./live.ts";
import { backfillTranscripts, ingestSpool } from "./ingest.ts";
import { createStageLoop, type StageLoop } from "./stage-loop.ts";
import { Store } from "./store.ts";
import { loadOrCreateToken } from "./token.ts";

export const DEFAULT_PORT = 4317;
export const INGEST_MS = 5000;
export const HEALTH_FILE = "health.json";
const LOCK_FILE = "daemon.lock";
const HEALTH_MS = 10_000;

export class AlreadyRunningError extends Error {
  readonly pid: number;
  constructor(pid: number) {
    super(`Vantage is already running (pid ${pid}).`);
    this.pid = pid;
  }
}

export interface Health {
  pid: number;
  port: number;
  startedAt: string;
  updatedAt: string;
  state: "running" | "stopped";
  lastIngestAt: string | null;
  lastStagePassAt: string | null;
  /** Counts only; error text can carry paths, so it goes to the log, not to this file. */
  errors: number;
  repos: number;
}

export interface DaemonOptions {
  /** `$VANTAGE_HOME` or `~/.vantage`. */
  home?: string;
  projectsDir?: string;
  /** Repos for the git scan loop; defaults to `readRepos(home)`. */
  repos?: readonly string[];
  /** 0 picks a free port. Defaults to DEFAULT_PORT. */
  port?: number;
  /** Built UI directory; omitted or missing means API only. */
  uiDir?: string;
  extraHosts?: readonly string[];
  ingestMs?: number;
  stageMs?: number;
  /** One plain line per event, never with transcript or command content. */
  log?: (line: string) => void;
  env?: NodeJS.ProcessEnv;
}

export interface DaemonHandle {
  home: string;
  port: number;
  token: string;
  store: Store;
  stop(): Promise<void>;
}

export const vantageHomeDir = (env: NodeJS.ProcessEnv = process.env): string =>
  env["VANTAGE_HOME"] || join(homedir(), ".vantage");

/**
 * Repos to watch: `VANTAGE_REPOS` (path-delimited) wins, else `repos = ["...", "..."]` in
 * `config.toml`. A missing or unreadable config means no repos, never a crash.
 */
export function readRepos(home: string, env: NodeJS.ProcessEnv = process.env): string[] {
  const fromEnv = env["VANTAGE_REPOS"];
  if (fromEnv) return fromEnv.split(delimiter).filter(Boolean);
  try {
    const text = readFileSync(join(home, "config.toml"), "utf8");
    const arr = /^\s*repos\s*=\s*\[([^\]]*)\]/m.exec(text)?.[1] ?? "";
    return [...arr.matchAll(/"([^"\n]+)"|'([^'\n]+)'/g)].flatMap((m) => {
      const v = m[1] ?? m[2];
      return v ? [v] : [];
    });
  } catch {
    return [];
  }
}

function alive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch (e) {
    return e instanceof Error && "code" in e && e.code === "EPERM";
  }
}

/** Creates the lock file exclusively; a lock whose process is gone is taken over. */
function acquireLock(path: string, home: string): void {
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const fd = openSync(path, "wx");
      writeFileSync(fd, String(process.pid));
      closeSync(fd);
      return;
    } catch (e) {
      if (!(e instanceof Error && "code" in e && e.code === "EEXIST")) throw e;
      const pid = Number.parseInt(readFileSync(path, "utf8"), 10);
      // A recycled pid shows as alive; a running daemon refreshes its health file every 10 s.
      const h = readHealth(home);
      const fresh = !h || h.state !== "running" || Date.now() - Date.parse(h.updatedAt) < 6 * HEALTH_MS;
      if (Number.isInteger(pid) && alive(pid) && fresh) throw new AlreadyRunningError(pid);
      rmSync(path, { force: true });
    }
  }
  throw new Error("could not take the daemon lock");
}

export function readHealth(home: string): Health | null {
  try {
    const h: unknown = JSON.parse(readFileSync(join(home, HEALTH_FILE), "utf8"));
    if (typeof h !== "object" || h === null) return null;
    const pid: unknown = Reflect.get(h, "pid");
    const port: unknown = Reflect.get(h, "port");
    const state: unknown = Reflect.get(h, "state");
    if (typeof pid !== "number" || typeof port !== "number") return null;
    if (state !== "running" && state !== "stopped") return null;
    return {
      pid,
      port,
      state,
      startedAt: String(Reflect.get(h, "startedAt") ?? ""),
      updatedAt: String(Reflect.get(h, "updatedAt") ?? ""),
      lastIngestAt: strOrNull(Reflect.get(h, "lastIngestAt")),
      lastStagePassAt: strOrNull(Reflect.get(h, "lastStagePassAt")),
      errors: Number(Reflect.get(h, "errors") ?? 0),
      repos: Number(Reflect.get(h, "repos") ?? 0),
    };
  } catch {
    return null;
  }
}
const strOrNull = (v: unknown): string | null => (typeof v === "string" ? v : null);

export async function startDaemon(options: DaemonOptions = {}): Promise<DaemonHandle> {
  const env = options.env ?? process.env;
  const home = options.home ?? vantageHomeDir(env);
  const log = options.log ?? (() => undefined);
  mkdirSync(home, { recursive: true });
  // The lock comes first: a second start must not open the store or touch any file.
  const lockPath = join(home, LOCK_FILE);
  acquireLock(lockPath, home);

  let store: Store | null = null;
  let http: HttpHandle | null = null;
  let git: GitLoop | null = null;
  let stage: StageLoop | null = null;
  let ingestTimer: ReturnType<typeof setInterval> | null = null;
  let healthTimer: ReturnType<typeof setInterval> | null = null;
  let ingesting = false;
  try {
    store = new Store(join(home, "vantage.db"));
    const db = store;
    const token = loadOrCreateToken(join(home, "token"));
    const repos = options.repos ?? readRepos(home, env);
    const projectsDir =
      options.projectsDir ?? (env["VANTAGE_PROJECTS_DIR"] || join(homedir(), ".claude", "projects"));
    const spool = join(home, "spool");
    const startedAt = new Date().toISOString();
    const health: Health = {
      pid: process.pid,
      port: 0,
      startedAt,
      updatedAt: startedAt,
      state: "running",
      lastIngestAt: null,
      lastStagePassAt: null,
      errors: 0,
      repos: repos.length,
    };
    const writeHealth = (): void => {
      health.updatedAt = new Date().toISOString();
      const pass = db.db.prepare("SELECT MAX(updated_at) AS t FROM work_items").get()?.["t"];
      health.lastStagePassAt = typeof pass === "string" ? pass : null;
      const tmp = join(home, `${HEALTH_FILE}.${process.pid}.tmp`);
      writeFileSync(tmp, JSON.stringify(health));
      renameSync(tmp, join(home, HEALTH_FILE));
    };
    const onError = (where: string) => (e: unknown) => {
      health.errors++;
      log(`error in ${where}: ${e instanceof Error ? e.name : "unknown"}`);
    };

    const uiDir = options.uiDir;
    const live = createLiveHub({ store: db });
    live.publish(); // baseline, so the first pass pushes only what it changes
    http = await startHttp({
      store: db,
      live,
      token,
      port: options.port ?? DEFAULT_PORT,
      ...(uiDir ? { uiDir } : {}),
      ...(options.extraHosts ? { extraHosts: options.extraHosts } : {}),
    });
    health.port = http.port;
    log(`serving 127.0.0.1:${http.port}${uiDir ? "" : " (API only, UI not found)"}`);

    const ingest = (): void => {
      if (ingesting) return;
      ingesting = true;
      try {
        const s = ingestSpool(db, spool);
        const t = backfillTranscripts(db, projectsDir);
        health.lastIngestAt = new Date().toISOString();
        if (s.inserted + t.inserted > 0)
          log(`ingested ${s.inserted} spool and ${t.inserted} transcript events`);
      } catch (e) {
        onError("ingest")(e);
      } finally {
        ingesting = false;
      }
    };
    ingest();

    git = createGitLoop({ store: db, repos, onError: onError("git scan") });
    if (repos.length > 0) git.start();
    log(`watching ${repos.length} repo(s)`);

    stage = createStageLoop({
      store: db,
      statusFile: join(home, STATUS_FILE),
      onPass: () => live.publish(),
      ...(options.stageMs ? { intervalMs: options.stageMs } : {}),
      onError: onError("stage pass"),
    });
    stage.start();
    log("stage loop started");

    ingestTimer = setInterval(ingest, options.ingestMs ?? INGEST_MS);
    ingestTimer.unref();
    writeHealth();
    healthTimer = setInterval(writeHealth, HEALTH_MS);
    healthTimer.unref();

    let stopping: Promise<void> | null = null;
    const server = http;
    const gitLoop = git;
    const stageLoop = stage;
    const stop = (): Promise<void> => {
      stopping ??= (async () => {
        log("stopping");
        if (ingestTimer) clearInterval(ingestTimer);
        if (healthTimer) clearInterval(healthTimer);
        stageLoop.stop();
        await gitLoop.stop();
        await server.close();
        health.state = "stopped";
        try {
          writeHealth();
        } catch {
          // the home directory may be gone; nothing left to record
        }
        db.close();
        rmSync(lockPath, { force: true });
        log("stopped");
      })();
      return stopping;
    };
    return { home, port: http.port, token, store: db, stop };
  } catch (e) {
    // Startup failed after the lock: undo what was started, release the lock.
    stage?.stop();
    await git?.stop();
    await http?.close();
    store?.close();
    if (ingestTimer) clearInterval(ingestTimer);
    if (healthTimer) clearInterval(healthTimer);
    rmSync(lockPath, { force: true });
    throw e;
  }
}
