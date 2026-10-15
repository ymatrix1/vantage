// Installs a packed Vantage tarball into a temp directory and runs it: `--version`, `doctor`, and `start`
// (checks that the bundled UI is found). Everything lives in temp directories, nothing touches the real home.
// Usage: node tools/smoke-install.mjs <tarball> <expected version>
import { spawn, spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const [tarball, expected] = process.argv.slice(2);
if (!tarball || !expected) {
  console.error("Usage: smoke-install.mjs <tarball> <expected version>");
  process.exit(2);
}

const win = process.platform === "win32";
const root = mkdtempSync(join(tmpdir(), "vantage-smoke-"));
const project = join(root, "project");
const home = join(root, "home");
mkdirSync(project);
mkdirSync(home);
writeFileSync(join(project, "package.json"), '{"name":"smoke","private":true}\n');
const env = {
  ...process.env,
  HOME: home,
  USERPROFILE: home,
  VANTAGE_HOME: join(root, "vantage-home"),
  CLAUDE_CONFIG_DIR: join(root, "claude"),
};

let failed = false;
const check = (ok, what) => {
  console.log(`${ok ? "PASS" : "FAIL"}  ${what}`);
  if (!ok) failed = true;
};

try {
  const install = spawnSync(
    "npm",
    ["install", resolve(tarball), "--omit=optional", "--ignore-scripts", "--no-audit", "--no-fund"],
    { cwd: project, env, encoding: "utf8", shell: win },
  );
  check(
    install.status === 0,
    `npm install of the tarball${install.status === 0 ? "" : `: ${install.stderr}`}`,
  );
  const bin = join(project, "node_modules", ".bin", win ? "vantage.cmd" : "vantage");
  const run = (args) => spawnSync(bin, args, { cwd: project, env, encoding: "utf8", shell: win });

  const version = run(["--version"]);
  check(
    version.status === 0 && version.stdout.startsWith(`vantage ${expected}`),
    `vantage --version -> ${version.stdout.trim()}`,
  );

  // A clean machine has no hooks yet, so doctor may exit 1; it must report the version and not crash.
  const doctor = run(["doctor"]);
  check(
    (doctor.status === 0 || doctor.status === 1) &&
      new RegExp(`version\\s+vantage ${expected.replaceAll(".", "\\.")}`).test(doctor.stdout),
    `vantage doctor reports version ${expected} (exit ${doctor.status})`,
  );

  const start = spawn(bin, ["start", "--port", "0"], { cwd: project, env, shell: win });
  let text = "";
  start.stdout.on("data", (d) => (text += d));
  start.stderr.on("data", (d) => (text += d));
  await new Promise((r) => setTimeout(r, 4000));
  if (win) spawnSync("taskkill", ["/pid", String(start.pid), "/t", "/f"]);
  else start.kill("SIGTERM");
  check(
    /Open the Track page/.test(text) && !/UI is not built/.test(text),
    "vantage start finds the bundled UI",
  );
} finally {
  rmSync(root, { recursive: true, force: true });
}
process.exit(failed ? 1 : 0);
