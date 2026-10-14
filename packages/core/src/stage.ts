// Stage machine for Asked, Built and Proven (docs/specs/lifecycle.md, docs/specs/proof.md).
// Pure and replayable: events plus links in, per-item stage out. A card moves only on evidence
// (D3): never because an agent said so. Reviewed, Shipped and Verified are out of Phase 1.
import type { VantageEvent } from "./events.ts";
import type { Link } from "./linker.ts";

export type Stage = "asked" | "built" | "proven";
export type ProofType = "test" | "data_check";
/** L1 ran; L2 linked (the command names a changed path). L0, L3 and L4 need data Phase 1 lacks. */
export type ProofLevel = 1 | 2;
/** fresh: counts. expired: an edit landed after it. failed: the check failed. weak: never counts. */
export type ProofState = "fresh" | "expired" | "failed" | "weak";
export type WeakReason =
  | "cannot-fail" // `pnpm test || true`: exit 0 whatever happens
  | "zero-tests" // the run reported 0 tests, or only skipped ones
  | "no-tests-allowed" // `--passWithNoTests`: passes with 0 tests
  | "before-build"; // ran before the item had any code change
export type ProofStatus = "none" | "fresh" | "expired" | "failed" | "weak" | "not_required";
export type FlagKind = "unproven_claim" | "thrashing" | "forgotten";

export interface Evidence {
  source: string;
  sourceId: string;
}

export interface Proof {
  evidence: Evidence;
  type: ProofType;
  level: ProofLevel;
  state: ProofState;
  command: string;
  cwd?: string;
  ranAt: string;
  /** Present when state is "weak". */
  weak?: WeakReason;
  /** The edit that expired it, when state is "expired". */
  expiredBy?: Evidence;
  /** Hash of the code edits made before the check ran (event ids stand in for file content). */
  fingerprint: string;
}

export interface Transition {
  from: Stage | null;
  to: Stage;
  at: string;
  /** The event that moved the card. Answers "why did this change?" (D45). */
  evidence: Evidence;
  reason: string;
}

export interface Flag {
  kind: FlagKind;
  severity: "amber";
  reason: string;
  raisedAt: string;
}

export interface ItemState {
  itemKey: string;
  stage: Stage;
  /** Highest level among fresh proofs; 0 when none. */
  proofLevel: 0 | ProofLevel;
  proofStatus: ProofStatus;
  proofs: Proof[];
  transitions: Transition[];
  flags: Flag[];
  /** Only documentation files were edited (D53): proof is not required. */
  docsOnly: boolean;
  codeEdits: number;
  /** Repo and branch the item's events name (payload `repo` or `cwd` folder, `branch`); null when unknown. */
  repo: string | null;
  branch: string | null;
  firstActivity: string;
  lastActivity: string;
}

export interface StageOptions {
  /** Used for `forgotten`; when absent that flag is never raised. */
  now?: Date;
  /** Days without activity before Asked or Built is `forgotten` (scoring spec). */
  forgottenDays?: number;
  /** Consecutive failing edit cycles on one file that raise `thrashing` (D55). */
  thrashThreshold?: number;
  /**
   * `thrashing` and `unproven_claim` are raised only while the item's last activity is this many hours
   * old or less (default 48; proposed D84). Older items keep stage and proof state but no urgent flag.
   * Without `now` the window cannot be applied and every flag is raised as before.
   */
  flagWindowHours?: number;
}

export const DEFAULT_FLAG_WINDOW_HOURS = 48;

const DOC_EXT = /\.(?:md|mdx|txt|rst)$/i;
const isDoc = (path: string): boolean => DOC_EXT.test(path);

// Test runners and data tools. Deliberately a short allowlist: `pnpm check` can be lint only.
const TEST_RUNNERS: readonly RegExp[] = [
  /^(?:npx\s+|pnpm\s+(?:exec\s+)?|yarn\s+(?:run\s+)?|bunx?\s+)?(?:vitest|jest|mocha|playwright\s+test)\b/,
  /^(?:npm|pnpm|yarn|bun)\s+(?:run\s+)?test\b/,
  /^(?:python3?\s+-m\s+)?(?:pytest|unittest)\b/,
  /^dotnet\s+test\b/,
  /^dbt\s+(?:test|build)\b/,
  /^go\s+test\b/,
  /^cargo\s+test\b/,
  /^(?:mvn|\.\/mvnw)\s+(?:\S+\s+)*test\b/,
  /^(?:gradle|\.\/gradlew)\s+(?:\S+\s+)*test\b/,
  /^(?:bundle\s+exec\s+)?rspec\b/,
];
const DATA_TOOLS: readonly RegExp[] = [/^duckdb\b/, /^bq\s+query\b/, /^psql\b/, /^sqlcmd\b/];

const splitSegments = (command: string): string[] =>
  command
    .split(/&&|\|\||;|\|(?!\|)|\n/)
    .map((s) => s.trim())
    .filter((s) => s !== "");

/** Leading `cd x` / env assignments are not the command. */
const bare = (segment: string): string => segment.replace(/^(?:[A-Za-z_]\w*=\S*\s+)+/, "");

function classify(command: string): { type: ProofType; segment: string } | null {
  for (const raw of splitSegments(command)) {
    const segment = bare(raw);
    if (TEST_RUNNERS.some((r) => r.test(segment))) return { type: "test", segment };
    if (DATA_TOOLS.some((r) => r.test(segment))) return { type: "data_check", segment };
  }
  return null;
}

/** `check || true`, `check; exit 0`: the whole command succeeds whatever the check does. */
const CANNOT_FAIL = /(?:\|\||;)\s*(?:true|exit\s+0|:|echo\b[^|&;]*)\s*(?:$|\n)|\|\|\s*(?:true|exit\s+0)\b/;
const PASS_WITH_NO_TESTS = /--pass-?with-?no-?tests|--no-tests|--allow-no-tests/i;

function str(v: unknown): string | undefined {
  return typeof v === "string" && v !== "" ? v : undefined;
}

const sources = (e: VantageEvent): Evidence => ({ source: e.source, sourceId: e.sourceId });

/** Paths a file.edited event names; `null` when it wrote files it could not name. */
function editPaths(e: VantageEvent): string[] | null {
  const p = e.payload;
  const out: string[] = [];
  const one = str(p["path"]);
  if (one) out.push(one);
  if (Array.isArray(p["paths"])) for (const x of p["paths"]) if (typeof x === "string" && x) out.push(x);
  return out.length > 0 ? out : null;
}

function hash(text: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 0x01000193) >>> 0;
  return h.toString(16).padStart(8, "0");
}

/** The run reported its own counts (hooks may add `result: {run, skipped}`); true when it ran nothing. */
function ranNothing(e: VantageEvent): boolean {
  const r = e.payload["result"];
  if (typeof r !== "object" || r === null || Array.isArray(r)) return false;
  const run = Object.entries(r).find(([k]) => k === "run")?.[1];
  const skipped = Object.entries(r).find(([k]) => k === "skipped")?.[1];
  if (typeof run !== "number") return false;
  return run === 0 || (typeof skipped === "number" && skipped >= run);
}

const norm = (p: string): string => p.replaceAll("\\", "/").toLowerCase();

/** File name without its folders; flag reasons name files, never full paths or commands. */
const baseName = (p: string): string => p.replaceAll("\\", "/").split("/").filter(Boolean).pop() ?? p;

/** Repo and branch an event names. The repo is the `repo` field, else the last folder of `cwd`. */
function originOf(events: readonly VantageEvent[]): { repo: string | null; branch: string | null } {
  let repo: string | null = null;
  let branch: string | null = null;
  for (const e of events) {
    repo ??= str(e.payload["repo"]) ?? (str(e.payload["cwd"]) ? baseName(String(e.payload["cwd"])) : null);
    branch ??= str(e.payload["branch"]) ?? null;
    if (repo && branch) break;
  }
  return { repo, branch };
}

/** L2: the command names an edited file, or a test named after it (billing.ts, billing.test.ts). */
function namesChangedPath(command: string, edited: ReadonlySet<string>): boolean {
  const c = norm(command);
  for (const path of edited) {
    const base = path.slice(path.lastIndexOf("/") + 1);
    const stem = base.replace(/\.[^.]*$/, "");
    // Short stems ("a", "index") would match almost any command; only whole names count then.
    if (base && (c.includes(base) || (stem.length >= 5 && c.includes(stem)))) return true;
  }
  return false;
}

/** Replays one item's events in time order and returns its state. */
function evaluate(itemKey: string, events: readonly VantageEvent[], opts: StageOptions): ItemState {
  const threshold = opts.thrashThreshold ?? 3;
  const proofs: Proof[] = [];
  const transitions: Transition[] = [];
  let stage: Stage | null = null;
  let docEdits = 0;
  let codeEdits = 0;
  let lastCodeEdit: VantageEvent | null = null;
  const edited = new Set<string>(); // normalized code paths, for L2
  const editIds: string[] = []; // source ids of code edits so far, for the fingerprint
  let lastStop: VantageEvent | null = null;

  // Thrashing (D55): a cycle is edits, then the commands until the next edit.
  const counts = new Map<string, number>();
  let cyclePaths = new Set<string>();
  let cycleFailed = false;
  let cycleOpen = false;
  let cycleHadCommand = false;
  let thrashAt: string | null = null;
  let thrashPath = "";
  let lastEditPath = "";
  const closeCycle = (at: string): void => {
    if (cycleOpen && cycleFailed) {
      for (const p of cyclePaths) {
        const n = (counts.get(p) ?? 0) + 1;
        counts.set(p, n);
        if (n >= threshold && thrashAt === null) {
          thrashAt = at;
          thrashPath = p;
        }
      }
    }
    cyclePaths = new Set();
    cycleFailed = false;
    cycleOpen = false;
  };

  const move = (to: Stage, e: VantageEvent, reason: string): void => {
    if (stage === to) return;
    transitions.push({ from: stage, to, at: e.timestamp, evidence: sources(e), reason });
    stage = to;
  };

  const first = events[0];
  if (first) move("asked", first, "anchor linked");

  for (const e of events) {
    switch (e.kind) {
      case "file.edited": {
        if (e.payload["via"] === "shell-commit") break; // a commit through the shell is not an edit
        const paths = editPaths(e);
        const docOnly = paths !== null && paths.every(isDoc);
        // An edit after a command closes the previous cycle and opens the next.
        if (cycleHadCommand) {
          closeCycle(e.timestamp);
          cycleHadCommand = false;
        }
        cycleOpen = true;
        for (const p of paths ?? ["*"]) cyclePaths.add(p);
        if (docOnly) {
          docEdits++;
          if (stage === "asked") move("built", e, "first edit (documentation)");
          break;
        }
        codeEdits++;
        lastCodeEdit = e;
        editIds.push(e.sourceId);
        for (const p of paths ?? []) edited.add(norm(p));
        lastEditPath = paths?.at(-1) ?? lastEditPath;
        if (stage === "asked") move("built", e, "first code edit");
        for (const pr of proofs) {
          if (pr.state === "fresh") {
            pr.state = "expired";
            pr.expiredBy = sources(e);
          }
        }
        if (stage === "proven") move("built", e, "edit after proof expired it");
        break;
      }
      case "commit.created": {
        if (stage === "asked") move("built", e, "commit on the item's branch");
        break;
      }
      case "session.stopped": {
        lastStop = e;
        break;
      }
      case "command.ran": {
        const command = str(e.payload["command"]);
        if (!command) break;
        cycleHadCommand = cycleOpen;
        const failedRun = e.payload["ok"] === false;
        if (failedRun && cycleOpen) cycleFailed = true;
        const kind = classify(command);
        if (!kind) break;
        if (e.payload["ok"] === undefined) break; // outcome unknown: not evidence either way
        const fingerprint = hash(editIds.join("|"));
        const cwd = str(e.payload["cwd"]);
        const base = {
          evidence: sources(e),
          type: kind.type,
          command,
          ...(cwd ? { cwd } : {}),
          ranAt: e.timestamp,
          fingerprint,
        };
        if (failedRun) {
          proofs.push({ ...base, level: 1, state: "failed" });
          break;
        }
        let weak: WeakReason | undefined;
        if (stage === "asked") weak = "before-build";
        else if (CANNOT_FAIL.test(command)) weak = "cannot-fail";
        else if (PASS_WITH_NO_TESTS.test(command)) weak = "no-tests-allowed";
        else if (ranNothing(e)) weak = "zero-tests";
        if (weak) {
          proofs.push({ ...base, level: 1, state: "weak", weak });
          break;
        }
        // A passing qualifying check resets the thrash count (D55).
        counts.clear();
        thrashAt = null;
        cycleFailed = false;
        proofs.push({ ...base, level: namesChangedPath(command, edited) ? 2 : 1, state: "fresh" });
        move("proven", e, "passing check after the last code edit");
        break;
      }
      default:
        break;
    }
  }
  closeCycle(events.at(-1)?.timestamp ?? "");

  const docsOnly = docEdits > 0 && codeEdits === 0;
  const fresh = proofs.filter((p) => p.state === "fresh");
  const proofLevel = fresh.reduce<0 | ProofLevel>((m, p) => (p.level > m ? p.level : m), 0);
  const latest = proofs.at(-1);
  const proofStatus: ProofStatus =
    fresh.length > 0
      ? "fresh"
      : docsOnly && !latest
        ? "not_required"
        : latest
          ? latest.state === "fresh"
            ? "fresh"
            : latest.state
          : "none";

  const lastActivity = events.at(-1)?.timestamp ?? first?.timestamp ?? "";
  const flags: Flag[] = [];
  const windowMs = (opts.flagWindowHours ?? DEFAULT_FLAG_WINDOW_HOURS) * 3_600_000;
  const recent = !opts.now || opts.now.getTime() - Date.parse(lastActivity) <= windowMs;
  if (
    recent &&
    lastStop &&
    lastCodeEdit &&
    !docsOnly &&
    fresh.length === 0 &&
    Date.parse(lastStop.timestamp) >= Date.parse(lastCodeEdit.timestamp)
  ) {
    flags.push({
      kind: "unproven_claim",
      severity: "amber",
      reason: `Session stopped after editing ${lastEditPath ? baseName(lastEditPath) : "code"} with no passing check since.`,
      raisedAt: lastStop.timestamp,
    });
  }
  if (recent && thrashAt !== null) {
    flags.push({
      kind: "thrashing",
      severity: "amber",
      reason: `${threshold} failing edit cycles on ${thrashPath === "*" ? "the same files" : baseName(thrashPath)}`,
      raisedAt: thrashAt,
    });
  }
  const days = opts.forgottenDays ?? 5;
  if (opts.now && stage !== "proven" && lastActivity) {
    const idle = (opts.now.getTime() - Date.parse(lastActivity)) / 86_400_000;
    if (idle > days) {
      flags.push({
        kind: "forgotten",
        severity: "amber",
        reason: `No activity for ${Math.floor(idle)} days.`,
        raisedAt: opts.now.toISOString(),
      });
    }
  }

  return {
    itemKey,
    stage: stage ?? "asked",
    proofLevel,
    proofStatus,
    proofs,
    transitions,
    flags,
    docsOnly,
    codeEdits,
    ...originOf(events),
    firstActivity: first?.timestamp ?? "",
    lastActivity,
  };
}

const byTime = (events: readonly VantageEvent[]): VantageEvent[] =>
  events
    .map((e, i) => ({ e, i }))
    .toSorted((a, b) => Date.parse(a.e.timestamp) - Date.parse(b.e.timestamp) || a.i - b.i)
    .map((x) => x.e);

/**
 * Evaluates every linked item. Events with no live link feed nothing (unlinked or undone), and an
 * event linked to two items counts for both. Items come back sorted by key.
 */
export function computeStages(
  events: readonly VantageEvent[],
  links: readonly Link[],
  opts: StageOptions = {},
): ItemState[] {
  const byEvent = new Map<string, string[]>();
  for (const l of links) {
    const k = `${l.eventSource}|${l.eventSourceId}`;
    const keys = byEvent.get(k);
    if (keys) {
      if (!keys.includes(l.itemKey)) keys.push(l.itemKey);
    } else byEvent.set(k, [l.itemKey]);
  }
  const groups = new Map<string, VantageEvent[]>();
  for (const e of byTime(events)) {
    for (const key of byEvent.get(`${e.source}|${e.sourceId}`) ?? []) {
      const g = groups.get(key);
      if (g) g.push(e);
      else groups.set(key, [e]);
    }
  }
  return [...groups.keys()].toSorted().map((key) => evaluate(key, groups.get(key) ?? [], opts));
}
