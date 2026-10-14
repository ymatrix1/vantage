// Synthetic: temp directories only. `--version` and the doctor version row (vantage-a6hi).
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { runCli, type CliIo } from "../src/cli.ts";
import { runChecks } from "../src/doctor.ts";
import { formatVersion, readVersionInfo } from "../src/version.ts";

let dir = "";
beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "vantage-version-"));
});
afterEach(() => rmSync(dir, { recursive: true, force: true }));

const withSlash = (d: string): string => `${d}/`;

describe("readVersionInfo", () => {
  it("reads the stamped version and shortens the commit in a release build", () => {
    writeFileSync(
      join(dir, "build-info.json"),
      JSON.stringify({ version: "1.2.3", commit: "0123456789abcdef0123456789abcdef01234567" }),
    );
    expect(readVersionInfo({}, withSlash(dir))).toEqual({ version: "1.2.3", commit: "0123456" });
    expect(formatVersion(readVersionInfo({}, withSlash(dir)))).toBe("vantage 1.2.3 (0123456)");
  });

  it("omits the commit when the build did not record one", () => {
    writeFileSync(join(dir, "build-info.json"), JSON.stringify({ version: "1.2.3" }));
    expect(formatVersion(readVersionInfo({}, withSlash(dir)))).toBe("vantage 1.2.3");
  });

  it("falls back to the checkout: package.json version marked -dev and the sha from the environment", () => {
    writeFileSync(join(dir, "package.json"), JSON.stringify({ version: "0.0.0" }));
    const info = readVersionInfo({ VANTAGE_GIT_SHA: "abcdef1234567" }, withSlash(dir));
    expect(info).toEqual({ version: "0.0.0-dev", commit: "abcdef1" });
  });

  it("ignores a broken build-info.json and still answers", () => {
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, "build-info.json"), "{not json");
    expect(readVersionInfo({ VANTAGE_GIT_SHA: "" }, withSlash(dir)).version).toBe("0.0.0-dev");
  });
});

async function run(arg: string): Promise<{ code: number; out: string[] }> {
  const out: string[] = [];
  const io: CliIo = { out: (l) => out.push(l), err: () => undefined, env: { VANTAGE_GIT_SHA: "abcdef1" } };
  return { code: await runCli([arg], io), out };
}

describe("vantage --version", () => {
  it.each(["--version", "-v", "version"])("prints the version and exits 0 for %s", async (arg) => {
    const { code, out } = await run(arg);
    expect(code).toBe(0);
    expect(out).toHaveLength(1);
    expect(out[0]).toMatch(/^vantage \d+\.\d+\.\d+(-dev)?( \([0-9a-f]{7}\))?$/);
  });

  it("doctor reports the installed version first", () => {
    const home = join(dir, "home");
    mkdirSync(home, { recursive: true });
    const first = runChecks({
      VANTAGE_HOME: join(dir, "vh"),
      HOME: home,
      USERPROFILE: home,
      CLAUDE_CONFIG_DIR: join(dir, "cc"),
    })[0];
    expect(first?.name).toBe("version");
    expect(first?.status).toBe("pass");
    expect(first?.detail).toMatch(/^vantage \d+\.\d+\.\d+/);
  });
});
