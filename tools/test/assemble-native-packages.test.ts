import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
// @ts-expect-error plain JS module without types
import { TARGETS, assemble, manifest, optionalDependencies } from "../assemble-native-packages.mjs";

let dir = "";
afterEach(() => rmSync(dir, { recursive: true, force: true }));

describe("native package assembly", () => {
  it("covers the five D72 targets with os and cpu fields", () => {
    expect(Object.keys(TARGETS)).toEqual([
      "win32-x64",
      "darwin-arm64",
      "darwin-x64",
      "linux-x64",
      "linux-arm64",
    ]);
    expect(manifest("win32-x64", "1.2.3")).toMatchObject({
      name: "@vantage/hook-win32-x64",
      os: ["win32"],
      cpu: ["x64"],
      bin: { "vantage-hook": "bin/vantage-hook.exe" },
    });
    expect(manifest("linux-arm64", "1.2.3").os).toEqual(["linux"]);
  });

  it("pins every target in optionalDependencies to the same version", () => {
    const deps = optionalDependencies("1.2.3") as Record<string, string>;
    expect(Object.keys(deps)).toHaveLength(5);
    expect(new Set(Object.values(deps))).toEqual(new Set(["1.2.3"]));
  });

  it("writes a package per target and refuses a missing binary or bad version", () => {
    dir = mkdtempSync(join(tmpdir(), "vantage-assemble-"));
    const bin = join(dir, "fake");
    writeFileSync(bin, "x");
    const all = Object.fromEntries(Object.keys(TARGETS).map((t) => [t, bin]));
    const dirs = assemble("0.0.1", join(dir, "out"), all);
    expect(dirs).toHaveLength(5);
    const m: { version: string } = JSON.parse(readFileSync(join(dirs[0], "package.json"), "utf8"));
    expect(m.version).toBe("0.0.1");
    expect(() => assemble("0.0.1", join(dir, "o2"), { "linux-x64": bin })).toThrow(/missing binary/);
    expect(() => assemble("latest", join(dir, "o3"), all)).toThrow(/bad version/);
  });
});
