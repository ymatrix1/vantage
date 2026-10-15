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

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** `Oct 14, 10:32` in the viewer's time zone, with the year when it is not the current one. */
export function absoluteTime(iso: string, now: Date): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "time unknown";
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  const year = d.getFullYear() === now.getFullYear() ? "" : ` ${d.getFullYear()}`;
  return `${MONTHS[d.getMonth()] ?? ""} ${d.getDate()}${year}, ${hh}:${mm}`;
}

/** The session's name, else a short id: what a person can recognise (D191). */
export const sessionLabel = (name: string | null | undefined, id: string): string =>
  name && name !== "" ? name : `Session ${id.slice(0, 8)}`;

/**
 * "Fix login redirect · branch feat/login · Oct 14, 10:32 (21 min ago)": the session's name, the anchor type
 * with its value, and the time both ways. Names, keys and times only, never prompt text (D132, D192).
 */
export function askedLine(a: AskedEvidence, now: Date): string {
  const by = a.sessionId ? sessionLabel(a.sessionName, a.sessionId) : "No session recorded";
  const value = a.anchorValue ? ` ${a.anchorValue}` : "";
  const anchor =
    a.anchorKind === "issue_key"
      ? `issue${value}`
      : a.anchorKind === "branch"
        ? `branch${value}`
        : a.anchorKind === "worktree"
          ? `worktree${value}`
          : a.anchorKind === "session"
            ? "the session itself"
            : "an unknown anchor";
  return `${by} · ${anchor} · ${absoluteTime(a.at, now)} (${ago(a.at, now)})`;
}
