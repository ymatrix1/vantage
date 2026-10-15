// `vantage start`, `open`, `add`, `remove`, `uninstall`, `doctor`, `stats` and `titles` (docs/specs/operations.md).
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  AlreadyRunningError,
  DEFAULT_PORT,
  Store,
  clearRequestTitles,
  listRequestTitles,
  loadOrCreateToken,
  readFlagWindowHours,
  readHealth,
  readRequestTitlesEnabled,
  runStagePass,
  startDaemon,
  vantageHomeDir,
} from "@vantage/daemon";
import { runClassify } from "./classify.ts";
import { runDoctor } from "./doctor.ts";
import { runAdd, runRemove } from "./install.ts";
import { formatVersion, readVersionInfo } from "./version.ts";
import { runStats } from "./stats.ts";

export interface CliIo {
  out(line: string): void;
  err(line: string): void;
  env: NodeJS.ProcessEnv;
  /** Resolves when the process is asked to stop (SIGINT or SIGTERM). */
  stopSignal?: Promise<void>;
  /** Test seam for the platform opener. */
  open?: (url: string) => void;
  /** Working directory for `add` and `remove`; defaults to `process.cwd()`. */
  cwd?: string;
  /** Yes or no prompt; absent when there is no terminal, so a real change needs `--yes`. */
  confirm?: (question: string) => Promise<boolean>;
}

/** The token travels in the URL fragment only, never in a query string (D32, D75). */
export const trackUrl = (port: number, token: string): string => `http://127.0.0.1:${port}/#token=${token}`;

/** Opens a URL with the platform opener. The URL holds no shell metacharacters (port and hex token). */
export function openUrl(url: string, platform: NodeJS.Platform = process.platform): void {
  const [cmd, args]: [string, string[]] =
    platform === "win32"
      ? ["cmd.exe", ["/c", "start", '""', url]]
      : platform === "darwin"
        ? ["open", [url]]
        : ["xdg-open", [url]];
  const child = spawn(cmd, args, { stdio: "ignore", detached: true, windowsVerbatimArguments: true });
  child.on("error", () => undefined);
  child.unref();
}

function builtUiDir(env: NodeJS.ProcessEnv): string | undefined {
  const dir = env["VANTAGE_UI_DIR"] || fileURLToPath(new URL("../../../ui/dist", import.meta.url));
  return existsSync(join(dir, "index.html")) ? dir : undefined;
}

function flag(args: string[], name: string): string | undefined {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : undefined;
}

async function start(args: string[], io: CliIo): Promise<number> {
  const portText = flag(args, "--port") ?? io.env["VANTAGE_PORT"];
  const port = portText === undefined ? DEFAULT_PORT : Number(portText);
  if (!Number.isInteger(port) || port < 0 || port > 65535) {
    io.err(`Not a valid port: ${portText}`);
    return 2;
  }
  const uiDir = builtUiDir(io.env);
  try {
    const d = await startDaemon({
      port,
      env: io.env,
      ...(uiDir ? { uiDir } : {}),
      log: (l) => io.out(`${new Date().toISOString()} ${l}`),
    });
    if (!uiDir) io.err("The UI is not built. Run `pnpm build` to get the Track page; the API still works.");
    io.out(`Open the Track page with: vantage open`);
    await (io.stopSignal ?? new Promise<void>(() => undefined));
    await d.stop();
    return 0;
  } catch (e) {
    if (e instanceof AlreadyRunningError) {
      io.err(`${e.message} Use \`vantage open\` to see it.`);
      return 1;
    }
    if (e instanceof Error && "code" in e && e.code === "EADDRINUSE") {
      io.err(`Port ${port} is in use. Pick another with --port or VANTAGE_PORT.`);
      return 1;
    }
    io.err(`Could not start: ${e instanceof Error ? e.message : "unknown error"}`);
    return 1;
  }
}

function open(args: string[], io: CliIo): number {
  const home = vantageHomeDir(io.env);
  const health = readHealth(home);
  if (!health || health.state !== "running") {
    io.err("Vantage is not running. Start it with `vantage start`.");
    return 1;
  }
  const url = trackUrl(health.port, loadOrCreateToken(join(home, "token")));
  io.out(url);
  if (!args.includes("--print")) (io.open ?? openUrl)(url);
  return 0;
}

/**
 * `vantage titles` lists the request titles stored locally (D95); `vantage titles clear` deletes them and
 * refreshes the item titles. Nothing here sends or logs anything else.
 */
function titles(args: string[], io: CliIo): number {
  const [sub, ...extra] = args;
  if ((sub !== undefined && sub !== "clear") || extra.length > 0) {
    io.err("Usage: vantage titles [clear]");
    return 2;
  }
  const home = vantageHomeDir(io.env);
  const dbPath = join(home, "vantage.db");
  if (!existsSync(dbPath)) {
    io.out("No request titles stored (no database yet).");
    return 0;
  }
  const store = new Store(dbPath);
  try {
    if (sub === "clear") {
      const n = clearRequestTitles(store);
      const window = readFlagWindowHours(home);
      runStagePass(store, {
        requestTitles: true,
        ...(window === undefined ? {} : { flagWindowHours: window }),
      });
      io.out(`Cleared ${n} request title(s). Items use the repo, branch and date title again.`);
      return 0;
    }
    const all = listRequestTitles(store);
    const on = readRequestTitlesEnabled(home);
    io.out(
      `${all.length} request title(s) stored locally in ${dbPath}. Capture is ${on ? "on" : "off"} (item_titles_from_requests in config.toml).`,
    );
    for (const t of all) io.out(`${t.sessionId.slice(0, 8)}  ${t.capturedAt.slice(0, 10)}  ${t.title}`);
    return 0;
  } finally {
    store.close();
  }
}

export async function runCli(argv: string[], io: CliIo): Promise<number> {
  const [cmd, ...rest] = argv;
  if (cmd === "start") return start(rest, io);
  if (cmd === "open") return open(rest, io);
  if (cmd === "add") return runAdd(rest, io);
  if (cmd === "remove") return runRemove(rest, io, false);
  if (cmd === "uninstall") return runRemove(rest, io, true);
  if (cmd === "doctor") return runDoctor(io);
  if (cmd === "--version" || cmd === "-v" || cmd === "version") {
    io.out(formatVersion(readVersionInfo(io.env)));
    return 0;
  }
  if (cmd === "stats") return runStats(rest, io);
  if (cmd === "titles") return titles(rest, io);
  if (cmd === "classify") return runClassify(rest, io);
  io.err(
    "Usage: vantage start [--port N] | open [--print] | add [path] [--dry-run] [--yes] [--git-hooks] | remove [path] | uninstall | doctor | --version | stats [--json] [--since 7d] [--repo NAME] [--days N] | titles [clear] | classify [--dry-run | accept | dismiss | undo | report | status]",
  );
  return cmd === undefined || cmd === "--help" || cmd === "help" ? 0 : 2;
}
