// `vantage add`, `vantage remove` and `vantage uninstall` (D50, D52; docs/specs/first-run.md).
// Machine-level changes are planned first (`--dry-run` prints the plan and writes nothing), backed up,
// idempotent, and reversible: every entry Vantage writes carries the `--vantage-managed` marker on its
// command, and `install.json` in the Vantage home records exactly what was done.
import { execFileSync } from "node:child_process";
import {
  chmodSync,
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { createRequire } from "node:module";
import { homedir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { SPOOL_HOOK_EVENTS, hooksSettings, statusLineSettings } from "@vantage/hooks";
import { vantageHomeDir } from "@vantage/daemon";

/** Marks every command Vantage registers, so remove and doctor only ever touch Vantage's own entries. */
export const MANAGED = "--vantage-managed";
/** Every event the installer registers: seven async spool hooks and the synchronous Stop gate (D59, D73). */
export const HOOK_EVENTS = [...SPOOL_HOOK_EVENTS, "Stop"] as const;
const GIT_HOOK_NAMES = ["post-commit", "post-checkout", "post-merge"] as const;

export interface InstallIo {
  out(line: string): void;
  err(line: string): void;
  env: NodeJS.ProcessEnv;
  /** Working directory for resolving the repo; defaults to `process.cwd()`. */
  cwd?: string;
  /** Asks a yes or no question. Absent means no terminal, so a real change needs `--yes`. */
  confirm?: (question: string) => Promise<boolean>;
}

export interface Paths {
  /** Vantage home (`VANTAGE_HOME` or `~/.vantage`). */
  home: string;
  userHome: string;
  /** Claude Code settings file (`CLAUDE_CONFIG_DIR` or `~/.claude`). */
  settings: string;
  config: string;
  manifest: string;
  gitconfig: string;
  gitHooksDir: string;
}

export function resolvePaths(env: NodeJS.ProcessEnv): Paths {
  const userHome = env["HOME"] || env["USERPROFILE"] || homedir();
  const home = vantageHomeDir(env);
  return {
    home,
    userHome,
    settings: join(env["CLAUDE_CONFIG_DIR"] || join(userHome, ".claude"), "settings.json"),
    config: join(home, "config.toml"),
    manifest: join(home, "install.json"),
    gitconfig: env["GIT_CONFIG_GLOBAL"] || join(userHome, ".gitconfig"),
    gitHooksDir: join(home, "git-hooks"),
  };
}

export interface HookCommands {
  /** What runs for every hook event, including the synchronous Stop gate. */
  hook: string;
  statusLine: string;
  /** Files the commands run, for `vantage doctor`. */
  files: string[];
  kind: "node-js" | "native-package" | "native-local";
  /** One line for `vantage add --dry-run`: which hook was chosen and why. */
  reason: string;
}

const fwd = (p: string): string => p.replaceAll("\\", "/");

const exe = process.platform === "win32" ? ".exe" : "";

export interface NativeBinary {
  path: string;
  source: "package" | "local";
}

/** npm scope of the native hook packages (D96; tools/package-names.mjs holds the source of truth). */
export const NATIVE_SCOPE = "@ymatrix1";

/**
 * Finds the native spool hook (D72): the per-OS npm package first, then a binary built in this checkout.
 * Both are plain lookups that return null when nothing is there. `VANTAGE_NATIVE_PACKAGES_DIR` (a
 * node_modules-style root) and `VANTAGE_NATIVE_BUILD_DIR` (a cargo `release` directory) replace the
 * defaults, so tests never see the real machine.
 */
export function findNativeBinary(env: NodeJS.ProcessEnv): NativeBinary | null {
  // Same name as tools/package-names.mjs (a test keeps them equal).
  const pkg = `vantage-hook-${process.platform}-${process.arch}`;
  const packages = env["VANTAGE_NATIVE_PACKAGES_DIR"];
  let fromPackage: string | null = null;
  if (packages) {
    fromPackage = join(packages, NATIVE_SCOPE, pkg, "bin", `vantage-hook${exe}`);
  } else {
    try {
      const manifest = createRequire(import.meta.url).resolve(`${NATIVE_SCOPE}/${pkg}/package.json`);
      fromPackage = join(dirname(manifest), "bin", `vantage-hook${exe}`);
    } catch {
      // Not installed: the packages are optional dependencies.
    }
  }
  if (fromPackage && existsSync(fromPackage)) return { path: fwd(fromPackage), source: "package" };
  const build =
    env["VANTAGE_NATIVE_BUILD_DIR"] ||
    fileURLToPath(new URL("../../../hooks-native/target/release", import.meta.url));
  const local = join(build, `vantage-hook${exe}`);
  return existsSync(local) ? { path: fwd(local), source: "local" } : null;
}

/**
 * The only place that decides which command the hooks run: the native binary (package, then local build)
 * with the Node entry as its first argument for `Stop` (D76), else `node <entry>` (D67). The status line
 * stays on Node: it is not on the hot path.
 */
export function resolveHookCommands(env: NodeJS.ProcessEnv): HookCommands {
  const dir = env["VANTAGE_HOOKS_DIR"] || fileURLToPath(new URL("../../../hooks/dist/src", import.meta.url));
  const bin = fwd(join(dir, "bin.js"));
  const line = fwd(join(dir, "statusline-bin.js"));
  const native = findNativeBinary(env);
  if (native) {
    return {
      hook: `"${native.path}" "${bin}" ${MANAGED}`,
      statusLine: `node "${line}" ${MANAGED}`,
      files: [native.path, bin, line],
      kind: native.source === "package" ? "native-package" : "native-local",
      reason:
        native.source === "package"
          ? `native binary from the installed package ${native.path}`
          : `native binary built in this checkout ${native.path}`,
    };
  }
  return {
    hook: `node "${bin}" ${MANAGED}`,
    statusLine: `node "${line}" ${MANAGED}`,
    files: [bin, line],
    kind: "node-js",
    reason: "no native binary found (no native hook package, no cargo build); using node",
  };
}

type Json = Record<string, unknown>;
const isObj = (v: unknown): v is Json => typeof v === "object" && v !== null && !Array.isArray(v);
const isManaged = (cmd: unknown): boolean => typeof cmd === "string" && cmd.includes(MANAGED);

/** Reads a JSON settings file. Missing means `{}`; invalid JSON or a non-object is an error (never overwritten). */
export function readSettings(path: string): Json {
  if (!existsSync(path)) return {};
  const parsed: unknown = JSON.parse(readFileSync(path, "utf8"));
  if (!isObj(parsed)) throw new Error(`${path} is not a JSON object`);
  return parsed;
}

export interface SettingsEdit {
  next: Json;
  changes: string[];
  statusLineSkipped: boolean;
}

/** Merges Vantage's hooks and status line into settings without touching anything else. Pure. */
export function mergeSettings(current: Json, cmds: HookCommands): SettingsEdit {
  const next: Json = structuredClone(current);
  const changes: string[] = [];
  const wanted = hooksSettings(cmds.hook);
  const hooks: Json = isObj(next["hooks"]) ? next["hooks"] : {};
  for (const [event, groups] of Object.entries(wanted)) {
    const want = groups[0]?.hooks[0];
    if (!want) continue;
    const existing = Array.isArray(hooks[event]) ? [...(hooks[event] as unknown[])] : [];
    let found = false;
    for (const g of existing) {
      if (!isObj(g) || !Array.isArray(g["hooks"])) continue;
      const list = g["hooks"] as unknown[];
      for (const [i, h] of list.entries()) {
        if (!isObj(h) || !isManaged(h["command"])) continue;
        found = true;
        if (JSON.stringify(h) !== JSON.stringify(want)) {
          list[i] = { ...want };
          changes.push(`update ${event} hook`);
        }
      }
    }
    if (!found) {
      existing.push({ hooks: [{ ...want }] });
      changes.push(`add ${event} hook${want.async ? " (async)" : " (synchronous)"}`);
    }
    hooks[event] = existing;
  }
  if (changes.length > 0) next["hooks"] = hooks;

  let statusLineSkipped = false;
  const sl = statusLineSettings(cmds.statusLine).statusLine;
  const cur = next["statusLine"];
  if (cur === undefined) {
    next["statusLine"] = sl;
    changes.push("add statusLine");
  } else if (isObj(cur) && isManaged(cur["command"])) {
    if (JSON.stringify(cur) !== JSON.stringify(sl)) {
      next["statusLine"] = sl;
      changes.push("update statusLine");
    }
  } else {
    statusLineSkipped = true; // someone else's status line: never overwritten
  }
  return { next, changes, statusLineSkipped };
}

/** Removes only entries carrying the marker; empty groups, events and the hooks object are dropped. Pure. */
export function stripSettings(current: Json): { next: Json; changes: string[] } {
  const next: Json = structuredClone(current);
  const changes: string[] = [];
  const hooks = next["hooks"];
  if (isObj(hooks)) {
    for (const [event, groups] of Object.entries(hooks)) {
      if (!Array.isArray(groups)) continue;
      const kept: unknown[] = [];
      for (const g of groups) {
        if (!isObj(g) || !Array.isArray(g["hooks"])) {
          kept.push(g);
          continue;
        }
        const left = (g["hooks"] as unknown[]).filter((h) => !(isObj(h) && isManaged(h["command"])));
        if (left.length !== (g["hooks"] as unknown[]).length) changes.push(`remove ${event} hook`);
        if (left.length > 0) kept.push({ ...g, hooks: left });
      }
      if (kept.length > 0) hooks[event] = kept;
      else delete hooks[event];
    }
    if (Object.keys(hooks).length === 0) delete next["hooks"];
  }
  const sl = next["statusLine"];
  if (isObj(sl) && isManaged(sl["command"])) {
    delete next["statusLine"];
    changes.push("remove statusLine");
  }
  return { next, changes };
}

const REPOS_RE = /^([ \t]*repos[ \t]*=[ \t]*)\[([^\]]*)\]/m;
const quoted = (s: string): string => `'${s}'`;
const sameRepo = (a: string, b: string): boolean =>
  fwd(resolve(a)).toLowerCase() === fwd(resolve(b)).toLowerCase();

export function listRepos(text: string): string[] {
  const arr = REPOS_RE.exec(text)?.[2] ?? "";
  return [...arr.matchAll(/"([^"\n]+)"|'([^'\n]+)'/g)].flatMap((m) => {
    const v = m[1] ?? m[2];
    return v ? [v] : [];
  });
}

/** Adds a repo to `repos = [...]` in config.toml text, keeping everything else. Pure. */
export function addRepoToConfig(text: string, repo: string): { text: string; changed: boolean } {
  if (repo.includes("'")) throw new Error("A repo path with a single quote is not supported");
  const have = listRepos(text);
  if (have.some((r) => sameRepo(r, repo))) return { text, changed: false };
  const items = [...have.map(quoted), quoted(repo)].join(", ");
  if (REPOS_RE.test(text))
    return { text: text.replace(REPOS_RE, (_m, p: string) => `${p}[${items}]`), changed: true };
  const sep = text === "" || text.endsWith("\n") ? "" : "\n";
  return { text: `${text}${sep}repos = [${items}]\n`, changed: true };
}

export function removeRepoFromConfig(text: string, repo: string): { text: string; changed: boolean } {
  const have = listRepos(text);
  const left = have.filter((r) => !sameRepo(r, repo));
  if (left.length === have.length) return { text, changed: false };
  return {
    text: text.replace(REPOS_RE, (_m, p: string) => `${p}[${left.map(quoted).join(", ")}]`),
    changed: true,
  };
}

export interface RepoHooksReport {
  husky: boolean;
  lefthook: boolean;
  /** Own, non-sample hook files in `.git/hooks` (Lefthook installs its shims there too). */
  plain: string[];
  /** A repo-local `core.hooksPath` makes git ignore global hooks, so a global wrapper never runs there. */
  localHooksPath: string | null;
}

const git = (cwd: string, args: string[], env?: NodeJS.ProcessEnv): string => {
  try {
    return execFileSync("git", args, {
      cwd,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
      env,
    }).trim();
  } catch {
    return "";
  }
};

export function detectRepoHooks(repo: string): RepoHooksReport {
  const hooksDir = join(repo, ".git", "hooks");
  let plain: string[] = [];
  try {
    plain = readdirSync(hooksDir).filter((f) => !f.endsWith(".sample"));
  } catch {
    // Not a plain git directory (worktree file or no hooks dir).
  }
  return {
    husky: existsSync(join(repo, ".husky")),
    lefthook: ["lefthook.yml", "lefthook.yaml", ".lefthook.yml", ".lefthook.yaml"].some((f) =>
      existsSync(join(repo, f)),
    ),
    plain,
    localHooksPath: git(repo, ["config", "--local", "core.hooksPath"]) || null,
  };
}

/** One wrapper per git hook: note the event for Vantage, then run the repo's own hook, so nothing is lost. */
export function gitHookScript(name: string, hookCommand: string): string {
  return [
    "#!/bin/sh",
    `# ${MANAGED}: written by \`vantage add --git-hooks\`; remove with \`vantage remove\` or \`vantage uninstall\`.`,
    `printf '{"hook_event_name":"GitHook","git_hook":"${name}"}' | ${hookCommand} >/dev/null 2>&1 || true`,
    `own="$(git rev-parse --git-path hooks/${name} 2>/dev/null)"`,
    `if [ -n "$own" ] && [ -x "$own" ] && ! grep -q -- '${MANAGED}' "$own" 2>/dev/null; then`,
    '  exec "$own" "$@"',
    "fi",
    "exit 0",
    "",
  ].join("\n");
}

export interface Manifest {
  v: 1;
  installedAt: string;
  settings: string;
  backup: string | null;
  hookCommand: string;
  statusLineSet: boolean;
  repos: string[];
  gitHooksPath: string | null;
  gitconfig: string | null;
}

const str = (v: unknown): string => (typeof v === "string" ? v : "");

export function readManifest(path: string): Manifest | null {
  try {
    const m: unknown = JSON.parse(readFileSync(path, "utf8"));
    if (!isObj(m) || m["v"] !== 1) return null;
    return {
      v: 1,
      installedAt: str(m["installedAt"]),
      settings: str(m["settings"]),
      backup: typeof m["backup"] === "string" ? m["backup"] : null,
      hookCommand: str(m["hookCommand"]),
      statusLineSet: m["statusLineSet"] === true,
      repos: Array.isArray(m["repos"]) ? m["repos"].filter((r): r is string => typeof r === "string") : [],
      gitHooksPath: typeof m["gitHooksPath"] === "string" ? m["gitHooksPath"] : null,
      gitconfig: typeof m["gitconfig"] === "string" ? m["gitconfig"] : null,
    };
  } catch {
    return null;
  }
}

const writeJson = (path: string, v: unknown): void => {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, JSON.stringify(v, null, 2) + "\n");
};

const stamp = (d: Date): string => d.toISOString().replaceAll(/[:.]/g, "-");

const gitconfigGet = (file: string): string =>
  git(dirname(file), ["config", "--file", file, "core.hooksPath"]);

async function approved(io: InstallIo, args: string[], what: string): Promise<boolean> {
  if (args.includes("--yes")) return true;
  if (!io.confirm) {
    io.err(`${what} Re-run with --yes to apply it, or --dry-run to see it again.`);
    return false;
  }
  return io.confirm(`${what} Continue?`);
}

function repoArg(args: string[], io: InstallIo): string | null {
  const positional = args.filter((a) => !a.startsWith("--"));
  const target = resolve(io.cwd ?? process.cwd(), positional[0] ?? ".");
  const top = git(target, ["rev-parse", "--show-toplevel"]);
  if (!top) {
    io.err(`${target} is not inside a git repository.`);
    return null;
  }
  return top;
}

export async function runAdd(args: string[], io: InstallIo, now = new Date()): Promise<number> {
  const dry = args.includes("--dry-run");
  const withGit = args.includes("--git-hooks");
  const p = resolvePaths(io.env);
  const repo = repoArg(args, io);
  if (!repo) return 1;
  const cmds = resolveHookCommands(io.env);
  for (const f of cmds.files) {
    if (!existsSync(f)) {
      io.err(`${f} is missing. Build first (\`pnpm build\`), then run add again.`);
      return 1;
    }
  }
  let settings: Json;
  try {
    settings = readSettings(p.settings);
  } catch (e) {
    io.err(
      `Cannot read ${p.settings}: ${e instanceof Error ? e.message : "unknown error"}. Fix or move it; nothing was changed.`,
    );
    return 1;
  }
  const edit = mergeSettings(settings, cmds);
  const configText = existsSync(p.config) ? readFileSync(p.config, "utf8") : "";
  let cfg: { text: string; changed: boolean };
  try {
    cfg = addRepoToConfig(configText, repo);
  } catch (e) {
    io.err(e instanceof Error ? e.message : "bad repo path");
    return 1;
  }
  const report = detectRepoHooks(repo);

  const lines: string[] = [];
  lines.push(`${dry ? "Dry run: " : ""}vantage add ${fwd(repo)}`);
  lines.push(`1. ${p.settings}${existsSync(p.settings) ? "" : " (new file)"}`);
  if (edit.changes.length === 0) lines.push("   no change (already installed)");
  for (const c of edit.changes) lines.push(`   ${c}`);
  if (edit.statusLineSkipped) lines.push("   statusLine: skipped, another status line is set (left as is)");
  if (edit.changes.length > 0 && existsSync(p.settings))
    lines.push(`   backup first: ${join(p.home, "backups")}`);
  lines.push(`2. ${p.config}`);
  lines.push(cfg.changed ? `   add repo ${fwd(repo)}` : "   no change (repo already registered)");
  lines.push("3. Git hooks in the repo and your global git config");
  const found = [
    report.husky ? "Husky" : "",
    report.lefthook ? "Lefthook" : "",
    report.plain.length > 0 ? `${report.plain.length} hook file(s) in .git/hooks` : "",
  ].filter(Boolean);
  lines.push(`   detected: ${found.length > 0 ? found.join(", ") : "none"}`);
  let gitNote = "";
  let gitAction: "set" | "skip" | null = null;
  if (!withGit) {
    lines.push("   not installed (opt in with --git-hooks); the git scanner reads the repo without hooks");
  } else {
    const current = gitconfigGet(p.gitconfig);
    if (current && fwd(current) !== fwd(p.gitHooksDir)) {
      gitAction = "skip";
      gitNote = `core.hooksPath is already ${current}`;
      lines.push(`   skipped: ${gitNote} (never overwritten)`);
    } else {
      gitAction = "set";
      lines.push(`   write ${GIT_HOOK_NAMES.join(", ")} wrappers to ${fwd(p.gitHooksDir)}`);
      lines.push(`   set core.hooksPath in ${p.gitconfig}; each wrapper runs the repo's own hook after it`);
      if (report.localHooksPath) {
        lines.push(
          `   note: this repo sets core.hooksPath to ${report.localHooksPath} (Husky does), so git ignores the global wrappers here`,
        );
      }
    }
  }
  lines.push(`4. ${p.manifest}: records what was changed, for \`vantage remove\``);
  lines.push(`Hook: ${cmds.reason}`);
  lines.push(`Hook command: ${cmds.hook}`);
  for (const l of lines) io.out(l);
  if (dry) {
    io.out("Nothing was written.");
    return 0;
  }
  const nothing = edit.changes.length === 0 && !cfg.changed && gitAction !== "set";
  if (nothing && readManifest(p.manifest)) {
    io.out("Already installed. Nothing to do.");
    return 0;
  }
  if (!(await approved(io, args, "This changes the files above."))) return 1;

  const prior = readManifest(p.manifest);
  let backup = prior?.backup ?? null;
  if (edit.changes.length > 0) {
    if (existsSync(p.settings)) {
      backup = join(p.home, "backups", `settings.json.${stamp(now)}`);
      mkdirSync(dirname(backup), { recursive: true });
      copyFileSync(p.settings, backup);
    }
    writeJson(p.settings, edit.next);
  }
  if (cfg.changed) {
    mkdirSync(dirname(p.config), { recursive: true });
    writeFileSync(p.config, cfg.text);
  }
  let hooksPath = prior?.gitHooksPath ?? null;
  let gitconfig = prior?.gitconfig ?? null;
  if (gitAction === "set") {
    mkdirSync(p.gitHooksDir, { recursive: true });
    for (const n of GIT_HOOK_NAMES) {
      const f = join(p.gitHooksDir, n);
      writeFileSync(f, gitHookScript(n, cmds.hook));
      chmodSync(f, 0o755);
    }
    git(dirname(p.gitconfig), ["config", "--file", p.gitconfig, "core.hooksPath", fwd(p.gitHooksDir)]);
    hooksPath = fwd(p.gitHooksDir);
    gitconfig = p.gitconfig;
  }
  const manifest: Manifest = {
    v: 1,
    installedAt: prior?.installedAt || now.toISOString(),
    settings: p.settings,
    backup,
    hookCommand: cmds.hook,
    statusLineSet: (prior?.statusLineSet ?? false) || edit.changes.some((c) => c.endsWith("statusLine")),
    repos: [...new Set([...(prior?.repos ?? []), fwd(repo)])],
    gitHooksPath: hooksPath,
    gitconfig,
  };
  writeJson(p.manifest, manifest);
  io.out(`Done. Undo with \`vantage remove\` (this repo) or \`vantage uninstall\` (everything).`);
  if (backup) io.out(`Settings backup: ${backup}`);
  io.out("Next: `vantage start`, then `vantage doctor`.");
  return 0;
}

/** Restores nothing by copy: it strips only marked entries, so edits made since `add` survive. */
function stripInstall(
  p: Paths,
  io: InstallIo,
  repoOnly: string | null,
): { changes: string[]; error: boolean } {
  const changes: string[] = [];
  if (repoOnly) {
    const text = existsSync(p.config) ? readFileSync(p.config, "utf8") : "";
    const r = removeRepoFromConfig(text, repoOnly);
    if (r.changed) {
      writeFileSync(p.config, r.text);
      changes.push(`unregistered ${fwd(repoOnly)} in ${p.config}`);
    }
    const m = readManifest(p.manifest);
    if (m) {
      writeJson(p.manifest, { ...m, repos: m.repos.filter((x) => !sameRepo(x, repoOnly)) });
    }
    return { changes, error: false };
  }
  try {
    const cur = readSettings(p.settings);
    const s = stripSettings(cur);
    if (s.changes.length > 0) {
      const backup = join(p.home, "backups", `settings.json.${stamp(new Date())}.before-remove`);
      mkdirSync(dirname(backup), { recursive: true });
      copyFileSync(p.settings, backup);
      writeJson(p.settings, s.next);
      changes.push(...s.changes.map((c) => `${c} in ${p.settings}`));
    }
  } catch (e) {
    io.err(`Cannot read ${p.settings}: ${e instanceof Error ? e.message : "unknown error"}; left untouched.`);
    return { changes, error: true };
  }
  const m = readManifest(p.manifest);
  if (m?.gitHooksPath && m.gitconfig) {
    if (fwd(gitconfigGet(m.gitconfig)) === fwd(m.gitHooksPath)) {
      git(dirname(m.gitconfig), ["config", "--file", m.gitconfig, "--unset", "core.hooksPath"]);
      changes.push(`unset core.hooksPath in ${m.gitconfig}`);
    }
    for (const n of GIT_HOOK_NAMES) {
      const f = join(m.gitHooksPath, n);
      // Only a file that carries the marker is ours to delete.
      if (existsSync(f) && readFileSync(f, "utf8").includes(MANAGED)) {
        rmSync(f);
        changes.push(`removed ${fwd(f)}`);
      }
    }
    try {
      if (existsSync(m.gitHooksPath) && readdirSync(m.gitHooksPath).length === 0) rmdirSync(m.gitHooksPath);
    } catch {
      // Leave it.
    }
  }
  const config = existsSync(p.config) ? readFileSync(p.config, "utf8") : "";
  if (m && config) {
    let text = config;
    for (const r of m.repos) text = removeRepoFromConfig(text, r).text;
    if (text !== config) {
      writeFileSync(p.config, text);
      changes.push(`unregistered ${m.repos.length} repo(s) in ${p.config}`);
    }
  }
  if (existsSync(p.manifest)) rmSync(p.manifest);
  return { changes, error: false };
}

export async function runRemove(args: string[], io: InstallIo, uninstall: boolean): Promise<number> {
  const p = resolvePaths(io.env);
  const dry = args.includes("--dry-run");
  let repo: string | null = null;
  if (!uninstall) {
    repo = repoArg(args, io);
    if (!repo) return 1;
  }
  const what = uninstall
    ? `Uninstall removes the marked Vantage hooks and status line from ${p.settings}, any git hook wrappers it wrote, and its repos from ${p.config}. Your other settings stay. ${p.home} is not deleted.`
    : `Remove unregisters ${fwd(repo ?? "")} in ${p.config}. Machine-level hooks stay (use \`vantage uninstall\`).`;
  io.out(`${dry ? "Dry run: " : ""}${what}`);
  if (dry) return 0;
  if (!(await approved(io, args, "This changes the files above."))) return 1;
  const r = stripInstall(p, io, repo);
  if (r.error) return 1;
  for (const c of r.changes) io.out(c);
  io.out(r.changes.length === 0 ? "Nothing to remove." : "Done.");
  if (uninstall) io.out(`Data in ${p.home} is kept. Delete it yourself if you want it gone.`);
  return 0;
}
