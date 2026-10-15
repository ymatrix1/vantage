// The name Claude Code gives a session in its transcript (D191): a `custom-title` line when the user renamed
// it, an `agent-name` line for the generated one. Only that one field is read, never any message text.

export type SessionNameSource = "custom" | "agent";
export interface SessionName {
  source: SessionNameSource;
  name: string;
}

const MAX_NAME = 80;

/** One line, no control characters, at most 80 characters (an ellipsis marks a cut); null when nothing is left. */
export function cleanSessionName(raw: string): string | null {
  const one = [...raw]
    .map((c) => (c.charCodeAt(0) < 32 || c.charCodeAt(0) === 127 ? " " : c))
    .join("")
    .replace(/\s+/g, " ")
    .trim();
  if (one === "") return null;
  return one.length <= MAX_NAME ? one : `${one.slice(0, MAX_NAME - 1).trimEnd()}…`;
}

/** The name carried by one raw transcript line for session `own`, or null (any other line, another session's). */
export function sessionNameOfLine(line: string, own: string): SessionName | null {
  // Cheap guard: most lines are messages, and parsing them all only to drop them is wasted work.
  if (!line.includes('"custom-title"') && !line.includes('"agent-name"')) return null;
  let raw: unknown;
  try {
    raw = JSON.parse(line);
  } catch {
    return null;
  }
  if (typeof raw !== "object" || raw === null) return null;
  const r = Object.fromEntries(Object.entries(raw));
  const sid = r["sessionId"];
  if (typeof sid === "string" && sid !== own) return null;
  const pick = (type: string, field: string, source: SessionNameSource): SessionName | null => {
    if (r["type"] !== type) return null;
    const v = r[field];
    const name = typeof v === "string" ? cleanSessionName(v) : null;
    return name ? { source, name } : null;
  };
  return pick("custom-title", "customTitle", "custom") ?? pick("agent-name", "agentName", "agent");
}

/** The name to keep after reading `lines` in order: a custom name beats a generated one; the latest of a kind wins. */
export function latestSessionName(lines: readonly string[], own: string): SessionName | null {
  let custom: SessionName | null = null;
  let agent: SessionName | null = null;
  for (const l of lines) {
    const n = sessionNameOfLine(l, own);
    if (!n) continue;
    if (n.source === "custom") custom = n;
    else agent = n;
  }
  return custom ?? agent;
}
