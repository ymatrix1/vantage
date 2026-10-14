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

export function detectShellEffects(command: string): ShellEffects {
  const writes = new Set<string>();
  let opaqueWrite = false;

  for (const m of command.matchAll(/(?:^|[^<>&0-9])>>?\s*("[^"]+"|'[^']+'|[^\s|&;<>()]+)/g)) {
    const target = unquote(m[1] ?? "");
    if (target && !IGNORED_TARGETS.has(target.toLowerCase())) writes.add(target);
  }
  for (const m of command.matchAll(/\btee\s+(?:-[a-z]+\s+)*("[^"]+"|'[^']+'|[^\s|&;<>()-][^\s|&;<>()]*)/g)) {
    writes.add(unquote(m[1] ?? ""));
  }
  for (const m of command.matchAll(
    /\b(?:Set-Content|Add-Content|Out-File)\b(?:\s+-(?:Path|FilePath|LiteralPath))?\s+("[^"]+"|'[^']+'|[^\s|&;<>()-][^\s|&;<>()]*)/gi,
  )) {
    writes.add(unquote(m[1] ?? ""));
  }
  if (
    /\bsed\s+(?:-[A-Za-z]*\s+)*(?:-i|--in-place)/.test(command) ||
    /\bapply_patch\b|\bgit\s+apply\b/.test(command)
  ) {
    opaqueWrite = true;
  }
  const commit = /\bgit\s+(?:-[^\s]+\s+(?:\S+\s+)?)*commit\b/.test(command);
  return { writes: [...writes], opaqueWrite, commit };
}
