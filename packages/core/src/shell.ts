import { pathMembership } from "./paths.ts";

// Detects file writes and commits made through a shell command (R1: counting edit tools alone
// misses real work). Pattern based and deliberately conservative: it names what it is sure of.

export interface ShellEffects {
  /** Paths written by redirection, tee, Set-Content and similar, when they can be read from the text. */
  writes: string[];
  /** True when the command writes files but the target can't be named (sed -i, apply_patch). */
  opaqueWrite: boolean;
  commit: boolean;
}

const IGNORED_TARGETS = new Set(["/dev/null", "nul", "$null", "/dev/stderr", "/dev/stdout"]);

const unquote = (s: string): string => s.replace(/^["']|["']$/g, "");

/** Splits a command into its text and the bodies of any here-documents (`<<TAG ... TAG`). */
function splitHeredocs(command: string): { shell: string; bodies: string[] } {
  const shell: string[] = [];
  const bodies: string[] = [];
  let tag: string | null = null;
  let body: string[] = [];
  for (const line of command.split("\n")) {
    if (tag !== null) {
      if (line.trim() === tag) {
        bodies.push(body.join("\n"));
        tag = null;
        body = [];
      } else {
        body.push(line);
      }
      continue;
    }
    shell.push(line);
    const m = /<<-?\s*(["']?)([A-Za-z_]\w*)\1/.exec(line);
    if (m) tag = m[2] ?? null;
  }
  if (tag !== null) bodies.push(body.join("\n"));
  return { shell: shell.join("\n"), bodies };
}

// A quoted string is data, not shell syntax, unless it is the target of a write (`> "f"`, `tee "f"`).
const WRITE_TARGET_BEFORE =
  /(?:>>?|\btee(?:\s+-[A-Za-z]+)*|\b(?:Set-Content|Add-Content|Out-File)(?:\s+-(?:Path|FilePath|LiteralPath))?)\s*$/i;

function maskQuoted(text: string): string {
  return text.replace(/"(?:\\.|[^"\\])*"|'[^']*'/g, (match, offset: number) =>
    WRITE_TARGET_BEFORE.test(text.slice(Math.max(0, offset - 60), offset)) ? match : '""',
  );
}

/** Replaces `$( ... )` (nested too) with same-length filler so its separators are not seen. */
function maskSubstitutions(text: string): string {
  const out = text.split("");
  for (let i = 0; i < text.length - 1; i++) {
    if (text[i] !== "$" || text[i + 1] !== "(") continue;
    let depth = 0;
    let j = i + 1;
    for (; j < text.length; j++) {
      if (text[j] === "(") depth++;
      else if (text[j] === ")" && --depth === 0) break;
    }
    // An unclosed `$(` runs to the end of the text.
    for (let k = i; k <= Math.min(j, text.length - 1); k++) out[k] = "_";
    i = j;
  }
  return out.join("");
}

/**
 * Splits a command into the simple commands that run (`a && b | c; d`), without cutting inside quotes,
 * backticks, `$(...)` or after a backslash, and without the bodies of here-documents. Each segment keeps
 * its original text and is trimmed; empty ones are dropped. Pattern based like the rest of this file:
 * `(` grouping and `{ }` are not parsed.
 */
export function splitCommandSegments(command: string): string[] {
  const { shell } = splitHeredocs(command);
  // Same-length masks so offsets in the mask are offsets in `shell`.
  const masked = maskSubstitutions(
    shell
      .replace(/"(?:\\.|[^"\\])*"|'[^']*'|`[^`]*`/g, (m) => "_".repeat(m.length))
      .replace(/\\[\s\S]/g, "__"),
  );
  const out: string[] = [];
  let start = 0;
  for (const m of masked.matchAll(/&&|\|\||;|\||\n/g)) {
    out.push(shell.slice(start, m.index));
    start = m.index + m[0].length;
  }
  out.push(shell.slice(start));
  return out.map((s) => s.trim()).filter((s) => s !== "");
}

const PYTHON_FILE_WRITE =
  /\bopen\([^)\n]*,\s*(?:mode\s*=\s*)?["'][wax]b?\+?["']|\.write_(?:text|bytes)\(|\bwriteFileSync\(/;

export function detectShellEffects(command: string): ShellEffects {
  const writes = new Set<string>();
  let opaqueWrite = false;
  const { shell, bodies } = splitHeredocs(command);
  const text = maskQuoted(shell);

  for (const m of text.matchAll(/(?:^|[^<>&0-9=-])>>?\s*("[^"]+"|'[^']+'|[^\s|&;<>()=\\][^\s|&;<>()]*)/g)) {
    const target = unquote(m[1] ?? "");
    if (target && !IGNORED_TARGETS.has(target.toLowerCase())) writes.add(target);
  }
  for (const m of text.matchAll(/\btee\s+(?:-[a-z]+\s+)*("[^"]+"|'[^']+'|[^\s|&;<>()-][^\s|&;<>()]*)/g)) {
    writes.add(unquote(m[1] ?? ""));
  }
  for (const m of text.matchAll(
    /\b(?:Set-Content|Add-Content|Out-File)\b(?:\s+-(?:Path|FilePath|LiteralPath))?\s+("[^"]+"|'[^']+'|[^\s|&;<>()-][^\s|&;<>()]*)/gi,
  )) {
    writes.add(unquote(m[1] ?? ""));
  }
  if (
    /\bsed\s+(?:-[A-Za-z]*\s+)*(?:-i|--in-place)/.test(text) ||
    /\bapply_patch\b|\bgit\s+(?:apply|mv)\b/.test(text) ||
    bodies.some((b) => PYTHON_FILE_WRITE.test(b)) ||
    PYTHON_FILE_WRITE.test(shell)
  ) {
    opaqueWrite = true;
  }
  const commit = /\bgit\s+(?:-[^\s]+\s+(?:\S+\s+)?)*commit\b/.test(text);
  return { writes: [...writes], opaqueWrite, commit };
}

export interface WriteScope {
  /** Targets that count as edits: inside the repo, or not decidable from the text. */
  inRepo: string[];
  /** Targets that resolve outside the repo (scratch output, helper files elsewhere). */
  outside: string[];
  /** True when the only writes are opaque and the session's cwd is outside the repo. */
  opaqueOutside: boolean;
}

// A `cd` changes the directory the targets are read against, and the session cwd no longer applies.
const CHANGES_DIR = /(?:^|[\s;&|(])(?:cd|pushd|Set-Location|sl)\s/;

/**
 * Splits written targets by repo membership. Relative targets are read against `cwd`; the repo is
 * `repoRoot`, or `cwd` when that is unknown. Lexical only: symlinks aren't followed. Without a cwd,
 * or after a `cd` in the command, nothing can be ruled out, so every write counts (today's behaviour).
 */
export function classifyWrites(
  fx: ShellEffects,
  command: string,
  cwd: string | undefined,
  repoRoot?: string,
): WriteScope {
  if (!cwd || CHANGES_DIR.test(command)) return { inRepo: fx.writes, outside: [], opaqueOutside: false };
  const root = repoRoot ?? cwd;
  const inRepo: string[] = [];
  const outside: string[] = [];
  for (const w of fx.writes) (pathMembership(w, cwd, root) === "outside" ? outside : inRepo).push(w);
  const opaqueOutside = fx.opaqueWrite && inRepo.length === 0 && pathMembership(cwd, cwd, root) === "outside";
  return { inRepo, outside, opaqueOutside };
}
