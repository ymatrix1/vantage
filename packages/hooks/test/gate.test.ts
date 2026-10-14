// Synthetic events only.
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { VantageEvent } from "@vantage/core";
import { Store, runStagePass } from "@vantage/daemon";
import { decideGate, gateMode, renderGate, runGate } from "../src/gate.ts";

const bin = fileURLToPath(new URL("../dist/src/bin.js", import.meta.url));
const NOW = new Date("2026-01-05T11:00:00Z");
let home = "";
let store: Store;
let n = 0;

beforeEach(() => {
  home = mkdtempSync(join(tmpdir(), "vantage-gate-"));
  store = new Store(join(home, "vantage.db"));
});
afterEach(() => {
  store.close();
  rmSync(home, { recursive: true, force: true });
});

const put = (kind: VantageEvent["kind"], m: number, payload: Record<string, unknown>): void => {
  store.insertEvent(
    {
      sourceId: `g${++n}`,
      source: "claude_code",
      kind,
      timestamp: `2026-01-05T09:${String(m).padStart(2, "0")}:00Z`,
      sessionId: "s1",
      payload: { branch: "feat/ftk-1-demo", ...payload },
    },
    "2026-01-05T10:00:00Z",
  );
};
const edit = (m: number, path = "/w/billing.ts"): void => put("file.edited", m, { path });
const cmd = (m: number, command: string, ok = true): void => put("command.ran", m, { command, ok });
const stopInput = (extra: object = {}): string =>
  JSON.stringify({ hook_event_name: "Stop", session_id: "s1", ...extra });
const decide = async (extra: object = {}, mode: "off" | "warn" | "block" = "warn") => {
  runStagePass(store, {}, NOW);
  return decideGate(stopInput(extra), join(home, "vantage.db"), mode);
};

describe("gate decisions", () => {
  it("warns, naming the files and the missing proof, when edits have no check", async () => {
    edit(1);
    edit(2, "/w/tax.ts");
    const d = await decide();
    expect(d.kind).toBe("warn");
    if (d.kind === "silent") return;
    expect(d.message).toContain("`billing.ts`, `tax.ts`");
    expect(d.message).toContain("No test or data check has run since.");
  });

  it("is silent when a passing check ran after the last edit", async () => {
    edit(1);
    cmd(2, "pnpm vitest run");
    expect((await decide()).kind).toBe("silent");
  });

  it("is silent for a docs-only session (D53)", async () => {
    edit(1, "/w/README.md");
    edit(2, "/w/docs/guide.rst");
    expect((await decide()).kind).toBe("silent");
  });

  it("ignores doc files in the message when code changed too", async () => {
    edit(1, "/w/README.md");
    edit(2);
    const d = await decide();
    expect(d.kind === "warn" && d.message).toContain("`billing.ts`");
    expect(d.kind === "warn" && d.message).not.toContain("README");
  });

  it("warns when proof expired by a later edit", async () => {
    edit(1);
    cmd(2, "pnpm vitest run");
    edit(3);
    const d = await decide();
    expect(d.kind === "warn" && d.message).toContain("ran before your latest edit");
  });

  it("warns when the last check failed", async () => {
    edit(1);
    cmd(2, "pnpm vitest run", false);
    const d = await decide();
    expect(d.kind === "warn" && d.message).toContain("The last check failed.");
  });

  it("warns when the check cannot count", async () => {
    edit(1);
    cmd(2, "pnpm vitest run || true");
    const d = await decide();
    expect(d.kind === "warn" && d.message).toContain("cannot count");
  });

  it("is silent for a session with no edits, an unknown session and mode off", async () => {
    put("session.started", 1, {});
    expect((await decide()).kind).toBe("silent");
    edit(2);
    runStagePass(store, {}, NOW);
    const db = join(home, "vantage.db");
    expect((await decideGate(stopInput({ session_id: "other" }), db, "warn")).kind).toBe("silent");
    expect((await decideGate(stopInput(), db, "off")).kind).toBe("silent");
  });

  it("is silent when the daemon store does not exist or is not a database", async () => {
    const missing = join(home, "nope", "vantage.db");
    expect((await decideGate(stopInput(), missing, "warn")).kind).toBe("silent");
    const junk = mkdtempSync(join(tmpdir(), "vantage-junk-"));
    writeFileSync(join(junk, "vantage.db"), "not sqlite");
    await expect(runGate(stopInput(), junk)).resolves.toEqual({ exitCode: 0, stdout: "" });
    rmSync(junk, { recursive: true, force: true });
    const garbage = await runGate("garbage", home);
    expect(garbage).toEqual({ exitCode: 0, stdout: "" });
  });
});

describe("loop safety (D60)", () => {
  it("fires once, then stays silent when the agent stops again with stop_hook_active", async () => {
    edit(1);
    expect((await decide({ stop_hook_active: false })).kind).toBe("warn");
    for (let i = 0; i < 3; i++) {
      expect((await decide({ stop_hook_active: true })).kind).toBe("silent");
    }
  });

  it("warn output never continues the turn: exit 0, only systemMessage", async () => {
    edit(1);
    const out = renderGate(await decide());
    expect(out.exitCode).toBe(0);
    expect(out.stdout).toMatch(/^\{"systemMessage":"[^"]+"\}$/);
  });

  it("block mode is not wired: it still exits 0 with a systemMessage, never 2", async () => {
    edit(1);
    const d = await decide({}, "block");
    expect(d.kind).toBe("block");
    const out = renderGate(d);
    expect(out.exitCode).toBe(0);
    expect(JSON.parse(out.stdout)).toHaveProperty("systemMessage");
  });
});

describe("mode config", () => {
  it("defaults to warn; env and config.toml override; junk means warn", () => {
    expect(gateMode(home, {})).toBe("warn");
    writeFileSync(join(home, "config.toml"), '# c\nproof_gate = "off"\n');
    expect(gateMode(home, {})).toBe("off");
    expect(gateMode(home, { VANTAGE_GATE_MODE: "block" })).toBe("block");
    writeFileSync(join(home, "config.toml"), 'proof_gate = "strict"\n');
    expect(gateMode(home, {})).toBe("warn");
  });
});

const run = (input: string, env: Record<string, string>) => {
  const t0 = performance.now();
  const r = spawnSync(process.execPath, [bin], {
    input,
    env: { ...process.env, ...env },
    encoding: "utf8",
  });
  return { status: r.status, stdout: r.stdout, ms: performance.now() - t0 };
};

describe("the real command", () => {
  it("with the daemon down: exits 0, says nothing, and still spools session.stopped", () => {
    const empty = mkdtempSync(join(tmpdir(), "vantage-nodaemon-"));
    try {
      const r = run(stopInput({ stop_hook_active: false }), { VANTAGE_HOME: empty });
      expect(r.status).toBe(0);
      expect(r.stdout).toBe("");
      expect(
        readFileSync(join(empty, "spool", readdirSync(join(empty, "spool"))[0] ?? ""), "utf8"),
      ).toContain('"hook_event_name":"Stop"');
      expect(r.ms).toBeLessThan(2000); // CI ceiling; the 100 ms budget is a local measurement
    } finally {
      rmSync(empty, { recursive: true, force: true });
    }
  });

  it("with unproven edits: exits 0 with the systemMessage on stdout", () => {
    edit(1);
    runStagePass(store, {}, NOW);
    const r = run(stopInput(), { VANTAGE_HOME: home });
    expect(r.status).toBe(0);
    expect(JSON.parse(r.stdout)).toMatchObject({ systemMessage: expect.stringContaining("billing.ts") });
    expect(run(stopInput({ stop_hook_active: true }), { VANTAGE_HOME: home }).stdout).toBe("");
    expect(run(stopInput(), { VANTAGE_HOME: home, VANTAGE_GATE_MODE: "off" }).stdout).toBe("");
  });

  it("spool hooks other than Stop stay silent", () => {
    edit(1);
    runStagePass(store, {}, NOW);
    const r = run(JSON.stringify({ hook_event_name: "PostToolUse", session_id: "s1" }), {
      VANTAGE_HOME: home,
    });
    expect(r.status).toBe(0);
    expect(r.stdout).toBe("");
  });
});
