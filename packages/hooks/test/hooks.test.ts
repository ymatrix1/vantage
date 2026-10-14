import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it } from "vitest";
import { collect } from "../src/collect.ts";
import { SPOOL_HOOK_EVENTS, hooksSettings, statusLineSettings } from "../src/settings.ts";
import { statusLine } from "../src/statusline.ts";

// The registered hook command runs the built JS (D67); `pnpm test` builds first, so dist exists.
const bin = fileURLToPath(new URL("../dist/src/bin.js", import.meta.url));
let home = "";
afterEach(() => rmSync(home, { recursive: true, force: true }));

const run = (input: string, env: Record<string, string>) => {
  const t0 = performance.now();
  const r = spawnSync(process.execPath, [bin], {
    input,
    env: { ...process.env, ...env },
    encoding: "utf8",
  });
  return { status: r.status, ms: performance.now() - t0 };
};

describe("collector", () => {
  it("appends one wrapped line per hook", () => {
    home = mkdtempSync(join(tmpdir(), "vantage-hooks-"));
    const at = new Date("2026-10-10T10:00:00Z");
    expect(collect('{"hook_event_name":"SessionStart","session_id":"s-1"}', home, at)).toBe(true);
    expect(collect("not json", home)).toBe(false);
    expect(readdirSync(home)).toEqual(["2026-10-10.jsonl"]);
    const text = readFileSync(join(home, "2026-10-10.jsonl"), "utf8");
    expect(text.trim().split("\n")).toHaveLength(1);
    expect(JSON.parse(text)).toMatchObject({ v: 1, hook: { session_id: "s-1" } });
  });

  it("appends in well under the 100 ms hook budget (in-process; node start-up is not ours to cut)", () => {
    home = mkdtempSync(join(tmpdir(), "vantage-hooks-"));
    const payload = JSON.stringify({ hook_event_name: "PostToolUse", session_id: "s-1" });
    collect(payload, home); // first call creates the directory
    const t0 = performance.now();
    for (let i = 0; i < 10; i++) collect(payload, home);
    expect((performance.now() - t0) / 10).toBeLessThan(100);
  });

  it("exits 0 and writes the spool when no daemon is running", () => {
    home = mkdtempSync(join(tmpdir(), "vantage-hooks-"));
    const { status } = run('{"hook_event_name":"PostToolUse","session_id":"s-1"}', {
      VANTAGE_HOME: home,
    });
    expect(status).toBe(0);
    expect(readdirSync(join(home, "spool"))).toHaveLength(1);
  });

  it("real command writes the spool line and exits 0 with the daemon down (cold start under a CI ceiling)", () => {
    home = mkdtempSync(join(tmpdir(), "vantage-hooks-"));
    const payload = '{"hook_event_name":"PostToolUse","session_id":"s-2"}';
    run(payload, { VANTAGE_HOME: home }); // warm the disk cache
    const times: number[] = [];
    for (let i = 0; i < 5; i++) {
      const r = run(payload, { VANTAGE_HOME: home });
      expect(r.status).toBe(0);
      times.push(r.ms);
    }
    const [file] = readdirSync(join(home, "spool"));
    const lines = readFileSync(join(home, "spool", file ?? ""), "utf8")
      .trim()
      .split("\n");
    expect(lines).toHaveLength(6);
    expect(JSON.parse(lines[0] ?? "")).toMatchObject({ v: 1, hook: { session_id: "s-2" } });
    // CI ceiling only (shared Windows and Ubuntu runners are slow and noisy). The 100 ms budget
    // is measured locally, see docs/specs/ingestion.md "Hook latency".
    times.sort((a, b) => a - b);
    expect(times[2]).toBeLessThan(750);
  });

  it("exits 0 on garbage input and on an unwritable spool", () => {
    home = mkdtempSync(join(tmpdir(), "vantage-hooks-"));
    expect(run("garbage", { VANTAGE_HOME: home }).status).toBe(0);
    const file = join(home, "a-file");
    writeFileSync(file, "x");
    expect(run("{}", { VANTAGE_HOME: join(file, "sub") }).status).toBe(0);
  });
});

describe("settings", () => {
  it("registers every spool event as async", () => {
    const s = hooksSettings("node bin.ts");
    expect(Object.keys(s)).toEqual([...SPOOL_HOOK_EVENTS]);
    for (const entries of Object.values(s)) {
      expect(entries[0]?.hooks[0]).toMatchObject({ async: true });
    }
  });
});

const summary = (writtenAt: string) =>
  JSON.stringify({
    v: 1,
    writtenAt,
    needsYou: 2,
    pings: 0,
    sessions: {
      s1: {
        stage: "built",
        proofStatus: "none",
        proofLevel: 0,
        docsOnly: false,
        repo: "billing-api",
        title: "Checkout fixes",
        flags: [],
      },
    },
  });

describe("status line command", () => {
  const statusBin = fileURLToPath(new URL("../dist/src/statusline-bin.js", import.meta.url));
  const runStatus = (input: string, env: Record<string, string>) => {
    const t0 = performance.now();
    const r = spawnSync(process.execPath, [statusBin], {
      input,
      env: { ...process.env, NO_COLOR: "1", ...env },
      encoding: "utf8",
    });
    return { status: r.status, out: r.stdout, ms: performance.now() - t0 };
  };

  it("registers the command with a 30 s refresh", () => {
    expect(statusLineSettings("node statusline-bin.js")).toEqual({
      statusLine: { type: "command", command: "node statusline-bin.js", refreshInterval: 30 },
    });
  });

  it("prints the session's line from the summary file, using COLUMNS", () => {
    home = mkdtempSync(join(tmpdir(), "vantage-status-"));
    writeFileSync(join(home, "status.json"), summary(new Date().toISOString()));
    const env = { VANTAGE_HOME: home, COLUMNS: "80" };
    const r = runStatus('{"session_id":"s1"}', env);
    expect(r.status).toBe(0);
    expect(r.out).toBe("vantage · billing-api · ●●◐○○○ Checkout fixes · 2 need you\n");
    expect(runStatus('{"session_id":"s1"}', { ...env, COLUMNS: "40" }).out).toBe(
      "vantage · billing-api · 2 need you\n",
    );
  });

  it("prints a calm line and exits 0 with the daemon down, on garbage input, and on a stale file", () => {
    home = mkdtempSync(join(tmpdir(), "vantage-status-"));
    const r = runStatus("garbage", { VANTAGE_HOME: home });
    expect(r.status).toBe(0);
    expect(r.out).toBe("vantage · offline\n");
    writeFileSync(join(home, "status.json"), "{ half a file");
    expect(runStatus("{}", { VANTAGE_HOME: home }).out).toBe("vantage · offline\n");
    writeFileSync(join(home, "status.json"), summary("2020-01-01T00:00:00Z"));
    expect(runStatus('{"session_id":"s1"}', { VANTAGE_HOME: home }).out).toBe("vantage · stale\n");
  });

  it("falls back to the stdin repo name for an unknown session", () => {
    home = mkdtempSync(join(tmpdir(), "vantage-status-"));
    writeFileSync(join(home, "status.json"), summary(new Date().toISOString()));
    const out = statusLine('{"session_id":"x","workspace":{"repo":{"name":"web"}}}', {
      VANTAGE_HOME: home,
      NO_COLOR: "1",
    });
    expect(out).toBe("vantage · web · 2 need you");
  });

  it("renders in well under 100 ms in process, and under a CI ceiling as a real command", () => {
    home = mkdtempSync(join(tmpdir(), "vantage-status-"));
    writeFileSync(join(home, "status.json"), summary(new Date().toISOString()));
    const env = { VANTAGE_HOME: home, NO_COLOR: "1" };
    statusLine('{"session_id":"s1"}', env);
    const t0 = performance.now();
    for (let i = 0; i < 20; i++) statusLine('{"session_id":"s1"}', env);
    expect((performance.now() - t0) / 20).toBeLessThan(10);
    runStatus('{"session_id":"s1"}', { VANTAGE_HOME: home }); // warm the disk cache
    const times = [1, 2, 3, 4, 5].map(() => runStatus('{"session_id":"s1"}', { VANTAGE_HOME: home }).ms);
    times.sort((a, b) => a - b);
    // CI ceiling only; the warm local figure is recorded in docs/specs/status-line.md.
    expect(times[2]).toBeLessThan(750);
  });
});
