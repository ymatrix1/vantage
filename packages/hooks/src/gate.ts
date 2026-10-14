// Stop hook proof gate (D60, D53, docs/specs/proof.md#the-gate). Reads the item state the daemon
// derived for the session, read-only. Silent whenever it can't tell: no store, no session, a read
// error. It never throws and never exits 1.
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

export type GateMode = "off" | "warn" | "block";

/** What the gate wants to say. `block` is a decision only; the entry point doesn't wire exit 2 yet. */
export type GateDecision = { kind: "silent" } | { kind: "warn" | "block"; message: string };

export interface GateOutput {
  exitCode: 0;
  /** JSON for Claude Code on stdout, empty when there is nothing to say. */
  stdout: string;
}

const isMode = (v: string): v is GateMode => v === "off" || v === "warn" || v === "block";
const isRec = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null;
const DOC_EXT = /\.(?:md|mdx|txt|rst)$/i;
/** Proof statuses that mean "nothing counts right now" for an item with code edits. */
const MISSING = new Set(["none", "expired", "failed", "weak"]);

const WHY: Record<string, string> = {
  none: "No test or data check has run since.",
  expired: "The last passing check ran before your latest edit.",
  failed: "The last check failed.",
  weak: "The last check cannot count (it cannot fail, or it ran no tests).",
};

const pick = (v: string | undefined): GateMode | null => {
  const m = v?.trim().toLowerCase();
  return m && isMode(m) ? m : null;
};

/** `VANTAGE_GATE_MODE`, else `proof_gate = "..."` in `config.toml`, else `warn`. Unknown values mean `warn`. */
export function gateMode(home: string, env: NodeJS.ProcessEnv = process.env): GateMode {
  const fromEnv = pick(env["VANTAGE_GATE_MODE"]);
  if (fromEnv) return fromEnv;
  try {
    const text = readFileSync(join(home, "config.toml"), "utf8");
    const m = /^\s*proof_gate\s*=\s*["']?([A-Za-z]+)["']?\s*(?:#.*)?$/m.exec(text);
    return pick(m?.[1]) ?? "warn";
  } catch {
    return "warn";
  }
}

interface StopInput {
  sessionId: string;
  stopHookActive: boolean;
}

function parseStop(stdin: string): StopInput | null {
  try {
    const h: unknown = JSON.parse(stdin);
    if (!isRec(h)) return null;
    const sessionId = h["session_id"];
    if (typeof sessionId !== "string" || !sessionId) return null;
    return { sessionId, stopHookActive: h["stop_hook_active"] === true };
  } catch {
    return null;
  }
}

const base = (p: string): string => p.replaceAll("\\", "/").split("/").pop() || p;

function pathsOf(payloadJson: unknown): string[] | null {
  try {
    const p: unknown = JSON.parse(String(payloadJson));
    if (!isRec(p)) return null;
    const out: string[] = [];
    if (typeof p["path"] === "string" && p["path"]) out.push(p["path"]);
    if (Array.isArray(p["paths"])) for (const x of p["paths"]) if (typeof x === "string" && x) out.push(x);
    return out.length > 0 ? out : null;
  } catch {
    return null;
  }
}

function message(files: string[], statuses: string[]): string {
  const shown = files.slice(0, 3).map((f) => `\`${f}\``);
  const more = files.length > 3 ? ` and ${files.length - 3} more` : "";
  const what = shown.length > 0 ? `${shown.join(", ")}${more}` : "code files";
  const why = [...new Set(statuses.map((s) => WHY[s] ?? WHY["none"]))].join(" ");
  return `Vantage: you changed ${what} with no fresh proof. ${why} Run a test or data check that covers them before calling this done.`;
}

/**
 * Decides from the daemon's store. A missing or unreadable store, an unknown session, a session with no
 * linked item, docs-only edits and fresh proof all give `silent`. `stop_hook_active` true is silent too:
 * the agent already continued once because of a Stop hook, so the gate never fires twice in a row.
 */
export async function decideGate(stdin: string, dbPath: string, mode: GateMode): Promise<GateDecision> {
  if (mode === "off") return { kind: "silent" };
  const input = parseStop(stdin);
  if (!input || input.stopHookActive) return { kind: "silent" };
  if (!existsSync(dbPath)) return { kind: "silent" };
  // Loaded only here so the spool-only hooks never pay for it.
  const { DatabaseSync } = await import("node:sqlite");
  const db = new DatabaseSync(dbPath, { readOnly: true });
  try {
    db.exec("PRAGMA busy_timeout = 200");
    const edits = db
      .prepare(
        "SELECT payload_json FROM events WHERE session_id = ? AND kind = 'file.edited' ORDER BY occurred_at",
      )
      .all(input.sessionId);
    const files: string[] = [];
    let code = false;
    for (const r of edits) {
      const paths = pathsOf(r["payload_json"]);
      if (paths === null) {
        code = true; // unknown paths count as code, as in the stage machine
        continue;
      }
      for (const p of paths) {
        if (DOC_EXT.test(p)) continue;
        code = true;
        if (!files.includes(base(p))) files.push(base(p));
      }
    }
    if (!code) return { kind: "silent" };
    const statuses = db
      .prepare(
        `SELECT DISTINCT w.proof_status AS proof_status FROM events e
           JOIN links l ON l.event_id = e.id AND l.undone_at IS NULL
           JOIN work_items w ON w.item_key = l.item_key
          WHERE e.session_id = ? AND w.stage != 'asked' AND w.docs_only = 0`,
      )
      .all(input.sessionId)
      .map((r) => String(r["proof_status"]));
    if (statuses.length === 0 || statuses.some((s) => !MISSING.has(s))) return { kind: "silent" };
    return { kind: mode === "block" ? "block" : "warn", message: message(files, statuses) };
  } finally {
    db.close();
  }
}

/**
 * Block mode is not wired (Q11): it renders as warn, so no path returns exit 2 yet. The block contract
 * (D60) is exit 2 with the message on stderr, only when `stop_hook_active` is false.
 */
export function renderGate(decision: GateDecision): GateOutput {
  if (decision.kind === "silent") return { exitCode: 0, stdout: "" };
  return { exitCode: 0, stdout: JSON.stringify({ systemMessage: decision.message }) };
}

/** Never throws: any failure is silence. */
export async function runGate(
  stdin: string,
  home: string,
  env: NodeJS.ProcessEnv = process.env,
): Promise<GateOutput> {
  try {
    return renderGate(await decideGate(stdin, join(home, "vantage.db"), gateMode(home, env)));
  } catch {
    return { exitCode: 0, stdout: "" };
  }
}
