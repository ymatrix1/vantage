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
