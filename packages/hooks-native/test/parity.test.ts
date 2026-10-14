// Parity between the Node hook (packages/hooks, D67) and the native hook (D72, D76).
// Needs a Rust toolchain: the binary is built once with cargo. Without cargo the suite is skipped with
// a message (so `pnpm check` stays green on machines without Rust); set VANTAGE_REQUIRE_NATIVE=1 in CI
// jobs that install Rust, and a missing toolchain fails instead of skipping.
import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const crate = fileURLToPath(new URL("..", import.meta.url));
const nodeBin = fileURLToPath(new URL("../../hooks/dist/src/bin.js", import.meta.url));
const exe = process.platform === "win32" ? ".exe" : "";
const nativeBin = process.env["VANTAGE_NATIVE_BIN"] || join(crate, "target", "release", `vantage-hook${exe}`);

const hasCargo = spawnSync("cargo", ["--version"], { encoding: "utf8" }).status === 0;
const required = process.env["VANTAGE_REQUIRE_NATIVE"] === "1";
const usable = hasCargo || existsSync(nativeBin);
if (!usable) {
  const msg =
    "native hook parity tests SKIPPED: no cargo on PATH and no prebuilt binary (set VANTAGE_NATIVE_BIN)";
  if (required) throw new Error(msg);
  console.warn(msg);
}

const mask = (s: string) => s.replace(/"receivedAt":"[^"]+"/, '"receivedAt":"T"');
const T = { timeout: 120_000 };
const roots: string[] = [];
const fresh = () => {
  const dir = mkdtempSync(join(tmpdir(), "vantage-parity-"));
  roots.push(dir);
  return dir;
};
const run = (cmd: string, args: string[], input: string, env: Record<string, string>) =>
  spawnSync(cmd, args, { input, env: { ...process.env, ...env }, encoding: "utf8" });
const node = (input: string, env: Record<string, string>) => run(process.execPath, [nodeBin], input, env);
const native = (input: string, env: Record<string, string>, args: string[] = []) =>
  run(nativeBin, args, input, env);
const spoolLines = (home: string) => {
  const dir = join(home, "spool");
  return readdirSync(dir).flatMap((f) =>
    readFileSync(join(dir, f), "utf8")
      .trimEnd()
      .split("\n")
      .map((line) => ({ file: f, line })),
  );
};

afterAll(() => roots.forEach((d) => rmSync(d, { recursive: true, force: true })));

describe.skipIf(!usable)("native hook parity with the Node hook", () => {
  beforeAll(() => {
    if (!hasCargo) return;
    const r = spawnSync("cargo", ["build", "--release", "--locked"], { cwd: crate, encoding: "utf8" });
    if (r.status !== 0) throw new Error(`cargo build failed:\n${r.stderr}`);
  }, 300_000);

  // Key order is deliberately not alphabetical; without serde_json's `preserve_order` the native line
  // would sort keys and this test fails.
  const payload = JSON.stringify({
    hook_event_name: "PostToolUse",
    session_id: "synthetic-1",
    tool_name: "Edit",
    tool_input: {
      file_path: "a.txt",
      old_string: "zeta",
      new_string: String.raw`alpha é "quoted" back\slash /`,
    },
    z_last: [3, { b: 1, a: 2 }, null, true, 0.5],
    a_first: "x\ny",
  });

  it("writes the same {v, receivedAt, hook} line in the same day file", T, () => {
    const a = fresh();
    const b = fresh();
    expect(node(payload, { VANTAGE_HOME: a }).status).toBe(0);
    expect(native(payload, { VANTAGE_HOME: b }).status).toBe(0);
    const n = spoolLines(a)[0];
    const r = spoolLines(b)[0];
    expect(r.file).toBe(n.file);
    expect(r.file).toMatch(/^\d{4}-\d\d-\d\d\.jsonl$/);
    const parsed: { receivedAt: string } = JSON.parse(r.line);
    expect(Object.keys(parsed)).toEqual(["v", "receivedAt", "hook"]);
    expect(parsed.receivedAt).toMatch(/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/);
    // Byte-identical once the timestamp is masked: same key order, escaping and separators.
    expect(mask(r.line)).toBe(mask(n.line));
    expect(r.line.indexOf('"z_last"')).toBeLessThan(r.line.indexOf('"a_first"'));
  });

  it("exits 0 and writes nothing for input that is not a JSON object", T, () => {
    for (const input of ["not json", "[1]", "null", '"s"', ""]) {
      const home = fresh();
      expect(node(input, { VANTAGE_HOME: home }).status).toBe(0);
      expect(native(input, { VANTAGE_HOME: home }).status).toBe(0);
      expect(existsSync(join(home, "spool"))).toBe(false);
    }
  });

  it("exits 0 with the daemon down (no daemon is ever contacted) and with an unwritable spool", T, () => {
    const home = fresh();
    // A file where the spool directory should be: create_dir_all and open both fail.
    const blocker = join(home, "blocked");
    writeFileSync(blocker, "x");
    const env = { VANTAGE_HOME: join(blocker, "nested") };
    expect(node(payload, env).status).toBe(0);
    expect(native(payload, env).status).toBe(0);
    expect(readFileSync(blocker, "utf8")).toBe("x");
  });

  describe("Stop (D76)", () => {
    const stop = JSON.stringify({ hook_event_name: "Stop", session_id: "synthetic-1", cwd: "." });

    it(
      "hands off to the Node entry once: one spool line, exit 0, nothing on stdout without a store",
      T,
      () => {
        const home = fresh();
        const r = native(stop, { VANTAGE_HOME: home }, [nodeBin]);
        expect(r.status).toBe(0);
        expect(spoolLines(home)).toHaveLength(1);
        expect(r.stdout).toBe("");
      },
    );

    it("spools natively and fails open when no Node entry is given or it is missing", T, () => {
      for (const args of [[], [join(fresh(), "missing.js")]]) {
        const home = fresh();
        expect(native(stop, { VANTAGE_HOME: home }, args).status).toBe(0);
        expect(spoolLines(home)).toHaveLength(1);
      }
    });
  });
});
