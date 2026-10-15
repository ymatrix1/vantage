// Synthetic package tree: proves the published tarball holds exactly the expected files and nothing else
// (no sources, no tests, no maps, no .env, no fixtures). vantage-a6hi, D98.
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
// @ts-expect-error plain JS module without types
import { BUNDLED, PACKAGE_NAME, assemble, rootManifest, stagedManifest } from "../assemble-main-package.mjs";

let dir = "";
let fake = "";
let out = "";
beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "vantage-main-pkg-"));
  fake = join(dir, "repo");
  out = join(dir, "out");
  const put = (rel: string, text = "x"): void => {
    const f = join(fake, rel);
    mkdirSync(dirname(f), { recursive: true });
    writeFileSync(f, text);
  };
  for (const pkg of BUNDLED) {
    const manifest = {
      name: `@vantage/${pkg}`,
      version: "0.0.0",
      private: true,
      type: "module",
      exports: { ".": { types: "./src/index.ts", default: "./dist/src/index.js" } },
      dependencies: { "@vantage/core": "workspace:*" },
    };
    put(`packages/${pkg}/package.json`, JSON.stringify(manifest));
    put(`packages/${pkg}/src/index.ts`, "source");
    put(`packages/${pkg}/test/fixtures/session.jsonl`, "private");
    put(`packages/${pkg}/.env`, "SECRET=1");
    if (pkg === "daemon") put("packages/daemon/migrations/0001-initial-schema.sql", "-- sql");
    if (pkg === "ui") {
      put("packages/ui/dist/index.html", "<html></html>");
      put("packages/ui/dist/assets/app.js", "js");
    } else {
      put(`packages/${pkg}/dist/src/index.js`, "js");
      put(`packages/${pkg}/dist/src/index.js.map`, "map");
      put(`packages/${pkg}/dist/src/index.d.ts`, "types");
      put(`packages/${pkg}/dist/test/index.test.js`, "compiled test");
      put(`packages/${pkg}/dist/tsconfig.tsbuildinfo`, "{}");
    }
  }
  put("README.md", "readme");
  put("CHANGELOG.md", "changelog");
  put(".env", "TOKEN=nope");
});
afterEach(() => rmSync(dir, { recursive: true, force: true }));

const npmPackFiles = (cwd: string): string[] => {
  const raw = execFileSync("npm", ["pack", "--dry-run", "--json", "--ignore-scripts"], {
    cwd,
    encoding: "utf8",
    shell: process.platform === "win32",
  });
  const parsed: { files: { path: string }[] }[] = JSON.parse(raw);
  return (parsed[0]?.files ?? []).map((f) => f.path).toSorted();
};

describe("main package assembly", () => {
  it("holds exactly the expected files: runtime output, manifests, README and CHANGELOG", () => {
    assemble("1.2.3", out, { root: fake, commit: "0123456789abcdef" });
    const files = npmPackFiles(out);
    expect(files).toEqual(
      [
        "CHANGELOG.md",
        "README.md",
        "package.json",
        "node_modules/@vantage/cli/build-info.json",
        "node_modules/@vantage/cli/dist/src/index.js",
        "node_modules/@vantage/cli/package.json",
        "node_modules/@vantage/core/dist/src/index.js",
        "node_modules/@vantage/core/package.json",
        "node_modules/@vantage/daemon/dist/src/index.js",
        "node_modules/@vantage/daemon/migrations/0001-initial-schema.sql",
        "node_modules/@vantage/daemon/package.json",
        "node_modules/@vantage/hooks/dist/src/index.js",
        "node_modules/@vantage/hooks/package.json",
        "node_modules/@vantage/ui/dist/assets/app.js",
        "node_modules/@vantage/ui/dist/index.html",
        "node_modules/@vantage/ui/package.json",
      ].toSorted(),
    );
    for (const bad of [
      /\.env/,
      /\.map$/,
      /\.d\.ts$/,
      /\.ts$/,
      /test/,
      /fixtures/,
      /tsbuildinfo/,
      /\.jsonl$/,
    ]) {
      expect(files.filter((f) => bad.test(f))).toEqual([]);
    }
  }, 120_000);

  it("stamps the version and the commit for `vantage --version`", () => {
    assemble("1.2.3", out, { root: fake, commit: "0123456789abcdef" });
    const info: unknown = JSON.parse(
      readFileSync(join(out, "node_modules/@vantage/cli/build-info.json"), "utf8"),
    );
    expect(info).toEqual({ version: "1.2.3", commit: "0123456789abcdef" });
  });

  it("rejects a bad version and a tree that was not built", () => {
    expect(() => assemble("1.2", out, { root: fake })).toThrow(/bad version/);
    rmSync(join(fake, "packages/ui/dist"), { recursive: true });
    expect(() => assemble("1.2.3", out, { root: fake })).toThrow(/pnpm build/);
  });
});

describe("main package manifest", () => {
  const m = rootManifest("1.2.3");

  it("installs one bin, bundles the workspace packages and pins the native packages", () => {
    expect(m.name).toBe(PACKAGE_NAME);
    expect(m.bin).toEqual({ vantage: "node_modules/@vantage/cli/dist/src/main.js" });
    expect(m.bundledDependencies).toEqual(BUNDLED.map((p) => `@vantage/${p}`));
    expect(Object.keys(m.optionalDependencies)).toHaveLength(5);
    expect(Object.values(m.optionalDependencies)).toEqual(Array(5).fill("1.2.3"));
    expect(m.engines).toEqual({ node: ">=22.5.0" });
  });

  it("is public, a licence and a repository, and is not private", () => {
    expect(m.private).toBeUndefined();
    expect(m.publishConfig).toEqual({ access: "public" });
    expect(m.license).toBe("UNLICENSED");
    expect(m.repository.url).toBe("https://github.com/ymatrix1/vantage");
  });

  it("strips types conditions from staged manifests", () => {
    const staged = stagedManifest(
      "core",
      { exports: { ".": { types: "./src/a.ts", default: "./dist/src/a.js" }, "./x": "./dist/src/x.js" } },
      "1.2.3",
    );
    expect(staged).toEqual({
      name: "@vantage/core",
      version: "1.2.3",
      type: "module",
      exports: { ".": "./dist/src/a.js", "./x": "./dist/src/x.js" },
    });
  });
});
