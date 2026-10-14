// Interleaved cold-start benchmark: 3 warm-ups, then N rounds, each round runs every launcher once.
import { spawnSync, execFileSync } from "node:child_process";
import { mkdtempSync, statSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "../..");
const exe = process.platform === "win32" ? ".exe" : "";
const home = mkdtempSync(join(tmpdir(), "vantage-bench-"));
const goBin = join(here, "go", `hook${exe}`);
const rustBin = join(here, "rust", "target", "release", `spike-hook${exe}`);
execFileSync("go", ["build", "-ldflags=-s -w", "-o", goBin, "."], {
  cwd: join(here, "go"),
  stdio: "inherit",
});
execFileSync("cargo", ["build", "--release"], { cwd: join(here, "rust"), stdio: "inherit" });

const launchers = {
  "node -e ''": ["node", ["-e", ""]],
  "node dist/src/bin.js": ["node", [join(root, "packages/hooks/dist/src/bin.js")]],
  go: [goBin, []],
  rust: [rustBin, []],
};
const payload = JSON.stringify({
  hook_event_name: "PostToolUse",
  session_id: "synthetic",
  tool_name: "Edit",
  tool_input: { file_path: "a.txt" },
});
const N = 40;
const times = Object.fromEntries(Object.keys(launchers).map((k) => [k, []]));
for (let i = -3; i < N; i++) {
  for (const [name, [cmd, args]] of Object.entries(launchers)) {
    const t = process.hrtime.bigint();
    const r = spawnSync(cmd, args, { input: payload, env: { ...process.env, VANTAGE_HOME: home } });
    const ms = Number(process.hrtime.bigint() - t) / 1e6;
    if (r.status !== 0) throw new Error(`${name} exited ${r.status}`);
    if (i >= 0) times[name].push(ms);
  }
}
const q = (a, p) => a.toSorted((x, y) => x - y)[Math.min(a.length - 1, Math.ceil(p * a.length) - 1)];
const size = { go: statSync(goBin).size, rust: statSync(rustBin).size };
for (const [k, v] of Object.entries(times))
  console.log(
    `${k.padEnd(22)} median ${q(v, 0.5).toFixed(1)} ms  p95 ${q(v, 0.95).toFixed(1)} ms  min ${Math.min(...v).toFixed(1)}  max ${Math.max(...v).toFixed(1)}`,
  );
console.log(`size go ${(size.go / 1e6).toFixed(2)} MB, rust ${(size.rust / 1e6).toFixed(2)} MB`);
// Behavior check: every spooled line parses and has the contract shape; bad input exits 0.
const lines = readFileSync(join(home, "spool", new Date().toISOString().slice(0, 10) + ".jsonl"), "utf8")
  .trim()
  .split("\n");
const ok = lines.every((l) => {
  const o = JSON.parse(l);
  return o.v === 1 && /^\d{4}-\d\d-\d\dT[\d:.]+Z$/.test(o.receivedAt) && o.hook.tool_name === "Edit";
});
console.log(`spool lines ${lines.length} (expect ${4 * (N + 3) - (N + 3)}), shape ok: ${ok}`);
for (const [name, [cmd, args]] of Object.entries(launchers)) {
  const bad = ["not json", "[1]", ""].map(
    (input) => spawnSync(cmd, args, { input, env: { ...process.env, VANTAGE_HOME: home } }).status,
  );
  const noDir = spawnSync(cmd, args, {
    input: payload,
    env: { ...process.env, VANTAGE_HOME: join(home, "spool", "x.jsonl", "nope") },
  }).status;
  console.log(`${name.padEnd(22)} bad-input exits ${bad.join(",")} unwritable-dir exit ${noDir}`);
}
