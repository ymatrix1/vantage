// One proof as one line (D131): kind, result, age and whether a later edit made it stale. Pure, no DOM.
import type { AskedEvidence, TraceResponse } from "@vantage/core/track";
import { ago } from "./relative-time";

type Proof = TraceResponse["proofs"][number];
export type ProofResult = "pass" | "fail" | "weak" | "stale";

export interface ProofLine {
  kind: string;
  result: ProofResult;
  /** Words for the result, also the icon's accessible name. */
  resultLabel: string;
  level: number;
  age: string;
  stale: boolean;
  /** Why it is weak, when it is. */
  note: string | null;
  command: string;
}

const KIND: Record<string, string> = { test: "Test", data_check: "Data check" };
const LABEL: Record<ProofResult, string> = { pass: "Passed", fail: "Failed", weak: "Weak", stale: "Stale" };

/** A stale proof reads as stale whatever its original result was; a failed one stays failed. */
export function proofLine(p: Proof, now: Date): ProofLine {
  const result: ProofResult =
    p.state === "failed" ? "fail" : p.stale ? "stale" : p.state === "weak" ? "weak" : "pass";
  return {
    kind: KIND[p.type] ?? p.type.replaceAll("_", " "),
    result,
    resultLabel: LABEL[result],
    level: p.level,
    age: p.ranAt ? ago(p.ranAt, now) : "time unknown",
    stale: p.stale,
    note: p.weakReason ? p.weakReason.replaceAll("-", " ") : null,
    command: p.command,
  };
}

/** "Asked by session a1b2c3d4 on branch feat/x, 2 days ago": ids and times only, never prompt text (D132). */
export function askedLine(a: AskedEvidence, now: Date): string {
  const by = a.sessionId ? `session ${a.sessionId.slice(0, 8)}` : "no session recorded";
  const anchor =
    a.anchorKind === "issue_key"
      ? `issue ${a.anchorValue ?? ""}`.trim()
      : a.anchorKind === "branch"
        ? `branch ${a.anchorValue ?? ""}`.trim()
        : a.anchorKind === "worktree"
          ? "a new worktree"
          : a.anchorKind === "session"
            ? "the session itself"
            : "an unknown anchor";
  return `${by}, anchored on ${anchor}, ${ago(a.at, now)}`;
}
