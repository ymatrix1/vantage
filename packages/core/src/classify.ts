// Pure parts of `vantage classify` (docs/specs/classify.md): what may be sent, the prompt, the output
// schema and the output validator. No I/O. The model only suggests text and groupings (D57); a field it
// returns for status, stage, proof or flags is never read.
import { createHash } from "node:crypto";

export const CLASSIFY_KINDS = [
  "feature",
  "bugfix",
  "docs",
  "refactor",
  "research",
  "chore",
  "question",
] as const;
export type ClassifyKind = (typeof CLASSIFY_KINDS)[number];

/** Bumped whenever the prompt or schema changes, so cached suggestions from an older prompt are not reused. */
export const CLASSIFY_PROMPT_VERSION = 1;
/** Folder under the Vantage home where sessions Vantage starts itself work: `<home>/work/classify/...`. */
export const WORK_DIR_NAME = "work";

/**
 * True when `path` is `dir` or inside it. Slashes and case are normalised, so a Windows path in any spelling
 * matches. Ingestion drops every event, transcript and session whose cwd is inside `<home>/work`, so a session
 * Vantage started itself can never become an item, whatever the Claude Code version.
 */
const normDir = (p: string): string =>
  p.replaceAll("\\", "/").replace(/\/+/g, "/").replace(/\/$/, "").toLowerCase();

export function isInsideDir(path: string, dir: string): boolean {
  const norm = normDir;
  const a = norm(path);
  const d = norm(dir);
  return d !== "" && (a === d || a.startsWith(`${d}/`));
}

export const TITLE_MAX = 60;
export const TOPIC_MAX = 40;
export const REASON_MAX = 120;
export const REQUEST_MAX = 300;
export const FILES_MAX = 10;

/** What the daemon knows about one item, before anything is removed. Fields beyond the allowed ones never reach the payload. */
export interface ClassifyCandidate {
  repo: string | null;
  branch: string | null;
  /** First request of the first session, raw. */
  request: string | null;
  /** File paths or names the item's sessions edited, raw. */
  files: readonly string[];
  sessions: number;
  edits: number;
  proof: string;
  title: string;
}

/** The only thing sent about one item. `id` is opaque and per batch, so item keys (which can hold paths) never leave. */
export interface PayloadItem {
  id: string;
  repo: string;
  branch: string;
  request: string;
  files: string[];
  sessions: number;
  edits: number;
  proof: string;
  title: string;
}

const URL_RE = /\b(?:https?|ftp|file|ssh):\/\/\S+|\bwww\.\S+/gi;
const EMAIL_RE = /[\w.+-]+@[\w-]+(?:\.[\w-]+)+/g;
// key=value or key: value where the key looks like a credential name.
const KEYVAL_RE =
  /\b(?:api[_-]?key|token|secret|pass(?:w(?:or)?d)?|pwd|auth(?:orization)?|bearer|credential)s?\s*[:=]\s*\S+/gi;
// Known token prefixes, then any long unbroken run of token characters, a hex digest or a long number.
const PREFIX_RE =
  /\b(?:sk|pk|rk|ghp|gho|ghs|ghu|github_pat|xox[abprs]|AKIA|AIza|ya29|eyJ)[-_A-Za-z0-9.]{6,}/g;
const LONG_RUN_RE = /[A-Za-z0-9+/_=-]{24,}/g;
const LONG_NUM_RE = /\b\d{9,}\b/g;
// Windows or POSIX style paths with at least two segments; a base name alone is not a path.
const PATH_RE = /(?:[A-Za-z]:)?(?:[\\/][\w.@~+-]+){2,}[\\/]?/g;

/** Removes URLs, emails, credential-looking runs and paths from free text. */
export function stripText(text: string): string {
  return text
    .replace(URL_RE, " ")
    .replace(EMAIL_RE, " ")
    .replace(KEYVAL_RE, " ")
    .replace(PREFIX_RE, " ")
    .replace(PATH_RE, " ")
    .replace(LONG_RUN_RE, " ")
    .replace(LONG_NUM_RE, " ")
    .replace(/\p{Cc}+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** First sentence, then stripped, then capped. A sentence ends at `. `, `? `, `! ` or a line break. */
export function requestSnippet(text: string | null, max = REQUEST_MAX): string {
  if (!text) return "";
  const firstLine = text.trimStart().split(/\r?\n/, 1)[0] ?? "";
  const m = /^(.*?[.?!])(?:\s|$)/.exec(firstLine);
  const sentence = stripText(m?.[1] ?? firstLine);
  return sentence.length > max ? `${sentence.slice(0, max - 1).trimEnd()}…` : sentence;
}

const baseName = (p: string): string => p.replaceAll("\\", "/").split("/").pop() ?? "";

/** Up to ten distinct file base names, in first-seen order. A base name that looks like a secret is dropped. */
export function fileBaseNames(files: readonly string[], max = FILES_MAX): string[] {
  const out: string[] = [];
  for (const f of files) {
    const b = baseName(f).trim();
    if (!b || b.length > 80 || stripText(b) !== b || out.includes(b)) continue;
    out.push(b);
    if (out.length >= max) break;
  }
  return out;
}

const repoName = (r: string | null): string => (r ? baseName(r) : "");

/** Builds the one allowed shape for an item. Anything not listed here is not sent. */
export function payloadItem(c: ClassifyCandidate, id: string): PayloadItem {
  return {
    id,
    repo: stripText(repoName(c.repo)).slice(0, 60),
    branch: stripText(c.branch ?? "").slice(0, 80),
    request: requestSnippet(c.request),
    files: fileBaseNames(c.files),
    sessions: Math.max(0, Math.trunc(c.sessions)),
    edits: Math.max(0, Math.trunc(c.edits)),
    proof: stripText(c.proof).slice(0, 20),
    title: stripText(c.title).slice(0, 120),
  };
}

/**
 * Cache key of an item's content: the text fields only. Counts and the current title are context and
 * change when a suggestion is accepted or a session grows, so they stay out (no reclassifying after every edit).
 */
export function contentHash(p: PayloadItem): string {
  const body = JSON.stringify([CLASSIFY_PROMPT_VERSION, p.repo, p.branch, p.request, p.files]);
  return createHash("sha256").update(body).digest("hex").slice(0, 32);
}

export const CLASSIFY_SYSTEM_PROMPT =
  "You label software work items for a personal tracker. For each item return a short plain title (max 60 characters, no quotes, say what the work is, not that it is a session), a topic label of one to three words, the kind of work, the other items in this batch that are the same piece of work (with a confidence from 0 to 1), your confidence in the title from 0 to 1 and a one-line reason. Use only the facts given. Return JSON that matches the schema and nothing else.";

export function promptHash(): string {
  return createHash("sha256")
    .update(`${CLASSIFY_PROMPT_VERSION}\n${CLASSIFY_SYSTEM_PROMPT}`)
    .digest("hex")
    .slice(0, 16);
}

/** The user message for one batch. */
export function buildPrompt(items: readonly PayloadItem[]): string {
  return `Items (JSON):\n${JSON.stringify(items)}`;
}

/** JSON Schema for `--json-schema`. The ids are an enum, so the model cannot name an item outside the batch (D57). */
export function classifySchema(ids: readonly string[]): Record<string, unknown> {
  return {
    type: "object",
    properties: {
      items: {
        type: "array",
        items: {
          type: "object",
          properties: {
            id: { type: "string", enum: [...ids] },
            title: { type: "string", maxLength: TITLE_MAX },
            topic: { type: "string", maxLength: TOPIC_MAX },
            kind: { type: "string", enum: [...CLASSIFY_KINDS] },
            same_as: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  id: { type: "string", enum: [...ids] },
                  confidence: { type: "number", minimum: 0, maximum: 1 },
                },
                required: ["id", "confidence"],
              },
            },
            confidence: { type: "number", minimum: 0, maximum: 1 },
            reason: { type: "string", maxLength: REASON_MAX },
          },
          required: ["id", "title", "topic", "kind", "same_as", "confidence", "reason"],
        },
      },
    },
    required: ["items"],
  };
}

export interface ClassifiedItem {
  id: string;
  title: string;
  topic: string;
  kind: ClassifyKind;
  sameAs: { id: string; confidence: number }[];
  confidence: number;
  reason: string;
}

const isRec = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v);
const unit = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v) && v >= 0 && v <= 1;
const KIND_SET: ReadonlySet<string> = new Set(CLASSIFY_KINDS);
const clean = (s: string): string =>
  s
    .replace(/\p{Cc}+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
const isKind = (v: string): v is ClassifyKind => KIND_SET.has(v);

function parseItem(raw: unknown, ids: ReadonlySet<string>): ClassifiedItem | null {
  if (!isRec(raw)) return null;
  const { id, title, topic, kind, confidence, reason, same_as: sameRaw } = raw;
  if (typeof id !== "string" || !ids.has(id)) return null;
  if (typeof title !== "string" || typeof topic !== "string" || typeof reason !== "string") return null;
  const t = clean(title);
  const tp = clean(topic);
  const r = clean(reason);
  if (!t || t.length > TITLE_MAX || !tp || tp.length > TOPIC_MAX || r.length > REASON_MAX) return null;
  if (typeof kind !== "string" || !isKind(kind) || !unit(confidence)) return null;
  if (!Array.isArray(sameRaw)) return null;
  const sameAs: { id: string; confidence: number }[] = [];
  for (const s of sameRaw) {
    if (!isRec(s) || typeof s["id"] !== "string" || !ids.has(s["id"]) || !unit(s["confidence"])) return null;
    if (s["id"] === id || sameAs.some((x) => x.id === s["id"])) continue; // self and repeats are noise, not invalid
    sameAs.push({ id: s["id"], confidence: s["confidence"] });
  }
  return { id, title: t, topic: tp, kind, sameAs, confidence, reason: r };
}

/**
 * Reads the output of `claude -p --output-format json`: a result object whose `structured_output` holds
 * `{items: [...]}`. Returns null when the run failed (`is_error`) or the shape is wrong. An item that does not
 * validate is left out (no suggestion for it); a duplicate id keeps the first. Extra fields, including any
 * `status`, `stage`, `proof` or `flags`, are ignored: they are never copied.
 */
export function parseClassifyOutput(stdout: string, batchIds: readonly string[]): ClassifiedItem[] | null {
  let top: unknown;
  try {
    top = JSON.parse(stdout);
  } catch {
    return null;
  }
  if (!isRec(top) || top["is_error"] === true) return null;
  const body = isRec(top["structured_output"]) ? top["structured_output"] : top;
  const list = body["items"];
  if (!Array.isArray(list)) return null;
  const ids = new Set(batchIds);
  const out: ClassifiedItem[] = [];
  for (const raw of list) {
    const item = parseItem(raw, ids);
    if (item && !out.some((o) => o.id === item.id)) out.push(item);
  }
  return out;
}

/** Splits into batches of `size`. Items are kept in the order given, so the caller can sort by repo first. */
export function toBatches<T>(items: readonly T[], size: number): T[][] {
  const n = Math.max(1, Math.trunc(size));
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += n) out.push(items.slice(i, i + n));
  return out;
}

/** `i1`, `i2`, ... opaque ids for one batch. */
export const batchIds = (n: number): string[] => Array.from({ length: n }, (_, i) => `i${i + 1}`);
