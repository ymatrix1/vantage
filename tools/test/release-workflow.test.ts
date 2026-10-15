// Static checks on the release workflows and the package names (D93): the publish path has no stored token,
// the trusted-publisher file name is stable, and every action is pinned. Reads files only.
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { NATIVE_SCOPE } from "../../packages/cli/src/install.ts";
// @ts-expect-error plain JS module without types
import { PACKAGE_NAME } from "../assemble-main-package.mjs";
// @ts-expect-error plain JS module without types
import { TARGETS, packageName } from "../assemble-native-packages.mjs";
// @ts-expect-error plain JS module without types
import {
  MAIN_NAME,
  PUBLISH_ENVIRONMENT,
  PUBLISH_WORKFLOW,
  REPOSITORY_URL,
  SCOPE,
  nativeName,
} from "../package-names.mjs";

const root = (rel: string): string => fileURLToPath(new URL(`../../${rel}`, import.meta.url));
const read = (rel: string): string => readFileSync(root(rel), "utf8");
const workflows = [
  ".github/workflows/release.yml",
  ".github/workflows/release-pr.yml",
  ".github/workflows/release-native.yml",
];

/** The text of one top-level job. */
function job(text: string, name: string): string {
  const start = text.indexOf(`\n  ${name}:\n`);
  expect(start).toBeGreaterThan(-1);
  const rest = text.slice(start + 1);
  const next = /\n {2}[a-z][a-z-]*:\n/.exec(rest.slice(rest.indexOf("\n") + 1));
  return next ? rest.slice(0, rest.indexOf("\n") + 1 + next.index) : rest;
}

describe("package names live in one place", () => {
  it("derives every published name from package-names.mjs", () => {
    expect(MAIN_NAME).toBe(`${SCOPE}/vantage`);
    expect(PACKAGE_NAME).toBe(MAIN_NAME);
    for (const t of Object.keys(TARGETS)) expect(packageName(t)).toBe(nativeName(t));
    expect(REPOSITORY_URL).toBe("https://github.com/ymatrix1/vantage");
  });

  it("is the name the installer looks the native package up by", () => {
    expect(NATIVE_SCOPE).toBe(SCOPE);
    const target = `${process.platform}-${process.arch}`;
    expect(nativeName(target)).toBe(`${NATIVE_SCOPE}/vantage-hook-${target}`);
  });
});

describe("release workflows", () => {
  it("keeps the file name a trusted publisher on npmjs.com is configured with", () => {
    expect(PUBLISH_WORKFLOW).toBe("release.yml");
    expect(read(`.github/workflows/${PUBLISH_WORKFLOW}`)).toContain("name: release\n");
  });

  it("publishes without a stored token, by OIDC, in the protected environment", () => {
    const text = read(".github/workflows/release.yml");
    for (const f of workflows) {
      const t = read(f);
      expect(t).not.toMatch(/NPM_TOKEN|NODE_AUTH_TOKEN/);
      expect(t).not.toContain("pull_request_target");
      expect(t).toMatch(/^permissions:\n {2}contents: read\n/m);
    }
    const publish = job(text, "publish-npm");
    expect(publish).toContain(`environment: ${PUBLISH_ENVIRONMENT}`);
    expect(publish).toContain("id-token: write");
    expect(publish).toContain("vars.NPM_PUBLISH_ENABLED == 'true'");
    expect(publish).toContain("npm stage publish");
    expect(publish).not.toMatch(/secrets\./);
  });

  it("gives write permissions only to the jobs that need them", () => {
    const text = read(".github/workflows/release.yml");
    const writers = [
      ...text.matchAll(
        /^ {2}([a-z-]+):\n(?:(?! {2}[a-z-]+:\n)[^\n]*\n)*?\s+permissions:\n((?: {6}[a-z-]+: [a-z]+\n)+)/gm,
      ),
    ];
    const names = writers.filter((m) => /write/.test(m[2] ?? "")).map((m) => m[1]);
    expect(names.toSorted()).toEqual(["github-release", "publish-npm"]);
  });

  it("pins every third-party action by commit SHA", () => {
    for (const f of workflows) {
      for (const m of read(f).matchAll(/^\s+(?:- )?uses: (\S+)/gm)) {
        const ref = m[1] ?? "";
        if (ref.startsWith("./")) continue;
        expect(ref, `${f}: ${ref}`).toMatch(/^[\w.-]+\/[\w./-]+@[0-9a-f]{40}$/);
      }
    }
  });
});
