// Normalizes Claude Code hook payloads and transcript lines into events.
// Source of truth: docs/specs/ingestion.md (event catalog) and docs/research/claude-code-hooks.md.
import { createHash } from "node:crypto";
import { classifyWrites, detectShellEffects } from "./shell.ts";
import type { VantageEvent } from "./events.ts";

export const SOURCE = "claude_code";
const MAX_COMMAND_CHARS = 2000;

type Rec = Record<string, unknown>;
const isRec = (v: unknown): v is Rec => typeof v === "object" && v !== null && !Array.isArray(v);
const str = (v: unknown): string | undefined => (typeof v === "string" && v !== "" ? v : undefined);

const EDIT_TOOLS = new Set(["Edit", "Write", "MultiEdit", "NotebookEdit"]);
const SHELL_TOOLS = new Set(["Bash", "PowerShell"]);

export interface ToolCall {
  toolUseId: string;
  name: string;
  input: Rec;
  sessionId?: string | undefined;
  timestamp: string;
  /** undefined when the outcome is unknown (transcript call with no result yet). */
  ok?: boolean | undefined;
  cwd?: string | undefined;
  /** The session's repo or worktree root, when known. Defaults to cwd for shell-write classification. */
  repoRoot?: string | undefined;
}

/**
 * Turns one tool call into events. Ids use the tool-use id only (not the session id), so a hook
 * event, a transcript backfill and a resumed or forked session that repeats the line all collapse
 * to one row (R1: 122k call rows were 72k distinct ids).
 */
export function toolCallEvents(call: ToolCall): VantageEvent[] {
  const base = { source: SOURCE, timestamp: call.timestamp } as const;
  const sid = call.sessionId ? { sessionId: call.sessionId } : {};
  const common: Rec = { tool: call.name, toolUseId: call.toolUseId };
  if (call.ok !== undefined) common["ok"] = call.ok;
  if (call.cwd) common["cwd"] = call.cwd;
  const events: VantageEvent[] = [];

  if (EDIT_TOOLS.has(call.name)) {
    const path = str(call.input["file_path"]) ?? str(call.input["notebook_path"]);
    events.push({
      ...base,
      ...sid,
      sourceId: `cc:tool:${call.toolUseId}:edit`,
      kind: "file.edited",
      payload: { ...common, via: "edit-tool", ...(path ? { path } : {}) },
    });
  } else if (SHELL_TOOLS.has(call.name)) {
    const command = str(call.input["command"]) ?? "";
    const fx = detectShellEffects(command);
    const scope = classifyWrites(fx, command, call.cwd, call.repoRoot);
    const writesInRepo = scope.inRepo.length > 0 || (fx.opaqueWrite && !scope.opaqueOutside);
    events.push({
      ...base,
      ...sid,
      sourceId: `cc:tool:${call.toolUseId}:command`,
      kind: "command.ran",
      payload: {
        ...common,
        command: command.slice(0, MAX_COMMAND_CHARS),
        ...(fx.commit ? { commit: true } : {}),
        ...(scope.outside.length > 0 ? { outsidePaths: scope.outside } : {}),
        ...(scope.opaqueOutside ? { opaqueOutsideRepo: true } : {}),
      },
    });
    if (writesInRepo || fx.commit) {
      events.push({
        ...base,
        ...sid,
        sourceId: `cc:tool:${call.toolUseId}:edit`,
        kind: "file.edited",
        payload: {
          ...common,
          via: fx.commit && !writesInRepo ? "shell-commit" : "shell",
          ...(scope.inRepo.length > 0 ? { paths: scope.inRepo } : {}),
        },
      });
    }
  }
  return events;
}

/** The spool line a hook appends: the raw payload plus the arrival time. */
export interface SpoolRecord {
  v: 1;
  receivedAt: string;
  hook: Rec;
}

export function parseSpoolRecord(line: string): SpoolRecord | null {
  let raw: unknown;
  try {
    raw = JSON.parse(line);
  } catch {
    return null;
  }
  if (!isRec(raw) || raw["v"] !== 1 || !isRec(raw["hook"])) return null;
  const receivedAt = raw["receivedAt"];
  if (typeof receivedAt !== "string" || Number.isNaN(Date.parse(receivedAt))) return null;
  return { v: 1, receivedAt, hook: raw["hook"] };
}

const digest = (s: string): string => createHash("sha1").update(s).digest("hex").slice(0, 16);

export function hookEvents(record: SpoolRecord): VantageEvent[] {
  const h = record.hook;
  const name = str(h["hook_event_name"]);
  const sessionId = str(h["session_id"]);
  if (!name) return [];
  const ts = record.receivedAt;
  const sid = sessionId ? { sessionId } : {};
  const cwd = str(h["cwd"]);
  const promptId = str(h["prompt_id"]);
  const meta: Rec = { hook: name, ...(cwd ? { cwd } : {}), ...(promptId ? { promptId } : {}) };
  // Non-tool hooks have no stable id from Claude Code; hash the payload so a replayed line dedupes.
  const id = `cc:${sessionId ?? "none"}:${name}:${digest(JSON.stringify(h) + ts)}`;
  const make = (kind: VantageEvent["kind"], extra: Rec = {}): VantageEvent[] => [
    { source: SOURCE, sourceId: id, kind, timestamp: ts, ...sid, payload: { ...meta, ...extra } },
  ];

  switch (name) {
    case "SessionStart":
      return make("session.started", {
        start: str(h["source"]) ?? null,
        transcriptPath: str(h["transcript_path"]) ?? null,
      });
    case "SessionEnd":
      return make("session.ended", { reason: str(h["reason"]) ?? null });
    case "Stop":
      // The agent stopped and is about to hand the turn back. `unproven_claim` reads this (D71).
      return make("session.stopped", { stopHookActive: h["stop_hook_active"] === true });
    case "PreCompact":
      return make("session.compacted", { trigger: str(h["trigger"]) ?? null });
    case "PermissionRequest":
      return make("session.waiting", { why: "permission_request", tool: str(h["tool_name"]) ?? null });
    case "Notification":
      return make("session.waiting", { why: str(h["notification_type"]) ?? "notification" });
    case "PostToolUse":
    case "PostToolUseFailure": {
      const toolUseId = str(h["tool_use_id"]);
      const tool = str(h["tool_name"]);
      if (!toolUseId || !tool) return [];
      return toolCallEvents({
        toolUseId,
        name: tool,
        input: isRec(h["tool_input"]) ? h["tool_input"] : {},
        timestamp: ts,
        sessionId,
        ok: name === "PostToolUse",
        cwd,
      });
    }
    default:
      return [];
  }
}

/** Transcript line fields the backfill needs. */
export interface TranscriptLine {
  type: string;
  sessionId?: string;
  timestamp?: string;
  uuid?: string;
  cwd?: string;
  gitBranch?: string;
  isSidechain: boolean;
  isMeta: boolean;
  content: Rec[];
  /** Plain string content, when the line is a user message with string content. */
  text?: string;
}

export function parseTranscriptLine(line: string): TranscriptLine | null {
  let raw: unknown;
  try {
    raw = JSON.parse(line);
  } catch {
    return null;
  }
  if (!isRec(raw)) return null;
  const type = str(raw["type"]);
  if (type !== "user" && type !== "assistant") return null;
  const message = isRec(raw["message"]) ? raw["message"] : {};
  const c = message["content"];
  const out: TranscriptLine = {
    type,
    isSidechain: raw["isSidechain"] === true,
    isMeta: raw["isMeta"] === true,
    content: Array.isArray(c) ? c.filter(isRec) : [],
  };
  const sessionId = str(raw["sessionId"]);
  const timestamp = str(raw["timestamp"]);
  const uuid = str(raw["uuid"]);
  const cwd = str(raw["cwd"]);
  const gitBranch = str(raw["gitBranch"]);
  if (sessionId) out.sessionId = sessionId;
  if (timestamp) out.timestamp = timestamp;
  if (uuid) out.uuid = uuid;
  if (cwd) out.cwd = cwd;
  if (gitBranch) out.gitBranch = gitBranch;
  if (typeof c === "string") out.text = c;
  return out;
}

/** Events for one batch of transcript lines; pairs tool calls with their results within the batch. */
export function transcriptEvents(lines: TranscriptLine[]): VantageEvent[] {
  const calls = new Map<string, ToolCall>();
  const prompts: VantageEvent[] = [];

  for (const l of lines) {
    const ts = l.timestamp;
    if (!ts || Number.isNaN(Date.parse(ts))) continue;
    if (l.type === "assistant") {
      for (const b of l.content) {
        const id = str(b["id"]);
        const name = str(b["name"]);
        if (b["type"] !== "tool_use" || !id || !name) continue;
        calls.set(id, {
          toolUseId: id,
          name,
          input: isRec(b["input"]) ? b["input"] : {},
          timestamp: ts,
          sessionId: l.sessionId,
          cwd: l.cwd,
        });
      }
      continue;
    }
    let isPrompt = l.text !== undefined;
    for (const b of l.content) {
      if (b["type"] === "tool_result") {
        const call = calls.get(str(b["tool_use_id"]) ?? "");
        if (call) call.ok = b["is_error"] !== true;
      } else if (b["type"] === "text") isPrompt = true;
    }
    if (isPrompt && !l.isMeta && !l.isSidechain && l.uuid) {
      prompts.push({
        source: SOURCE,
        sourceId: `cc:prompt:${l.uuid}`,
        kind: "prompt.submitted",
        timestamp: ts,
        ...(l.sessionId ? { sessionId: l.sessionId } : {}),
        payload: {
          chars: l.text?.length ?? null,
          ...(l.cwd ? { cwd: l.cwd } : {}),
          ...(l.gitBranch ? { branch: l.gitBranch } : {}),
        },
      });
    }
  }
  return [...prompts, ...[...calls.values()].flatMap(toolCallEvents)];
}
