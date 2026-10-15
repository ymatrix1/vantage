// The agent's own task list (TodoWrite) as counts, plus one short current-task line (D94, proposed).
// The full todo texts are never kept: only counts per status and, when capture is on, the text of the
// first in_progress item, cleaned and capped like request titles.

export const MAX_TASK_TEXT = 80;

export interface TaskCounts {
  total: number;
  pending: number;
  inProgress: number;
  completed: number;
  /** Cleaned text of the first in_progress item; absent when none or when text capture is off. */
  current?: string;
}

const URL_RE = /\b[a-z][a-z0-9+.-]*:\/\/\S+/gi;
const WIN_PATH_RE = /\b[A-Za-z]:[\\/][^\s"'`]*/g;
const POSIX_PATH_RE = /(?:^|\s)~?\/[^\s"'`]+/g;
const SECRET_RE =
  /\b(?:sk|pk|ghp|gho|ghs|github_pat|xox[a-z]|AKIA)[-_A-Za-z0-9]{8,}\b|\b[A-Za-z0-9+/_-]{32,}\b/g;
const EMAIL_RE = /\S+@\S+\.\S+/g;

/** A task text safe to keep: no URLs, paths, emails or secret-looking tokens, one line, at most 80 characters. */
export function cleanTaskText(text: string): string | undefined {
  const t = text
    .replace(URL_RE, " ")
    .replace(EMAIL_RE, " ")
    .replace(WIN_PATH_RE, " ")
    .replace(POSIX_PATH_RE, " ")
    .replace(SECRET_RE, " ")
    .replace(/[`*_#>]+/g, "")
    .replace(/\s+/g, " ")
    .trim();
  if (t === "") return undefined;
  if (t.length <= MAX_TASK_TEXT) return t;
  const cut = t.slice(0, MAX_TASK_TEXT - 1);
  const sp = cut.lastIndexOf(" ");
  return `${(sp > 40 ? cut.slice(0, sp) : cut).trimEnd()}…`;
}

const isRec = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v);

/** Counts from a TodoWrite input (`{todos: [{content, status}]}`); null when the input is not a task list. */
export function todoCounts(input: Record<string, unknown>, keepText: boolean): TaskCounts | null {
  const todos = input["todos"];
  if (!Array.isArray(todos)) return null;
  const out: TaskCounts = { total: 0, pending: 0, inProgress: 0, completed: 0 };
  for (const t of todos) {
    if (!isRec(t)) continue;
    out.total++;
    const status = t["status"];
    if (status === "completed") out.completed++;
    else if (status === "in_progress") {
      out.inProgress++;
      const content = t["content"];
      if (keepText && out.current === undefined && typeof content === "string") {
        const clean = cleanTaskText(content);
        if (clean) out.current = clean;
      }
    } else out.pending++;
  }
  return out;
}
