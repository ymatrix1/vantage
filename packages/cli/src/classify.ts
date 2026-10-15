// `vantage classify` (docs/specs/classify.md#commands). `--dry-run`, `report` and `status`-free reads open the store
// read-only and need no daemon; everything that changes something goes through the daemon's API, so the job, the
// batch and the undo live in one place.
import { existsSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import {
  classifyReport,
  dryRun,
  loadOrCreateToken,
  readClassifyConfig,
  readHealth,
  renderReport,
  vantageHomeDir,
  type DryRun,
  type SuggestionFilter,
  type SuggestionKind,
} from "@vantage/daemon";

export interface ClassifyIo {
  out(line: string): void;
  err(line: string): void;
  env: NodeJS.ProcessEnv;
  confirm?: (question: string) => Promise<boolean>;
  /** Test seam for the daemon call. */
  fetch?: typeof fetch;
  /** Test seam for the poll delay while a run is going. */
  sleep?: (ms: number) => Promise<void>;
}

const USAGE = [
  "Usage: vantage classify [--dry-run [--sample N] [--json]]",
  "       vantage classify status | report [--json] | undo [--batch ID]",
  "       vantage classify accept|dismiss [--all] [--min-confidence 0.8] [--kind titles|topics|groups] [--repo NAME] [--yes]",
].join("\n");

const KIND_WORD: Record<string, SuggestionKind> = { titles: "title", topics: "topic", groups: "group" };
const kb = (n: number): string => `${(n / 1024).toFixed(1)} KB`;

const rec = (v: unknown): Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v) ? Object.fromEntries(Object.entries(v)) : {};
const str = (v: unknown): string => (typeof v === "string" ? v : "");
const nr = (v: unknown): number => (typeof v === "number" ? v : 0);
const strs = (v: unknown): string[] =>
  Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];

interface SampleRow {
  kind: string;
  confidence: number;
  itemTitle: string;
  summary: string;
}
interface PreviewView {
  total: number;
  byKind: { title: number; topic: number; group: number };
  sample: SampleRow[];
  token: string;
}

function toPreview(json: Record<string, unknown>): PreviewView {
  const by = rec(json["byKind"]);
  const sample = Array.isArray(json["sample"]) ? json["sample"] : [];
  return {
    total: nr(json["total"]),
    byKind: { title: nr(by["title"]), topic: nr(by["topic"]), group: nr(by["group"]) },
    sample: sample.map((x) => {
      const r = rec(x);
      return {
        kind: str(r["kind"]),
        confidence: nr(r["confidence"]),
        itemTitle: str(r["itemTitle"]),
        summary: str(r["summary"]),
      };
    }),
    token: str(json["token"]),
  };
}

function openRead(io: ClassifyIo): DatabaseSync | null {
  const path = join(vantageHomeDir(io.env), "vantage.db");
  if (!existsSync(path)) {
    io.err("No database yet. Run `vantage start` once, then use Claude Code for a while.");
    return null;
  }
  const db = new DatabaseSync(path, { readOnly: true });
  db.exec("PRAGMA busy_timeout = 2000");
  return db;
}

const projectsDir = (env: NodeJS.ProcessEnv): string =>
  env["VANTAGE_PROJECTS_DIR"] || join(homedir(), ".claude", "projects");

export function renderDryRun(d: DryRun): string[] {
  const lines = ["Classify dry run: nothing was sent."];
  lines.push(`items: ${d.eligible} settled, ${d.cached} already classified → ${d.items} to send`);
  lines.push(
    `calls: ${d.calls} (model ${d.model}, 2 at a time) → ${d.callsAllowed} allowed now (${d.callsToday} of ${d.dailyCalls} used today)`,
  );
  lines.push(`payload: ${kb(d.payloadBytes)} in total, plus the fixed system prompt per call`);
  if (d.blockers.length > 0) {
    lines.push("blocked: a run would not start:");
    for (const b of d.blockers) lines.push(`  ✗ ${b}`);
    lines.push("  Settings: docs/specs/settings.md#classify");
  } else lines.push("ready: settings allow a run (`vantage classify`).");
  if (d.samplePrompt) {
    lines.push("", "Exact user message of the first call (first items only):", d.samplePrompt);
    lines.push("", "System prompt:", d.systemPrompt);
    lines.push("", `Command: claude ${d.args.map((a) => (a === "" ? '""' : a)).join(" ")}`);
    lines.push("Child environment: VANTAGE_SKIP=1, empty temp folder, no tools, no MCP, no settings.");
  }
  return lines;
}

interface Daemon {
  call(
    method: "GET" | "POST",
    path: string,
    body?: unknown,
  ): Promise<{ status: number; json: Record<string, unknown> }>;
}

function daemon(io: ClassifyIo): Daemon | null {
  const home = vantageHomeDir(io.env);
  const health = readHealth(home);
  if (!health || health.state !== "running") {
    io.err("Vantage is not running. Start it with `vantage start`.");
    return null;
  }
  const token = loadOrCreateToken(join(home, "token"));
  const f = io.fetch ?? fetch;
  return {
    async call(method, path, body) {
      const res = await f(`http://127.0.0.1:${health.port}${path}`, {
        method,
        headers: {
          Authorization: `Bearer ${token}`,
          ...(body === undefined ? {} : { "Content-Type": "application/json" }),
        },
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      });
      const text = await res.text();
      let json: Record<string, unknown> = {};
      try {
        json = text ? rec(JSON.parse(text)) : {};
      } catch {
        // not JSON: leave empty
      }
      return { status: res.status, json };
    },
  };
}

function statusLines(j: Record<string, unknown>): string[] {
  const c = rec(j["counts"]);
  const open = rec(c["open"]);
  const job = rec(j["job"]);
  const out = [
    `open: ${nr(open["title"])} titles, ${nr(open["topic"])} topics, ${nr(open["group"])} groups`,
    `decided: ${nr(c["accepted"])} accepted, ${nr(c["dismissed"])} dismissed, ${nr(c["undone"])} undone`,
    `calls: ${nr(j["callsToday"])} of ${nr(j["dailyCalls"])} today (model ${str(j["model"])})`,
    `auto-accept: ${str(j["autoAccept"])}`,
  ];
  const blockers = strs(j["blockers"]);
  if (blockers.length > 0) out.push(`blocked: ${blockers.join("; ")}`);
  if (job["state"] === "running")
    out.push(`running: ${nr(job["callsDone"])} of ${nr(job["callsPlanned"])} calls`);
  return out;
}

function previewLines(p: PreviewView, verb: string): string[] {
  const out = [
    `${verb}: ${p.total} suggestions (${p.byKind.title} titles, ${p.byKind.topic} topics, ${p.byKind.group} groups)`,
  ];
  for (const s of p.sample)
    out.push(
      `  ${s.kind.padEnd(5)} ${s.confidence.toFixed(2)}  ${s.itemTitle.slice(0, 40)} → ${s.summary.slice(0, 60)}`,
    );
  if (p.total > p.sample.length) out.push(`  … and ${p.total - p.sample.length} more`);
  return out;
}

async function decide(action: "accept" | "dismiss", args: string[], io: ClassifyIo): Promise<number> {
  const filter: { kinds?: SuggestionKind[]; minConfidence?: number; repo?: string } = {};
  let all = false;
  let yes = false;
  let explicitMin = false;
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    const v = args[i + 1];
    if (a === "--all") all = true;
    else if (a === "--yes") yes = true;
    else if (a === "--min-confidence" && v !== undefined) {
      const n = Number(v);
      if (!(n >= 0 && n <= 1) || v === "") {
        io.err("Not a valid --min-confidence: use a number from 0 to 1.");
        return 2;
      }
      filter.minConfidence = n;
      explicitMin = true;
      i++;
    } else if (a === "--kind" && v !== undefined) {
      const k = KIND_WORD[v];
      if (!k) {
        io.err("Not a valid --kind: use titles, topics or groups.");
        return 2;
      }
      filter.kinds = [...(filter.kinds ?? []), k];
      i++;
    } else if (a === "--repo" && v !== undefined && v !== "" && !v.startsWith("--")) {
      filter.repo = v;
      i++;
    } else {
      io.err(USAGE);
      return 2;
    }
  }
  // Accept takes the 0.8 default unless --all asks for everything; dismiss with no filter means everything.
  if (!explicitMin && !all && action === "accept") filter.minConfidence = 0.8;
  const d = daemon(io);
  if (!d) return 1;
  const body = { action, filter: filter as SuggestionFilter };
  const pv = await d.call("POST", "/api/classify/preview", body);
  if (pv.status !== 200) {
    io.err(`Could not preview (${pv.status}).`);
    return 1;
  }
  const preview = toPreview(pv.json);
  if (preview.total === 0) {
    io.out("Nothing to " + action + " with this filter.");
    return 0;
  }
  const verb = action === "accept" ? "Would accept" : "Would dismiss";
  for (const l of previewLines(preview, verb)) io.out(l);
  if (!yes) {
    if (!io.confirm) {
      io.err("Nothing was applied. Run again with --yes to apply (there is no terminal to ask).");
      return 1;
    }
    if (!(await io.confirm(`${action === "accept" ? "Accept" : "Dismiss"} ${preview.total}?`))) {
      io.out("Nothing was applied.");
      return 0;
    }
  }
  const done = await d.call("POST", "/api/classify/apply", { ...body, token: preview.token });
  if (done.status === 409) {
    io.err("The suggestions changed since the preview. Nothing was applied; run again.");
    return 1;
  }
  if (done.status !== 200) {
    io.err(`Could not apply (${done.status}).`);
    return 1;
  }
  io.out(
    `✓ ${action === "accept" ? "accepted" : "dismissed"} ${nr(done.json["total"])} in batch ${str(done.json["batchId"]).slice(0, 8)}`,
  );
  io.out("👉 Undo this batch: vantage classify undo");
  return 0;
}

async function start(io: ClassifyIo): Promise<number> {
  const d = daemon(io);
  if (!d) return 1;
  const r = await d.call("POST", "/api/classify/run", {});
  if (r.status === 403) {
    io.err("Classify is off. Settings that block it:");
    for (const b of strs(r.json["blockers"])) io.err(`  ✗ ${b}`);
    io.err("See `vantage classify --dry-run` and docs/specs/settings.md#classify.");
    return 1;
  }
  if (r.status === 409) io.out("A run is already going; showing its progress.");
  else if (r.status !== 200) {
    io.err(`Could not start (${r.status}).`);
    return 1;
  }
  const sleep = io.sleep ?? ((ms: number) => new Promise<void>((res) => setTimeout(res, ms)));
  let last = "";
  for (;;) {
    const s = await d.call("GET", "/api/classify/status");
    const job = rec(s.json["job"]);
    const line = `calls ${nr(job["callsDone"])}/${nr(job["callsPlanned"])}, ${nr(job["suggestions"])} suggestions, ${nr(job["callsFailed"])} failed`;
    if (line !== last) io.out(line);
    last = line;
    if (job["state"] !== "running") {
      if (job["capReached"])
        io.out(
          "⚠ the daily call cap stopped the run; the rest waits for tomorrow or a higher engines.classify.daily_calls",
        );
      if (job["stoppedEarly"])
        io.out(
          `⚠ stopped after repeated failures (${str(job["lastFailure"])}): no suggestion was stored for them`,
        );
      const auto = rec(job["lastAuto"]);
      if (nr(auto["total"]) > 0)
        io.out(
          `auto-accept applied ${nr(auto["total"])} in batch ${str(auto["batchId"]).slice(0, 8)} (undo: vantage classify undo)`,
        );
      for (const l of statusLines(s.json)) io.out(l);
      io.out("👉 Preview and apply: vantage classify accept");
      return 0;
    }
    await sleep(2000);
  }
}

export async function runClassify(args: string[], io: ClassifyIo, now = new Date()): Promise<number> {
  const [sub, ...rest] = args;
  if (sub === "accept" || sub === "dismiss") return decide(sub, rest, io);
  if (sub === "undo") {
    const d = daemon(io);
    if (!d) return 1;
    const i = rest.indexOf("--batch");
    const r = await d.call(
      "POST",
      "/api/classify/undo",
      i >= 0 && rest[i + 1] ? { batchId: rest[i + 1] } : {},
    );
    if (r.status === 404) {
      io.out("No batch to undo.");
      return 0;
    }
    if (r.status !== 200) {
      io.err(`Could not undo (${r.status}).`);
      return 1;
    }
    const u = rec(r.json["undone"]);
    io.out(`✓ undid batch ${str(u["id"]).slice(0, 8)} (${nr(u["total"])} suggestions)`);
    return 0;
  }
  if (sub === "status") {
    const d = daemon(io);
    if (!d) return 1;
    for (const l of statusLines((await d.call("GET", "/api/classify/status")).json)) io.out(l);
    return 0;
  }
  if (sub === "report") {
    const db = openRead(io);
    if (!db) return 1;
    try {
      const r = classifyReport({ db });
      if (rest.includes("--json")) io.out(JSON.stringify(r, null, 2));
      else for (const l of renderReport(r)) io.out(l);
      return 0;
    } catch {
      io.out("No classifier suggestions yet.");
      return 0;
    } finally {
      db.close();
    }
  }
  if (sub === "--dry-run" || (sub === undefined ? false : args.includes("--dry-run"))) {
    const db = openRead(io);
    if (!db) return 1;
    try {
      const i = args.indexOf("--sample");
      const n = i >= 0 ? Number(args[i + 1]) : 3;
      const d = dryRun(
        { db },
        readClassifyConfig(vantageHomeDir(io.env)),
        projectsDir(io.env),
        now,
        Number.isInteger(n) && n > 0 && n <= 20 ? n : 3,
      );
      if (args.includes("--json")) io.out(JSON.stringify(d, null, 2));
      else for (const l of renderDryRun(d)) io.out(l);
      return 0;
    } finally {
      db.close();
    }
  }
  if (sub === undefined) return start(io);
  io.err(USAGE);
  return sub === "--help" || sub === "help" ? 0 : 2;
}
