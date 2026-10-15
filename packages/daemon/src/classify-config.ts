// Settings for `vantage classify` from `~/.vantage/config.toml` (docs/specs/settings.md#classify).
// Everything that leaves the machine is off by default: a missing or unreadable file means off.
import { readFileSync } from "node:fs";
import { join } from "node:path";

export type AutoAccept = "off" | "titles" | "all";

export interface ClassifyConfig {
  /** `engines.classify.enabled` */
  enabled: boolean;
  /** `engines.classify.model`: an alias or a model id passed to `claude --model`. */
  model: string;
  /** `engines.classify.batch_size`: items per call (1 to 50). */
  batchSize: number;
  /** `engines.classify.daily_calls`: calls a day (0 to 1000). */
  dailyCalls: number;
  /** `engines.classify.auto_accept` */
  autoAccept: AutoAccept;
  /** `engines.classify.auto_min_confidence` (0 to 1). */
  autoMinConfidence: number;
  /** `engines.classify.timeout_seconds`: per call. */
  timeoutMs: number;
  /** `engines.classify.settle_minutes`: an item is classified only after this long without activity. */
  settleMinutes: number;
  /** `engines.classify.command`: the Claude Code executable. */
  command: string;
  /** `data_policy.outside_calls` (master switch). */
  outsideCalls: boolean;
  /** `data_policy.allow.transcripts`: the first request is a prompt. */
  allowTranscripts: boolean;
}

export const CLASSIFY_DEFAULTS: ClassifyConfig = {
  enabled: false,
  model: "haiku",
  batchSize: 20,
  dailyCalls: 50,
  autoAccept: "off",
  autoMinConfidence: 0.9,
  timeoutMs: 120_000,
  settleMinutes: 30,
  command: "claude",
  outsideCalls: false,
  allowTranscripts: false,
};

/** Flat `dotted.key` to raw value for the keys we read. Understands `[table]` headers, `key = value` and `#` comments. */
export function parseToml(text: string): Map<string, string> {
  const out = new Map<string, string>();
  let table = "";
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (line === "" || line.startsWith("#")) continue;
    const head = /^\[\s*([A-Za-z0-9_.-]+)\s*\]$/.exec(line);
    if (head) {
      table = `${head[1]}.`;
      continue;
    }
    const kv = /^([A-Za-z0-9_.-]+)\s*=\s*(.*?)\s*$/.exec(line);
    if (!kv) continue;
    let v = kv[2] ?? "";
    const quoted = /^"([^"]*)"|^'([^']*)'/.exec(v);
    v = quoted ? (quoted[1] ?? quoted[2] ?? "") : v.replace(/\s+#.*$/, "");
    out.set(`${table}${kv[1]}`, v);
  }
  return out;
}

const bool = (v: string | undefined, d: boolean): boolean =>
  v === "true" ? true : v === "false" ? false : d;
const int = (v: string | undefined, lo: number, hi: number, d: number): number => {
  const n = v === undefined || !/^\d+$/.test(v) ? NaN : Number(v);
  return n >= lo && n <= hi ? n : d;
};
const real = (v: string | undefined, d: number): number => {
  const n = v === undefined || v === "" ? NaN : Number(v);
  return n >= 0 && n <= 1 ? n : d;
};

export function classifyConfigFromText(text: string): ClassifyConfig {
  const t = parseToml(text);
  const g = (k: string): string | undefined => t.get(k);
  const auto = g("engines.classify.auto_accept");
  const model = g("engines.classify.model");
  const command = g("engines.classify.command");
  const d = CLASSIFY_DEFAULTS;
  return {
    enabled: bool(g("engines.classify.enabled"), d.enabled),
    model: model && /^[A-Za-z0-9._:-]{1,80}$/.test(model) ? model : d.model,
    batchSize: int(g("engines.classify.batch_size"), 1, 50, d.batchSize),
    dailyCalls: int(g("engines.classify.daily_calls"), 0, 1000, d.dailyCalls),
    autoAccept: auto === "titles" || auto === "all" ? auto : "off",
    autoMinConfidence: real(g("engines.classify.auto_min_confidence"), d.autoMinConfidence),
    timeoutMs: int(g("engines.classify.timeout_seconds"), 5, 600, d.timeoutMs / 1000) * 1000,
    settleMinutes: int(g("engines.classify.settle_minutes"), 0, 1440, d.settleMinutes),
    command: command && command.trim() !== "" ? command.trim() : d.command,
    outsideCalls: bool(g("data_policy.outside_calls"), d.outsideCalls),
    allowTranscripts: bool(g("data_policy.allow.transcripts"), d.allowTranscripts),
  };
}

export function readClassifyConfig(home: string): ClassifyConfig {
  try {
    return classifyConfigFromText(readFileSync(join(home, "config.toml"), "utf8"));
  } catch {
    return { ...CLASSIFY_DEFAULTS };
  }
}

/** Why a run is not allowed, in the words of the settings; empty means it may run. */
export function classifyBlockers(c: ClassifyConfig): string[] {
  const out: string[] = [];
  if (!c.enabled) out.push("engines.classify.enabled is off");
  if (!c.outsideCalls) out.push("data_policy.outside_calls is off");
  if (!c.allowTranscripts) out.push("data_policy.allow.transcripts is off");
  if (c.dailyCalls === 0) out.push("engines.classify.daily_calls is 0");
  return out;
}
