// The classify job (docs/specs/classify.md): picks settled items, builds the minimal payload, runs
// `claude -p` in an isolated child with VANTAGE_SKIP=1, validates the answer and stores suggestions.
// A failed, slow or invalid call gives no suggestion: it is counted, never stored as data.
import { spawn } from "node:child_process";
import {
  closeSync,
  mkdirSync,
  mkdtempSync,
  openSync,
  readSync,
  readdirSync,
  rmSync,
  statSync,
} from "node:fs";
import { basename, join } from "node:path";
import {
  CLASSIFY_SYSTEM_PROMPT,
  batchIds,
  buildPrompt,
  classifySchema,
  contentHash,
  parseClassifyOutput,
  parseTranscriptLine,
  payloadItem,
  promptHash,
  toBatches,
  userRequestText,
  type ClassifiedItem,
  type ClassifyCandidate,
  type PayloadItem,
} from "@vantage/core";
import {
  applyNow,
  cachedHashes,
  isExplicitKey,
  recordSuggestions,
  type BatchResult,
  type NewSuggestion,
} from "./classify-store.ts";
import { classifyBlockers, type ClassifyConfig } from "./classify-config.ts";
import { workDirOf } from "./ingest.ts";
import type { ReadStore } from "./classify-store.ts";
import type { Store } from "./store.ts";

/** Calls in flight at once. A constant, not a setting: the user's plan limits are shared with their own sessions. */
export const CLASSIFY_PARALLEL = 2;
/** After this many failed calls in a row a run stops: a plan limit or a logout will not fix itself within the run. */
const MAX_CONSECUTIVE_FAILURES = 2;
const HEAD_BYTES = 256 * 1024;

export interface SpawnResult {
  code: number | null;
  stdout: string;
  timedOut: boolean;
}
export interface SpawnRequest {
  command: string;
  args: string[];
  input: string;
  cwd: string;
  env: NodeJS.ProcessEnv;
  timeoutMs: number;
}
/** Test seam: tests pass a fake that runs a fake `claude` in a temp dir; they never run the real one. */
export type Spawner = (req: SpawnRequest) => Promise<SpawnResult>;

export const spawnClaude: Spawner = (req) =>
  new Promise((resolve) => {
    let stdout = "";
    let timedOut = false;
    let settled = false;
    const done = (code: number | null): void => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve({ code, stdout, timedOut });
    };
    const child = spawn(req.command, req.args, {
      cwd: req.cwd,
      env: req.env,
      stdio: ["pipe", "pipe", "ignore"],
      windowsHide: true,
    });
    const timer = setTimeout(() => {
      timedOut = true;
      child.kill();
      // A child that ignores the signal must not hold the run: give up on it after a short grace.
      setTimeout(() => done(null), 2000).unref();
    }, req.timeoutMs);
    child.stdout.on("data", (d: Buffer) => {
      if (stdout.length < 4_000_000) stdout += d.toString("utf8");
    });
    child.on("error", () => done(null));
    child.on("close", (code) => done(code));
    child.stdin.on("error", () => undefined);
    child.stdin.end(req.input);
  });

/** The exact argument list of a run. No tools, no MCP, no settings (so none of the user's hooks), no saved session. */
export function claudeArgs(model: string, schema: Record<string, unknown>): string[] {
  return [
    "-p",
    "--model",
    model,
    "--output-format",
    "json",
    "--json-schema",
    JSON.stringify(schema),
    "--tools",
    "",
    "--strict-mcp-config",
    "--setting-sources",
    "",
    "--no-session-persistence",
    "--system-prompt",
    CLASSIFY_SYSTEM_PROMPT,
  ];
}

// ---- candidates -------------------------------------------------------------------------------

function* transcriptFiles(dir: string): Generator<string> {
  let names: string[];
  try {
    names = readdirSync(dir);
  } catch {
    return;
  }
  for (const name of names) {
    const path = join(dir, name);
    const st = statSync(path, { throwIfNoEntry: false });
    if (!st) continue;
    if (st.isDirectory()) {
      if (name !== "subagents") yield* transcriptFiles(path);
    } else if (name.endsWith(".jsonl")) yield path;
  }
}

/** Session id to transcript path, from file names. */
function transcriptIndex(projectsDir: string): Map<string, string> {
  const out = new Map<string, string>();
  for (const p of transcriptFiles(projectsDir)) {
    out.set(basename(p, ".jsonl"), p);
  }
  return out;
}

/** Complete lines from the start of a file, at most 256 KB. */
function headLines(path: string): string[] {
  const fd = openSync(path, "r");
  try {
    const buf = Buffer.alloc(HEAD_BYTES);
    let read = 0;
    while (read < HEAD_BYTES) {
      const n = readSync(fd, buf, read, HEAD_BYTES - read, read);
      if (n === 0) break;
      read += n;
    }
    const end = buf.subarray(0, read).lastIndexOf(0x0a);
    return end < 0
      ? []
      : buf
          .subarray(0, end)
          .toString("utf8")
          .split("\n")
          .filter((l) => l.trim() !== "");
  } finally {
    closeSync(fd);
  }
}

/** The first real user message of a session, raw. The caller strips it before anything is sent. */
function firstRequestText(path: string, sessionId: string): string | null {
  try {
    for (const line of headLines(path)) {
      const l = parseTranscriptLine(line);
      if (!l || l.type !== "user" || l.isMeta || l.isSidechain || l.agentId) continue;
      if (l.sessionId !== undefined && l.sessionId !== sessionId) continue;
      if (l.content.some((b) => b["type"] === "tool_result")) continue;
      const t =
        l.text ??
        l.content
          .filter((b) => b["type"] === "text")
          .map((b) => (typeof b["text"] === "string" ? b["text"] : ""))
          .join(" ");
      const typed = userRequestText(t);
      if (typed !== null) return typed;
    }
  } catch {
    // an unreadable transcript only means no request text
  }
  return null;
}

export interface Candidate {
  itemKey: string;
  lastActivity: string;
  candidate: ClassifyCandidate;
}

type Row = Record<string, unknown>;
const s = (r: Row, c: string): string => (typeof r[c] === "string" ? r[c] : "");

/** Items that have been quiet for `settleMinutes` and have something to say (a request or an edited file). */
export function collectCandidates(
  store: ReadStore,
  projectsDir: string,
  now: Date,
  settleMinutes: number,
): Candidate[] {
  const cutoff = new Date(now.getTime() - settleMinutes * 60_000).toISOString();
  const index = transcriptIndex(projectsDir);
  const out: Candidate[] = [];
  const items = store.db
    .prepare(
      "SELECT item_key, title, repo, branch, proof_status, last_activity FROM work_items WHERE last_activity <= ? ORDER BY repo, last_activity",
    )
    .all(cutoff);
  for (const w of items) {
    const key = s(w, "item_key");
    const edits = store.db
      .prepare(
        `SELECT e.payload_json FROM events e JOIN links l ON l.event_id = e.id
          WHERE l.item_key = ? AND l.undone_at IS NULL AND l.method != 'inferred' AND e.kind = 'file.edited' ORDER BY e.occurred_at`,
      )
      .all(key);
    const files: string[] = [];
    for (const e of edits) {
      try {
        const p: unknown = JSON.parse(s(e, "payload_json"));
        if (typeof p !== "object" || p === null) continue;
        const one = Reflect.get(p, "path");
        const many = Reflect.get(p, "paths");
        if (typeof one === "string") files.push(one);
        if (Array.isArray(many)) for (const m of many) if (typeof m === "string") files.push(m);
      } catch {
        // skip an unreadable payload
      }
    }
    const first = store.db
      .prepare(
        `SELECT e.session_id AS sid FROM links l JOIN events e ON e.id = l.event_id
          WHERE l.item_key = ? AND l.undone_at IS NULL AND l.method != 'inferred' AND e.session_id IS NOT NULL
          ORDER BY e.occurred_at LIMIT 1`,
      )
      .get(key);
    const sid = first ? s(first, "sid") : "";
    const path = sid ? index.get(sid) : undefined;
    const request = path ? firstRequestText(path, sid) : null;
    if (request === null && files.length === 0) continue;
    const sessions = Number(
      store.db.prepare("SELECT session_count AS n FROM item_sessions WHERE item_key = ?").get(key)?.["n"] ??
        0,
    );
    out.push({
      itemKey: key,
      lastActivity: s(w, "last_activity"),
      candidate: {
        repo: s(w, "repo") || null,
        branch: s(w, "branch") || null,
        request,
        files,
        sessions,
        edits: edits.length,
        proof: s(w, "proof_status"),
        title: s(w, "title"),
      },
    });
  }
  return out;
}

// ---- plan and dry run -------------------------------------------------------------------------

export interface PlannedBatch {
  keys: string[];
  items: PayloadItem[];
  hashes: string[];
}

export interface Plan {
  /** Items that passed the settle time and have something to send. */
  eligible: number;
  /** Of those, already classified for this model and prompt (skipped). */
  cached: number;
  /** Items that would be sent. */
  items: number;
  batches: PlannedBatch[];
  /** Total bytes of the prompts that would be sent. */
  payloadBytes: number;
}

export function planRun(store: ReadStore, cfg: ClassifyConfig, projectsDir: string, now: Date): Plan {
  const all = collectCandidates(store, projectsDir, now, cfg.settleMinutes);
  const cache = cachedHashes(store, cfg.model, promptHash());
  const fresh = all
    .map((c, i) => ({ c, p: payloadItem(c.candidate, `t${i}`) }))
    .map((x) => ({ ...x, hash: contentHash(x.p) }))
    .filter((x) => !cache.has(x.hash));
  const batches: PlannedBatch[] = toBatches(fresh, cfg.batchSize).map((chunk) => {
    const ids = batchIds(chunk.length);
    return {
      keys: chunk.map((x) => x.c.itemKey),
      items: chunk.map((x, i) => ({ ...x.p, id: ids[i] ?? `i${i + 1}` })),
      hashes: chunk.map((x) => x.hash),
    };
  });
  return {
    eligible: all.length,
    cached: all.length - fresh.length,
    items: fresh.length,
    batches,
    payloadBytes: batches.reduce((n, b) => n + Buffer.byteLength(buildPrompt(b.items)), 0),
  };
}

export interface DryRun {
  blockers: string[];
  model: string;
  eligible: number;
  cached: number;
  items: number;
  calls: number;
  callsToday: number;
  dailyCalls: number;
  /** Calls that would run now after the daily cap. */
  callsAllowed: number;
  payloadBytes: number;
  /** The exact user message of the first call, cut to `sampleItems` items. Nothing else is sent besides the fixed system prompt. */
  samplePrompt: string;
  systemPrompt: string;
  args: string[];
}

export function callsToday(store: ReadStore, now: Date): number {
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  try {
    return Number(
      store.db.prepare("SELECT COUNT(*) AS n FROM classify_calls WHERE at >= ?").get(start.toISOString())?.[
        "n"
      ] ?? 0,
    );
  } catch {
    return 0; // not upgraded yet
  }
}

export function dryRun(
  store: ReadStore,
  cfg: ClassifyConfig,
  projectsDir: string,
  now: Date,
  sampleItems = 3,
): DryRun {
  const plan = planRun(store, cfg, projectsDir, now);
  const today = callsToday(store, now);
  const first = plan.batches[0];
  const ids = first ? first.items.slice(0, sampleItems) : [];
  return {
    blockers: classifyBlockers(cfg),
    model: cfg.model,
    eligible: plan.eligible,
    cached: plan.cached,
    items: plan.items,
    calls: plan.batches.length,
    callsToday: today,
    dailyCalls: cfg.dailyCalls,
    callsAllowed: Math.max(0, Math.min(plan.batches.length, cfg.dailyCalls - today)),
    payloadBytes: plan.payloadBytes,
    samplePrompt: ids.length > 0 ? buildPrompt(ids) : "",
    systemPrompt: CLASSIFY_SYSTEM_PROMPT,
    args: claudeArgs(cfg.model, classifySchema(ids.map((i) => i.id))).map((a, i, all) =>
      all[i - 1] === "--json-schema" ? "<schema>" : a,
    ),
  };
}

// ---- the run ----------------------------------------------------------------------------------

export type FailureKind = "timeout" | "exit" | "invalid";

export interface JobStatus {
  state: "idle" | "running";
  runId: string | null;
  startedAt: string | null;
  finishedAt: string | null;
  itemsPlanned: number;
  callsPlanned: number;
  callsDone: number;
  callsFailed: number;
  suggestions: number;
  /** True when the daily cap cut the run short. */
  capReached: boolean;
  /** True when consecutive failures stopped the run. */
  stoppedEarly: boolean;
  lastFailure: FailureKind | null;
  /** What auto-accept did at the end of the last run, when it is on. */
  lastAuto: BatchResult | null;
}

export type StartResult =
  | { started: true; runId: string }
  | { started: false; reason: "blocked" | "running"; blockers: string[] };

export interface JobOptions {
  store: Store;
  home: string;
  projectsDir: string;
  env?: NodeJS.ProcessEnv;
  /** Reads the config at the start of every run, so a settings change applies to the next run. */
  config: () => ClassifyConfig;
  spawn?: Spawner;
  now?: () => Date;
  log?: (line: string) => void;
}

export interface ClassifyJob {
  status(): JobStatus;
  start(): StartResult;
  /** Resolves when the current run (if any) has finished. */
  idle(): Promise<void>;
}

const IDLE: JobStatus = {
  state: "idle",
  runId: null,
  startedAt: null,
  finishedAt: null,
  itemsPlanned: 0,
  callsPlanned: 0,
  callsDone: 0,
  callsFailed: 0,
  suggestions: 0,
  capReached: false,
  stoppedEarly: false,
  lastFailure: null,
  lastAuto: null,
};

function toSuggestions(batch: PlannedBatch, got: ClassifiedItem[]): NewSuggestion[] {
  const out: NewSuggestion[] = [];
  const keyOf = (id: string): string | undefined => batch.keys[batch.items.findIndex((i) => i.id === id)];
  const pairs = new Set<string>();
  for (const c of got) {
    const key = keyOf(c.id);
    const hash = batch.hashes[batch.items.findIndex((i) => i.id === c.id)];
    if (!key || !hash) continue;
    if (!isExplicitKey(key)) {
      out.push({
        itemKey: key,
        kind: "title",
        payload: { title: c.title, reason: c.reason },
        confidence: c.confidence,
        contentHash: hash,
      });
    }
    out.push({
      itemKey: key,
      kind: "topic",
      payload: { topic: c.topic, kind: c.kind, reason: c.reason },
      confidence: c.confidence,
      contentHash: hash,
    });
    for (const o of c.sameAs) {
      const other = keyOf(o.id);
      if (!other || other === key) continue;
      const pair = JSON.stringify([key, other].toSorted());
      if (pairs.has(pair)) continue;
      pairs.add(pair);
      out.push({
        itemKey: key,
        kind: "group",
        payload: { with: other, reason: c.reason },
        confidence: o.confidence,
        contentHash: hash,
      });
    }
  }
  return out;
}

export function createClassifyJob(opts: JobOptions): ClassifyJob {
  const { store } = opts;
  const run = opts.spawn ?? spawnClaude;
  const clock = opts.now ?? (() => new Date());
  const log = opts.log ?? (() => undefined);
  let status: JobStatus = { ...IDLE };
  let current: Promise<void> = Promise.resolve();

  const execute = async (cfg: ClassifyConfig, runId: string): Promise<void> => {
    const now = clock();
    const plan = planRun(store, cfg, opts.projectsDir, now);
    const allowed = Math.max(0, cfg.dailyCalls - callsToday(store, now));
    const batches = plan.batches.slice(0, allowed);
    status = {
      ...status,
      itemsPlanned: batches.reduce((n, b) => n + b.items.length, 0),
      callsPlanned: batches.length,
      capReached: plan.batches.length > allowed,
    };
    const info = { runId, model: cfg.model, promptHash: promptHash() };
    const env = { ...(opts.env ?? process.env), VANTAGE_SKIP: "1" };
    let next = 0;
    let streak = 0;
    const worker = async (): Promise<void> => {
      while (streak < MAX_CONSECUTIVE_FAILURES) {
        const batch = batches[next++];
        if (!batch) return;
        const t0 = Date.now();
        // Under the Vantage home, where ingestion drops everything that happens (docs/specs/ingestion.md).
        const base = join(workDirOf(opts.home), "classify");
        mkdirSync(base, { recursive: true });
        const cwd = mkdtempSync(join(base, "c-"));
        let failure: FailureKind | null = null;
        let got: ClassifiedItem[] | null = null;
        try {
          const ids = batch.items.map((i) => i.id);
          const r = await run({
            command: cfg.command,
            args: claudeArgs(cfg.model, classifySchema(ids)),
            input: buildPrompt(batch.items),
            cwd,
            env,
            timeoutMs: cfg.timeoutMs,
          });
          if (r.timedOut) failure = "timeout";
          else if (r.code !== 0) failure = "exit";
          else {
            got = parseClassifyOutput(r.stdout, ids);
            if (got === null) failure = "invalid";
          }
        } catch {
          failure = "exit";
        } finally {
          rmSync(cwd, { recursive: true, force: true });
        }
        store.db
          .prepare("INSERT INTO classify_calls (at, run_id, ok, items, ms) VALUES (?, ?, ?, ?, ?)")
          .run(clock().toISOString(), runId, failure === null ? 1 : 0, batch.items.length, Date.now() - t0);
        status = { ...status, callsDone: status.callsDone + 1 };
        if (failure !== null || got === null) {
          streak++;
          status = { ...status, callsFailed: status.callsFailed + 1, lastFailure: failure };
          log(`classify call failed: ${failure}`);
          continue;
        }
        streak = 0;
        const n = recordSuggestions(store, info, toSuggestions(batch, got), clock());
        status = { ...status, suggestions: status.suggestions + n };
      }
    };
    await Promise.all(Array.from({ length: CLASSIFY_PARALLEL }, worker));
    status = { ...status, stoppedEarly: streak >= MAX_CONSECUTIVE_FAILURES };
    if (cfg.autoAccept !== "off") {
      const kinds =
        cfg.autoAccept === "titles" ? (["title"] as const) : (["title", "topic", "group"] as const);
      const result = applyNow(store, "auto_accept", { kinds, minConfidence: cfg.autoMinConfidence }, clock());
      status = { ...status, lastAuto: result };
      if (result.total > 0)
        log(`classify auto-accepted ${result.total} suggestion(s) in batch ${result.batchId}`);
    }
  };

  return {
    status: () => status,
    start() {
      if (status.state === "running") return { started: false, reason: "running", blockers: [] };
      const cfg = opts.config();
      const blockers = classifyBlockers(cfg);
      if (blockers.length > 0) return { started: false, reason: "blocked", blockers };
      const runId = `run-${clock().getTime().toString(36)}`;
      status = { ...IDLE, state: "running", runId, startedAt: clock().toISOString() };
      current = execute(cfg, runId)
        .catch((e: unknown) => log(`classify run failed: ${e instanceof Error ? e.name : "unknown"}`))
        .finally(() => {
          status = { ...status, state: "idle", finishedAt: clock().toISOString() };
        });
      return { started: true, runId };
    },
    idle: () => current,
  };
}
