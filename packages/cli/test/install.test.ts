// Hermetic: every path lives in a temp directory (HOME, USERPROFILE, VANTAGE_HOME, CLAUDE_CONFIG_DIR,
// GIT_CONFIG_GLOBAL, VANTAGE_HOOKS_DIR). Nothing here may touch the real home, real Claude Code
// settings or real git hooks. Synthetic data only.
import { execFileSync, spawnSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { homedir, tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { Store } from "@vantage/daemon";
import { runCli, type CliIo } from "../src/cli.ts";
import { runChecks } from "../src/doctor.ts";
import {
  HOOK_EVENTS,
  MANAGED,
  addRepoToConfig,
  gitHookScript,
  mergeSettings,
  removeRepoFromConfig,
  findNativeBinary,
  resolveHookCommands,
  resolvePaths,
  stripSettings,
} from "../src/install.ts";

let root = "";
let env: NodeJS.ProcessEnv;
let repo = "";
let out: string[] = [];
let err: string[] = [];

const p = (...s: string[]): string => join(root, ...s);
const settingsPath = (): string => p("claude", "settings.json");
const isRec = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null;
const asRec = (v: unknown): Record<string, unknown> => {
  if (!isRec(v)) throw new Error("not an object");
  return v;
};
const asList = (v: unknown): unknown[] => {
  if (!Array.isArray(v)) throw new Error("not a list");
  return v;
};
const readSettings = (): Record<string, unknown> => asRec(JSON.parse(readFileSync(settingsPath(), "utf8")));
/** The marked command of the first hook in an event's first group. */
const firstHook = (hooks: Record<string, unknown>, event: string): Record<string, unknown> =>
  asRec(asList(asRec(asList(hooks[event])[0])["hooks"])[0]);
const status = (name: string) => runChecks(env).find((c) => c.name === name)?.status;
const git = (cwd: string, ...args: string[]): string =>
  execFileSync("git", args, { cwd, encoding: "utf8", env: { ...process.env, ...env } }).trim();

const io = (extra: Partial<CliIo> = {}): CliIo => ({
  out: (l) => out.push(l),
  err: (l) => err.push(l),
  env,
  cwd: repo,
  ...extra,
});
const cli = (args: string[], extra: Partial<CliIo> = {}): Promise<number> => runCli(args, io(extra));

/** Every file under root with its content, to prove a dry run wrote nothing. */
const snapshot = (dir = root): Record<string, string> => {
  const acc: Record<string, string> = {};
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const f = join(dir, e.name);
    if (e.name === ".git") continue;
    if (e.isDirectory()) Object.assign(acc, snapshot(f));
    else acc[f] = readFileSync(f, "utf8");
  }
  return acc;
};

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), "vantage-install-"));
  mkdirSync(p("hooks"), { recursive: true });
  writeFileSync(p("hooks", "bin.js"), "// fake hook\n");
  writeFileSync(p("hooks", "statusline-bin.js"), "// fake status line\n");
  mkdirSync(p("claude"), { recursive: true });
  env = {
    PATH: process.env["PATH"] ?? "",
    HOME: p("home"),
    USERPROFILE: p("home"),
    VANTAGE_HOME: p("vh"),
    CLAUDE_CONFIG_DIR: p("claude"),
    GIT_CONFIG_GLOBAL: p("home", "gitconfig"),
    GIT_CONFIG_NOSYSTEM: "1",
    VANTAGE_HOOKS_DIR: p("hooks"),
    // Point the native lookups at temp dirs so a real build or install on this machine never leaks in.
    VANTAGE_NATIVE_PACKAGES_DIR: p("npm"),
    VANTAGE_NATIVE_BUILD_DIR: p("cargo"),
  };
  mkdirSync(p("home"), { recursive: true });
  repo = p("repo");
  mkdirSync(repo);
  git(repo, "init", "-q");
  out = [];
  err = [];
});
afterEach(() => rmSync(root, { recursive: true, force: true }));

const ORIGINAL = {
  model: "sonnet",
  hooks: {
    SessionStart: [{ hooks: [{ type: "command", command: "echo mine" }] }],
    PreToolUse: [{ matcher: "Bash", hooks: [{ type: "command", command: "lint.sh" }] }],
  },
};

describe("path safety", () => {
  it("resolves every path from the environment, never the real home", () => {
    const paths = resolvePaths(env);
    for (const f of [paths.home, paths.settings, paths.config, paths.gitconfig, paths.gitHooksDir]) {
      expect(f.startsWith(root)).toBe(true);
      expect(f.startsWith(homedir()) && !root.startsWith(homedir())).toBe(false);
    }
  });
});

describe("vantage add --dry-run", () => {
  it("prints exactly what would change and writes nothing", async () => {
    writeFileSync(settingsPath(), JSON.stringify(ORIGINAL, null, 2));
    const before = snapshot();
    expect(await cli(["add", "--dry-run", "--git-hooks"])).toBe(0);
    expect(snapshot()).toEqual(before);
    const text = out.join("\n");
    expect(text).toContain("Dry run");
    expect(text).toContain("add Stop hook (synchronous)");
    expect(text).toContain("add PostToolUse hook (async)");
    expect(text).toContain("add statusLine");
    expect(text).toContain("add repo");
    expect(text).toContain("core.hooksPath");
    expect(text).toContain("Nothing was written.");
    expect(text).toContain(MANAGED);
  });

  it("reports Husky and Lefthook when the repo uses them", async () => {
    mkdirSync(p("repo", ".husky"));
    writeFileSync(p("repo", "lefthook.yml"), "pre-commit: {}\n");
    await cli(["add", "--dry-run"]);
    expect(out.join("\n")).toContain("detected: Husky, Lefthook");
  });
});

describe("vantage add", () => {
  it("registers eight hooks (Stop synchronous), the status line and the repo, with a manifest", async () => {
    expect(await cli(["add", "--yes"])).toBe(0);
    const s = readSettings();
    const hooks = asRec(s["hooks"]);
    expect(Object.keys(hooks).toSorted()).toEqual([...HOOK_EVENTS].toSorted());
    for (const event of HOOK_EVENTS) {
      const h = firstHook(hooks, event);
      expect(h["command"]).toEqual(expect.stringContaining(MANAGED));
      expect(h["async"] === true).toBe(event !== "Stop");
    }
    expect(asRec(s["statusLine"])["command"]).toEqual(expect.stringContaining("statusline-bin.js"));
    expect(readFileSync(p("vh", "config.toml"), "utf8")).toContain("repos = [");
    expect(JSON.parse(readFileSync(p("vh", "install.json"), "utf8"))).toMatchObject({
      v: 1,
      statusLineSet: true,
    });
  });

  it("is idempotent: a second run changes nothing and makes no backup", async () => {
    writeFileSync(settingsPath(), JSON.stringify(ORIGINAL, null, 2));
    await cli(["add", "--yes"]);
    const after = snapshot();
    out = [];
    expect(await cli(["add", "--yes"])).toBe(0);
    expect(out.join("\n")).toContain("Already installed");
    expect(snapshot()).toEqual(after);
  });

  it("merges into existing settings, keeps other hooks and backs the file up first", async () => {
    writeFileSync(settingsPath(), JSON.stringify(ORIGINAL, null, 2));
    await cli(["add", "--yes"]);
    const s = readSettings();
    expect(s["model"]).toBe("sonnet");
    const hooks = asRec(s["hooks"]);
    const start = asList(hooks["SessionStart"]).map((g) => asRec(asList(asRec(g)["hooks"])[0])["command"]);
    expect(start).toEqual(["echo mine", expect.stringContaining(MANAGED)]);
    expect(JSON.stringify(hooks["PreToolUse"])).toContain("lint.sh");
    const backups = readdirSync(p("vh", "backups"));
    expect(backups).toHaveLength(1);
    expect(JSON.parse(readFileSync(p("vh", "backups", backups[0] ?? ""), "utf8"))).toEqual(ORIGINAL);
  });

  it("never overwrites another status line", async () => {
    const other = { statusLine: { type: "command", command: "my-line" } };
    writeFileSync(settingsPath(), JSON.stringify(other));
    await cli(["add", "--yes"]);
    expect(readSettings()["statusLine"]).toEqual(other.statusLine);
    expect(out.join("\n")).toContain("another status line is set");
  });

  it("refuses unreadable settings and changes nothing", async () => {
    writeFileSync(settingsPath(), "{ not json");
    const before = snapshot();
    expect(await cli(["add", "--yes"])).toBe(1);
    expect(err.join("\n")).toContain("nothing was changed");
    expect(snapshot()).toEqual(before);
  });

  it("needs confirmation: no --yes without a terminal, or an answer of no, writes nothing", async () => {
    const before = snapshot();
    expect(await cli(["add"])).toBe(1);
    expect(err.join("\n")).toContain("--yes");
    expect(await cli(["add"], { confirm: () => Promise.resolve(false) })).toBe(1);
    expect(snapshot()).toEqual(before);
    expect(await cli(["add"], { confirm: () => Promise.resolve(true) })).toBe(0);
    expect(existsSync(settingsPath())).toBe(true);
  });

  it("fails when the hook files are not built", async () => {
    rmSync(p("hooks", "bin.js"));
    expect(await cli(["add", "--yes"])).toBe(1);
    expect(err.join("\n")).toContain("Build first");
  });

  it("refuses a directory that is not a git repository", async () => {
    mkdirSync(p("plain"));
    expect(await cli(["add", "--yes"], { cwd: p("plain") })).toBe(1);
  });
});

describe("vantage uninstall and remove", () => {
  it("uninstall restores settings to what they were before add, touching only marked entries", async () => {
    writeFileSync(settingsPath(), JSON.stringify(ORIGINAL, null, 2));
    await cli(["add", "--yes"]);
    expect(await cli(["uninstall", "--yes"])).toBe(0);
    expect(readSettings()).toEqual(ORIGINAL);
    expect(existsSync(p("vh", "install.json"))).toBe(false);
  });

  it("uninstall leaves entries added by hand after add", async () => {
    await cli(["add", "--yes"]);
    const s = readSettings();
    asList(asRec(s["hooks"])["Notification"]).push({
      hooks: [{ type: "command", command: "notify-me" }],
    });
    writeFileSync(settingsPath(), JSON.stringify(s));
    await cli(["uninstall", "--yes"]);
    expect(readSettings()).toEqual({
      hooks: { Notification: [{ hooks: [{ type: "command", command: "notify-me" }] }] },
    });
  });

  it("uninstall dry run writes nothing", async () => {
    await cli(["add", "--yes"]);
    const before = snapshot();
    expect(await cli(["uninstall", "--dry-run"])).toBe(0);
    expect(snapshot()).toEqual(before);
  });

  it("remove unregisters only this repo and keeps the machine-level hooks", async () => {
    const other = p("other");
    mkdirSync(other);
    git(other, "init", "-q");
    await cli(["add", "--yes"]);
    await cli(["add", "--yes"], { cwd: other });
    expect(await cli(["remove", "--yes"])).toBe(0);
    const config = readFileSync(p("vh", "config.toml"), "utf8");
    expect(config).toContain("other");
    expect(config).not.toContain("repo'");
    expect(Object.keys(asRec(readSettings()["hooks"]))).toHaveLength(HOOK_EVENTS.length);
  });
});

describe("git hooks (opt-in)", () => {
  it("writes chaining wrappers, sets core.hooksPath in the temp gitconfig only, and uninstall reverses it", async () => {
    await cli(["add", "--yes", "--git-hooks"]);
    const dir = p("vh", "git-hooks");
    expect(readdirSync(dir).toSorted()).toEqual(["post-checkout", "post-commit", "post-merge"]);
    expect(readFileSync(join(dir, "post-commit"), "utf8")).toContain(MANAGED);
    expect(git(root, "config", "--file", p("home", "gitconfig"), "core.hooksPath")).toBe(
      dir.replaceAll("\\", "/"),
    );
    await cli(["uninstall", "--yes"]);
    expect(existsSync(dir)).toBe(false);
    expect(readFileSync(p("home", "gitconfig"), "utf8")).not.toContain("hooksPath");
  });

  it("never overwrites a core.hooksPath that is already set", async () => {
    writeFileSync(p("home", "gitconfig"), "[core]\n\thooksPath = /elsewhere\n");
    await cli(["add", "--yes", "--git-hooks"]);
    expect(readFileSync(p("home", "gitconfig"), "utf8")).toContain("/elsewhere");
    expect(existsSync(p("vh", "git-hooks"))).toBe(false);
    expect(out.join("\n")).toContain("never overwritten");
    await cli(["uninstall", "--yes"]);
    expect(readFileSync(p("home", "gitconfig"), "utf8")).toContain("/elsewhere");
  });

  it("only deletes wrappers that carry the marker", async () => {
    await cli(["add", "--yes", "--git-hooks"]);
    writeFileSync(p("vh", "git-hooks", "post-merge"), "#!/bin/sh\necho user wrote this\n");
    await cli(["uninstall", "--yes"]);
    expect(existsSync(p("vh", "git-hooks", "post-merge"))).toBe(true);
  });

  it("a wrapper runs the repo's own hook after Vantage's and keeps its exit code", () => {
    const sh = spawnSync("sh", ["-c", "exit 0"]);
    if (sh.error) return; // no POSIX shell on this machine
    writeFileSync(p("hooks", "bin.js"), "process.stdin.resume();process.stdin.on('end',()=>{});\n");
    const own = p("repo", ".git", "hooks", "post-commit");
    writeFileSync(own, `#!/bin/sh\necho chained > "${p("chained.txt").replaceAll("\\", "/")}"\nexit 3\n`, {
      mode: 0o755,
    });
    const wrapper = p("wrapper");
    writeFileSync(
      wrapper,
      gitHookScript("post-commit", `node "${p("hooks", "bin.js").replaceAll("\\", "/")}" ${MANAGED}`),
    );
    const r = spawnSync("sh", [wrapper.replaceAll("\\", "/")], {
      cwd: repo,
      env: { ...process.env, ...env },
    });
    expect(readFileSync(p("chained.txt"), "utf8").trim()).toBe("chained");
    expect(r.status).toBe(3);
  });
});

describe("pure helpers", () => {
  const cmds = resolveHookCommands(env ?? {});
  it("mergeSettings updates a moved path in place instead of adding a second entry", () => {
    const first = mergeSettings({}, { ...cmds, hook: `node "/a/bin.js" ${MANAGED}` }).next;
    const moved = mergeSettings(first, { ...cmds, hook: `node "/b/bin.js" ${MANAGED}` });
    const stop = asList(asRec(moved.next["hooks"])["Stop"]);
    expect(stop).toHaveLength(1);
    expect(JSON.stringify(stop)).toContain("/b/bin.js");
    expect(moved.changes).toContain("update Stop hook");
  });

  it("stripSettings ignores entries without the marker, even if they look similar", () => {
    const s = { hooks: { Stop: [{ hooks: [{ type: "command", command: "node bin.js" }] }] } };
    expect(stripSettings(s)).toEqual({ next: s, changes: [] });
  });

  it("config.toml repos: add, dedupe, remove, keep other lines", () => {
    const base = 'proof_gate = "warn"\n';
    const a = addRepoToConfig(base, "/w/one");
    expect(a.text).toBe("proof_gate = \"warn\"\nrepos = ['/w/one']\n");
    expect(addRepoToConfig(a.text, "/w/one").changed).toBe(false);
    const b = addRepoToConfig(a.text, "/w/two");
    expect(b.text).toContain("['/w/one', '/w/two']");
    expect(removeRepoFromConfig(b.text, "/w/one").text).toContain("repos = ['/w/two']");
    expect(removeRepoFromConfig(b.text, "/w/zzz").changed).toBe(false);
    expect(() => addRepoToConfig("", "/w/o'brien")).toThrow("single quote");
  });
});

describe("vantage doctor", () => {
  it("fails on a machine with no hooks, with a fix hint, and exits non-zero", async () => {
    expect(await cli(["doctor"])).toBe(1);
    const text = out.join("\n");
    expect(text).toContain("FAIL");
    expect(text).toContain("fix: Run `vantage add");
  });

  it("passes hooks after add; a daemon that is not running is a warning, not a failure", async () => {
    await cli(["add", "--yes"]);
    out = [];
    expect(await cli(["doctor"])).toBe(0);
    expect(status("hooks")).toBe("pass");
    expect(status("spool")).toBe("pass");
    expect(status("daemon")).toBe("warn");
    expect(status("sources")).toBe("pass");
    expect(out.join("\n")).toContain("OK with");
  });

  it("fails when a registered hook file no longer exists", async () => {
    await cli(["add", "--yes"]);
    rmSync(p("hooks", "bin.js"));
    expect(status("hooks")).toBe("fail");
    expect(await cli(["doctor"])).toBe(1);
  });

  it("fails when the spool is not writable", async () => {
    mkdirSync(p("vh"), { recursive: true });
    writeFileSync(p("vh", "spool"), "a file where the directory should be");
    expect(status("spool")).toBe("fail");
  });

  it("reads health, status file and database when the daemon has been running", async () => {
    await cli(["add", "--yes"]);
    const now = new Date();
    writeFileSync(
      p("vh", "health.json"),
      JSON.stringify({
        pid: process.pid,
        port: 4317,
        startedAt: now.toISOString(),
        updatedAt: now.toISOString(),
        state: "running",
        lastIngestAt: null,
        lastStagePassAt: null,
        errors: 0,
        repos: 1,
      }),
    );
    writeFileSync(
      p("vh", "status.json"),
      JSON.stringify({ v: 1, writtenAt: now.toISOString(), needsYou: 0, pings: 0, sessions: {} }),
    );
    new Store(p("vh", "vantage.db")).close();
    expect(status("daemon")).toBe("pass");
    expect(status("status file")).toBe("pass");
    expect(status("database")).toBe("pass");
    expect(await cli(["doctor"])).toBe(0);
    expect(out.join("\n")).toContain("All checks pass.");
  });

  it("flags a stale health file and a corrupt database", () => {
    mkdirSync(p("vh"), { recursive: true });
    const old = new Date(Date.now() - 10 * 60_000).toISOString();
    writeFileSync(
      p("vh", "health.json"),
      JSON.stringify({
        pid: process.pid,
        port: 4317,
        startedAt: old,
        updatedAt: old,
        state: "running",
        lastIngestAt: null,
        lastStagePassAt: null,
        errors: 0,
        repos: 0,
      }),
    );
    writeFileSync(p("vh", "vantage.db"), "not a database");
    expect(status("daemon")).toBe("warn");
    expect(status("database")).toBe("fail");
  });
});

const EXE = process.platform === "win32" ? ".exe" : "";
const fwdp = (x: string): string => x.replaceAll("\\", "/");
const fakePackageBin = (): string => {
  const dir = p("npm", "@vantage", `hook-${process.platform}-${process.arch}`, "bin");
  mkdirSync(dir, { recursive: true });
  const f = join(dir, `vantage-hook${EXE}`);
  writeFileSync(f, "fake binary");
  return fwdp(f);
};
const fakeLocalBin = (): string => {
  mkdirSync(p("cargo"), { recursive: true });
  const f = p("cargo", `vantage-hook${EXE}`);
  writeFileSync(f, "fake binary");
  return fwdp(f);
};
const hookCommand = (): string =>
  String(firstHook(asRec(readSettings()["hooks"]), "SessionStart")["command"]);

describe("native hook resolution (D72, D76)", () => {
  it("uses node when there is no package and no local build", () => {
    const c = resolveHookCommands(env);
    expect(c.kind).toBe("node-js");
    expect(c.hook).toBe(`node "${fwdp(p("hooks", "bin.js"))}" ${MANAGED}`);
    expect(c.reason).toContain("no native binary");
    expect(findNativeBinary(env)).toBeNull();
  });

  it("prefers a local build over node", () => {
    const bin = fakeLocalBin();
    const c = resolveHookCommands(env);
    expect(c.kind).toBe("native-local");
    expect(c.hook).toBe(`"${bin}" "${fwdp(p("hooks", "bin.js"))}" ${MANAGED}`);
    expect(c.files).toContain(bin);
  });

  it("prefers the package over a local build", () => {
    fakeLocalBin();
    const pkg = fakePackageBin();
    const c = resolveHookCommands(env);
    expect(c.kind).toBe("native-package");
    expect(c.hook.startsWith(`"${pkg}" `)).toBe(true);
  });

  it("native command: Node entry is the first non-flag argument and the marker is last", () => {
    fakePackageBin();
    const quoted = [...resolveHookCommands(env).hook.matchAll(/"([^"]+)"/g)].map((m) => m[1]);
    expect(quoted).toHaveLength(2);
    expect(quoted[1]).toMatch(/bin\.js$/);
    expect(resolveHookCommands(env).hook.endsWith(` ${MANAGED}`)).toBe(true);
  });

  it("keeps the status line on node", () => {
    fakePackageBin();
    expect(resolveHookCommands(env).statusLine.startsWith("node ")).toBe(true);
  });

  it("handles Windows-style backslash paths by writing forward slashes", () => {
    const bin = fakeLocalBin();
    expect(bin).not.toContain("\\");
    expect(resolveHookCommands(env).hook).not.toContain("\\");
  });

  it("add --dry-run says which hook it would register and why", async () => {
    fakeLocalBin();
    expect(await cli(["add", "--dry-run"])).toBe(0);
    expect(out.join("\n")).toContain("Hook: native binary built in this checkout");
    out = [];
    rmSync(p("cargo"), { recursive: true });
    expect(await cli(["add", "--dry-run"])).toBe(0);
    expect(out.join("\n")).toContain("Hook: no native binary found");
  });

  it("add updates the managed hooks in place: node to native and back", async () => {
    expect(await cli(["add", "--yes"])).toBe(0);
    expect(hookCommand().startsWith("node ")).toBe(true);
    const bin = fakeLocalBin();
    out = [];
    expect(await cli(["add", "--yes"])).toBe(0);
    expect(hookCommand().startsWith(`"${bin}" `)).toBe(true);
    for (const e of HOOK_EVENTS) expect(asList(asRec(readSettings()["hooks"])[e])).toHaveLength(1);
    rmSync(p("cargo"), { recursive: true });
    expect(await cli(["add", "--yes"])).toBe(0);
    expect(hookCommand().startsWith("node ")).toBe(true);
    for (const e of HOOK_EVENTS) expect(asList(asRec(readSettings()["hooks"])[e])).toHaveLength(1);
  });

  it("re-running add with the same native binary changes nothing", async () => {
    fakeLocalBin();
    expect(await cli(["add", "--yes"])).toBe(0);
    out = [];
    expect(await cli(["add", "--yes"])).toBe(0);
    expect(out.join("\n")).toContain("Already installed");
  });
});

const hooksCheck = () => runChecks(env).find((c) => c.name === "hooks");
const nativeCheck = () => runChecks(env).find((c) => c.name === "native hook");

describe("vantage doctor and the native hook", () => {
  it("none: reports hooks missing and no native warning", () => {
    expect(hooksCheck()?.status).toBe("fail");
    expect(nativeCheck()).toBeUndefined();
  });

  it("node registered, no native available: passes with no warning", async () => {
    await cli(["add", "--yes"]);
    expect(hooksCheck()?.detail).toContain("node hook");
    expect(nativeCheck()).toBeUndefined();
  });

  it("node registered while a native binary is available: warns, with the one-line fix", async () => {
    await cli(["add", "--yes"]);
    fakeLocalBin();
    expect(hooksCheck()?.status).toBe("pass");
    const w = nativeCheck();
    expect(w?.status).toBe("warn");
    expect(w?.fix).toContain("vantage add --yes");
    out = [];
    await cli(["doctor"]);
    expect(out.join("\n")).toContain("fix: Run `vantage add --yes`");
  });

  it("native registered: passes, no warning", async () => {
    fakeLocalBin();
    await cli(["add", "--yes"]);
    expect(hooksCheck()?.detail).toContain("native hook");
    expect(hooksCheck()?.status).toBe("pass");
    expect(nativeCheck()).toBeUndefined();
  });

  it("fails when the registered native binary is gone", async () => {
    fakeLocalBin();
    await cli(["add", "--yes"]);
    rmSync(p("cargo"), { recursive: true });
    expect(hooksCheck()?.status).toBe("fail");
    expect(hooksCheck()?.detail).toContain("vantage-hook");
  });

  it("fails when the Node entry of a native hook is gone", async () => {
    fakeLocalBin();
    await cli(["add", "--yes"]);
    rmSync(p("hooks", "bin.js"));
    expect(hooksCheck()?.status).toBe("fail");
    expect(hooksCheck()?.detail).toContain("bin.js");
  });
});
