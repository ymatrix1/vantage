// `vantage tour` (docs/specs/first-run.md#the-guided-tour): an offline walkthrough with synthetic examples,
// and `vantage tour --demo`, which serves a temporary synthetic home. Never touches the real VANTAGE_HOME.
import { join } from "node:path";
import { AlreadyRunningError, startDaemon, vantageHomeDir } from "@vantage/daemon";
import { makeDemoHome, removeDemoHome, sameFolder, seedDemoHome } from "./demo.ts";
import { en } from "./en.ts";
import { pt } from "./pt.ts";
import type { TourLang, TourText } from "./types.ts";
import { mkdirSync } from "node:fs";

export const TOURS: Record<TourLang, TourText> = { en, pt };
export const TOUR_STEPS = en.steps.length;

export interface TourIo {
  out(line: string): void;
  err(line: string): void;
  env: NodeJS.ProcessEnv;
  /** Resolves when the process is asked to stop (SIGINT or SIGTERM). */
  stopSignal?: Promise<void>;
  /** Waits for Enter. Absent when there is no terminal, so the tour prints everything. */
  pause?: (prompt: string) => Promise<void>;
}

export interface TourDeps {
  /** Built UI directory, or undefined for API only. */
  uiDir: string | undefined;
  /** The Track page URL with the token in the fragment. */
  url: (port: number, token: string) => string;
}

/** `pt` when the system locale is Portuguese (LC_ALL, LC_MESSAGES, LANG, then the runtime locale), else `en`. */
export function detectLang(env: NodeJS.ProcessEnv): TourLang {
  const raw =
    env["LC_ALL"] ||
    env["LC_MESSAGES"] ||
    env["LANG"] ||
    Intl.DateTimeFormat().resolvedOptions().locale ||
    "";
  return /^pt/i.test(raw) ? "pt" : "en";
}

function option(args: string[], name: string): string | undefined {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : undefined;
}

const USAGE = "Usage: vantage tour [--lang pt|en] [--no-pause] [--step 1-8] | vantage tour --demo [--port N]";

export async function runTour(args: string[], io: TourIo, deps: TourDeps): Promise<number> {
  const langArg = option(args, "--lang");
  if (langArg !== undefined && langArg !== "pt" && langArg !== "en") {
    io.err(`Unknown language: ${langArg}. ${USAGE}`);
    return 2;
  }
  const lang = langArg ?? detectLang(io.env);
  const text = TOURS[lang];
  const known = new Set(["--lang", "--no-pause", "--step", "--demo", "--port"]);
  for (const a of args) {
    if (a.startsWith("--") && !known.has(a)) {
      io.err(`Unknown option: ${a}. ${USAGE}`);
      return 2;
    }
  }
  if (args.includes("--demo")) return runDemo(args, io, deps, text);

  const stepArg = option(args, "--step");
  const total = text.steps.length;
  const first = stepArg === undefined ? 1 : Number(stepArg);
  if (!Number.isInteger(first) || first < 1 || first > total) {
    io.err(`--step needs a number from 1 to ${total}. ${USAGE}`);
    return 2;
  }
  const interactive = io.pause !== undefined && !args.includes("--no-pause");
  if (first === 1) {
    io.out(text.intro);
    io.out("");
  }
  for (let n = first; n <= total; n++) {
    const step = text.steps[n - 1];
    if (!step) break;
    io.out(`${text.stepLabel(n, total)}: ${step.title}`);
    io.out("-".repeat(Math.min(60, text.stepLabel(n, total).length + step.title.length + 2)));
    for (const l of step.lines) io.out(l);
    io.out("");
    if (interactive && n < total) await io.pause?.(text.pressEnter);
  }
  for (const l of text.outro) io.out(l);
  return 0;
}

async function runDemo(args: string[], io: TourIo, deps: TourDeps, text: TourText): Promise<number> {
  const portText = option(args, "--port");
  const port = portText === undefined ? 0 : Number(portText);
  if (!Number.isInteger(port) || port < 0 || port > 65535) {
    io.err(`Not a valid port: ${portText}`);
    return 2;
  }
  const home = makeDemoHome();
  try {
    // The demo owns its own home. It never looks at the real one, so a collision would be a bug.
    if (sameFolder(home, vantageHomeDir(io.env))) {
      io.err("Refusing to use the real Vantage home for the demo.");
      return 1;
    }
    io.out(text.demo.starting);
    seedDemoHome(home);
    const projectsDir = join(home, "projects"); // empty: the demo never reads ~/.claude
    mkdirSync(projectsDir, { recursive: true });
    const daemon = await startDaemon({
      home,
      port,
      // A clean environment: the real VANTAGE_HOME, VANTAGE_REPOS and VANTAGE_PROJECTS_DIR are not passed on.
      env: { VANTAGE_HOME: home },
      projectsDir,
      repos: [],
      ...(deps.uiDir ? { uiDir: deps.uiDir } : {}),
    });
    try {
      io.out(text.demo.open);
      io.out(deps.url(daemon.port, daemon.token));
      io.out(text.demo.fake);
      io.out(text.demo.stop);
      if (!deps.uiDir)
        io.err("The UI is not built. Run `pnpm build` to get the Track page; the API still works.");
      await (io.stopSignal ?? new Promise<void>(() => undefined));
    } finally {
      await daemon.stop();
    }
    return 0;
  } catch (e) {
    if (e instanceof AlreadyRunningError) {
      io.err(e.message);
    } else if (e instanceof Error && "code" in e && e.code === "EADDRINUSE") {
      io.err(`Port ${port} is in use. Pick another with --port, or leave it out to get a free one.`);
    } else {
      io.err(`Could not start the demo: ${e instanceof Error ? e.message : "unknown error"}`);
    }
    return 1;
  } finally {
    if (removeDemoHome(home)) io.out(text.demo.cleaned);
  }
}
