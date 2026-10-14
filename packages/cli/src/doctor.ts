// `vantage doctor`: a short pass, warn or fail table with one fix hint per problem (D52, D72).
// Read-only: it never writes outside a spool probe file it removes again. Exit code is non-zero only on fail.
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { readHealth } from "@vantage/daemon";
import { HOOK_EVENTS, MANAGED, readSettings, resolvePaths, type InstallIo, listRepos } from "./install.ts";

export type CheckStatus = "pass" | "warn" | "fail";
export interface Check {
  name: string;
  status: CheckStatus;
  detail: string;
  /** One hint, shown only when the check does not pass. */
  fix?: string;
}

const HEALTH_FRESH_MS = 60_000;
const STATUS_FRESH_MS = 5 * 60_000;

/** The file a registered command runs: the first double-quoted path in it. */
const commandFile = (cmd: string): string | null => /"([^"]+)"/.exec(cmd)?.[1] ?? null;

function hooksCheck(settingsPath: string): Check[] {
  let settings: Record<string, unknown>;
  try {
    settings = readSettings(settingsPath);
  } catch (e) {
    return [
      {
        name: "hooks",
        status: "fail",
        detail: `cannot read ${settingsPath}: ${e instanceof Error ? e.message : "unknown error"}`,
        fix: "Fix the JSON in that file, then run `vantage add`.",
      },
    ];
  }
  const hooks = settings["hooks"];
  const registered = new Map<string, string>();
  if (typeof hooks === "object" && hooks !== null) {
    for (const [event, groups] of Object.entries(hooks)) {
      if (!Array.isArray(groups)) continue;
      for (const g of groups) {
        const list: unknown = typeof g === "object" && g !== null ? Reflect.get(g, "hooks") : null;
        if (!Array.isArray(list)) continue;
        for (const h of list) {
          const cmd: unknown = typeof h === "object" && h !== null ? Reflect.get(h, "command") : null;
          if (typeof cmd === "string" && cmd.includes(MANAGED)) registered.set(event, cmd);
        }
      }
    }
  }
  const missing = HOOK_EVENTS.filter((e) => !registered.has(e));
  const out: Check[] = [];
  if (missing.length > 0) {
    out.push({
      name: "hooks",
      status: "fail",
      detail: `${registered.size} of ${HOOK_EVENTS.length} registered; missing ${missing.join(", ")}`,
      fix: "Run `vantage add --dry-run`, then `vantage add`.",
    });
    return out;
  }
  const gone = [...new Set([...registered.values()].map(commandFile))].filter(
    (f): f is string => f !== null && !existsSync(f),
  );
  if (gone.length > 0) {
    out.push({
      name: "hooks",
      status: "fail",
      detail: `registered, but ${gone[0]} does not exist`,
      fix: "Build Vantage (`pnpm build`) or run `vantage add` again from the current install.",
    });
    return out;
  }
  const kind = [...registered.values()].some((c) => c.startsWith("node "))
    ? "built JavaScript"
    : "native binary";
  out.push({ name: "hooks", status: "pass", detail: `${HOOK_EVENTS.length} events registered (${kind})` });
  return out;
}

function statusLineCheck(settingsPath: string): Check {
  try {
    const sl = readSettings(settingsPath)["statusLine"];
    const cmd: unknown = typeof sl === "object" && sl !== null ? Reflect.get(sl, "command") : null;
    if (typeof cmd === "string" && cmd.includes(MANAGED)) {
      const f = commandFile(cmd);
      return f && !existsSync(f)
        ? {
            name: "status line",
            status: "warn",
            detail: `${f} does not exist`,
            fix: "Run `vantage add` again.",
          }
        : { name: "status line", status: "pass", detail: "registered" };
    }
    return {
      name: "status line",
      status: "warn",
      detail: sl === undefined ? "not registered" : "another status line is set",
      fix:
        sl === undefined
          ? "Run `vantage add`."
          : "Merge Vantage's status line into yours by hand (see docs/specs/status-line.md).",
    };
  } catch {
    return {
      name: "status line",
      status: "warn",
      detail: "settings unreadable",
      fix: "Fix the settings file.",
    };
  }
}

function spoolCheck(home: string): Check {
  const dir = join(home, "spool");
  const probe = join(dir, `.doctor-${process.pid}`);
  try {
    mkdirSync(dir, { recursive: true });
    writeFileSync(probe, "");
    rmSync(probe);
    return { name: "spool", status: "pass", detail: `${dir} is writable` };
  } catch (e) {
    return {
      name: "spool",
      status: "fail",
      detail: `${dir} is not writable (${e instanceof Error && "code" in e ? String(e.code) : "error"})`,
      fix: "Check the permissions of the Vantage home directory (VANTAGE_HOME).",
    };
  }
}

function daemonCheck(home: string, now: Date): Check {
  const h = readHealth(home);
  if (!h) {
    return {
      name: "daemon",
      status: "warn",
      detail: "not running (hooks still write to the spool)",
      fix: "Run `vantage start`.",
    };
  }
  const age = now.getTime() - Date.parse(h.updatedAt);
  if (h.state !== "running" || !(age < HEALTH_FRESH_MS)) {
    return {
      name: "daemon",
      status: "warn",
      detail: h.state === "running" ? `health file is ${Math.round(age / 1000)} s old` : "stopped",
      fix: "Run `vantage start`.",
    };
  }
  return { name: "daemon", status: "pass", detail: `running (pid ${h.pid}, port ${h.port})` };
}

function dbCheck(home: string): Check {
  const path = join(home, "vantage.db");
  if (!existsSync(path)) {
    return { name: "database", status: "warn", detail: "not created yet", fix: "Run `vantage start` once." };
  }
  try {
    const db = new DatabaseSync(path, { readOnly: true });
    try {
      db.exec("PRAGMA busy_timeout = 200");
      const n = Number(db.prepare("SELECT COUNT(*) AS n FROM events").get()?.["n"] ?? 0);
      return { name: "database", status: "pass", detail: `opens read-only, ${n} events` };
    } finally {
      db.close();
    }
  } catch (e) {
    return {
      name: "database",
      status: "fail",
      detail: `cannot open read-only (${e instanceof Error ? e.message.slice(0, 80) : "error"})`,
      fix: "Stop the daemon and restore the latest backup in the Vantage home, or move vantage.db aside to start fresh.",
    };
  }
}

function statusFileCheck(home: string, now: Date): Check {
  try {
    const parsed: unknown = JSON.parse(readFileSync(join(home, "status.json"), "utf8"));
    const at = typeof parsed === "object" && parsed !== null ? Reflect.get(parsed, "writtenAt") : null;
    const age = now.getTime() - Date.parse(String(at));
    return age < STATUS_FRESH_MS
      ? { name: "status file", status: "pass", detail: `written ${Math.round(age / 1000)} s ago` }
      : { name: "status file", status: "warn", detail: "older than 5 minutes", fix: "Run `vantage start`." };
  } catch {
    return { name: "status file", status: "warn", detail: "missing", fix: "Run `vantage start`." };
  }
}

function sourcesCheck(home: string, env: NodeJS.ProcessEnv, userHome: string): Check {
  const config = join(home, "config.toml");
  let repos = 0;
  try {
    repos = listRepos(readFileSync(config, "utf8")).length;
  } catch {
    // No config yet.
  }
  const projects =
    env["VANTAGE_PROJECTS_DIR"] || join(env["CLAUDE_CONFIG_DIR"] || join(userHome, ".claude"), "projects");
  const claude = existsSync(projects);
  if (repos === 0) {
    return {
      name: "sources",
      status: "warn",
      detail: "no repos registered",
      fix: "Run `vantage add` inside a repo.",
    };
  }
  return {
    name: "sources",
    status: "pass",
    detail: `Claude Code hooks and git, ${repos} repo(s)${claude ? ", transcripts found" : ", no transcripts directory yet"}`,
  };
}

export function runChecks(env: NodeJS.ProcessEnv, now = new Date()): Check[] {
  const p = resolvePaths(env);
  return [
    ...hooksCheck(p.settings),
    statusLineCheck(p.settings),
    spoolCheck(p.home),
    daemonCheck(p.home, now),
    dbCheck(p.home),
    statusFileCheck(p.home, now),
    sourcesCheck(p.home, env, p.userHome),
  ];
}

export function runDoctor(io: InstallIo, now = new Date()): number {
  const checks = runChecks(io.env, now);
  const width = Math.max(...checks.map((c) => c.name.length));
  for (const c of checks) {
    io.out(`${c.status.toUpperCase().padEnd(4)}  ${c.name.padEnd(width)}  ${c.detail}`);
    if (c.status !== "pass" && c.fix) io.out(`      fix: ${c.fix}`);
  }
  const fails = checks.filter((c) => c.status === "fail").length;
  const warns = checks.filter((c) => c.status === "warn").length;
  io.out(
    fails > 0
      ? `${fails} failed, ${warns} warning(s).`
      : warns > 0
        ? `OK with ${warns} warning(s).`
        : "All checks pass.",
  );
  return fails > 0 ? 1 : 0;
}
