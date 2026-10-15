// Synthetic commit lists only: release notes, version bumps and changelog edits (vantage-a6hi, D98).
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it } from "vitest";
import {
  bumpFor,
  extractNotes,
  latestTag,
  newerThan,
  nextVersion,
  parseCommit,
  prependEntry,
  renderNotes,
  // @ts-expect-error plain JS module without types
} from "../release.mjs";

interface C {
  type: string;
  scope?: string;
  description: string;
  breaking: boolean;
  breakingNote?: string;
  sha: string;
}
const commits = (subjects: [string, string?][]): C[] =>
  subjects
    .map(([subject, body], i) =>
      parseCommit({ sha: String.fromCharCode(97 + i).repeat(7), subject, body: body ?? "" }),
    )
    .filter((c: C | null): c is C => c !== null);

describe("parseCommit", () => {
  it("reads type, scope, breaking bang and description", () => {
    expect(parseCommit({ subject: "feat(cli)!: drop the old flag" })).toMatchObject({
      type: "feat",
      scope: "cli",
      breaking: true,
      description: "drop the old flag",
    });
    expect(parseCommit({ subject: "fix: handle empty spool" })).toMatchObject({
      type: "fix",
      breaking: false,
    });
  });

  it("reads a BREAKING CHANGE footer", () => {
    const c = parseCommit({
      subject: "refactor(core): rename events",
      body: "x\n\nBREAKING CHANGE: events.v1 is gone",
    });
    expect(c).toMatchObject({ breaking: true, breakingNote: "events.v1 is gone" });
  });

  it("ignores non-conventional subjects and release commits", () => {
    expect(parseCommit({ subject: "Merge pull request #5 from a/b" })).toBeNull();
    expect(parseCommit({ subject: "update stuff" })).toBeNull();
    expect(parseCommit({ subject: "chore(release): v0.2.0" })).toBeNull();
  });
});

describe("version bump (pre-1.0 rules)", () => {
  it("feat bumps minor", () => {
    expect(bumpFor(commits([["fix: a"], ["feat: b"]]), "0.3.1")).toBe("minor");
  });
  it("fix and perf bump patch", () => {
    expect(bumpFor(commits([["fix: a"]]), "0.3.1")).toBe("patch");
    expect(bumpFor(commits([["perf(daemon): faster"]]), "0.3.1")).toBe("patch");
  });
  it("a breaking change bumps minor before 1.0 and major from 1.0", () => {
    const list = commits([["fix: a"], ["feat(api)!: new shape"]]);
    expect(bumpFor(list, "0.3.1")).toBe("minor");
    expect(bumpFor(list, "1.4.0")).toBe("major");
  });
  it("docs, chore, test and ci alone release nothing", () => {
    expect(bumpFor(commits([["docs: x"], ["chore: y"], ["test: z"], ["ci: w"]]), "0.3.1")).toBeNull();
  });
  it("computes the next version", () => {
    expect(nextVersion("0.3.1", "minor")).toBe("0.4.0");
    expect(nextVersion("0.3.1", "patch")).toBe("0.3.2");
    expect(nextVersion("1.4.2", "major")).toBe("2.0.0");
  });
});

describe("release notes", () => {
  const list = commits([
    ["feat(daemon): track query API"],
    ["fix(ingest): skip empty lines"],
    ["docs(spec): not in the notes"],
    ["feat(ui)!: new track layout", "BREAKING CHANGE: the old layout setting is ignored"],
  ]);

  it("groups by type, lists breaking changes first and drops other types", () => {
    const notes = renderNotes(list);
    expect(notes).toBe(
      [
        "### Breaking changes",
        "",
        "- **ui:** the old layout setting is ignored",
        "",
        "### Features",
        "",
        "- **daemon:** track query API (aaaaaaa)",
        "- **ui:** new track layout (ddddddd)",
        "",
        "### Bug fixes",
        "",
        "- **ingest:** skip empty lines (bbbbbbb)",
        "",
      ].join("\n"),
    );
    expect(notes).not.toContain("not in the notes");
  });

  it("puts a new entry first and extracts one version back out", () => {
    const first = prependEntry("", "0.1.0", "2026-10-14", "### Features\n\n- a\n");
    const second = prependEntry(first, "0.2.0", "2026-10-20", "### Bug fixes\n\n- b\n");
    expect(second.startsWith("# Changelog")).toBe(true);
    expect(second.indexOf("## 0.2.0")).toBeLessThan(second.indexOf("## 0.1.0"));
    expect(extractNotes(second, "0.1.0")).toBe("### Features\n\n- a\n");
    expect(extractNotes(second, "0.2.0")).toBe("### Bug fixes\n\n- b\n");
    expect(extractNotes(second, "9.9.9")).toBeNull();
  });
});

describe("tags", () => {
  it("picks the highest semver tag, not the newest string", () => {
    expect(latestTag(["v0.9.0", "v0.10.0", "v0.2.0", "nightly", "v1.0.0-rc.1"])).toBe("v0.10.0");
    expect(latestTag([])).toBeNull();
  });
  it("compares versions numerically", () => {
    expect(newerThan("0.10.0", "0.9.0")).toBe(true);
    expect(newerThan("0.9.0", "0.9.0")).toBe(false);
  });
});

describe("release.mjs against a synthetic repository", () => {
  const script = fileURLToPath(new URL("../release.mjs", import.meta.url));
  let repo = "";
  afterEach(() => rmSync(repo, { recursive: true, force: true }));

  const git = (...args: string[]): string =>
    execFileSync(
      "git",
      ["-c", "user.name=t", "-c", "user.email=nobody", "-c", "commit.gpgsign=false", ...args],
      {
        cwd: repo,
        encoding: "utf8",
      },
    );
  const commit = (subject: string): void => {
    git("commit", "--allow-empty", "-m", subject);
  };
  const run = (...args: string[]): Record<string, unknown> =>
    JSON.parse(execFileSync("node", [script, ...args], { cwd: repo, encoding: "utf8" }));

  it("plans the first release, writes the files, then plans the next one after the tag", () => {
    repo = mkdtempSync(join(tmpdir(), "vantage-release-"));
    git("init", "-q", "-b", "main");
    writeFileSync(join(repo, "package.json"), '{ "name": "x", "version": "0.0.0" }\n');
    git("add", "package.json");
    commit("feat(core): first thing");
    commit("fix(core): a bug");
    commit("docs: words");

    const first = run("plan", "--write");
    expect(first).toMatchObject({ release: true, bump: "minor", version: "0.1.0" });
    const pkg: { version: string } = JSON.parse(readFileSync(join(repo, "package.json"), "utf8"));
    expect(pkg.version).toBe("0.1.0");
    const changelog = readFileSync(join(repo, "CHANGELOG.md"), "utf8");
    expect(changelog).toContain("## 0.1.0 (");
    expect(changelog).toContain("- **core:** first thing");
    expect(changelog).not.toContain("words");

    // The release PR merged but the tag does not exist yet: pending, so no second release PR.
    git("add", ".");
    commit("chore(release): v0.1.0");
    expect(run("status")).toMatchObject({ version: "0.1.0", pending: true, tagged: false });
    expect(run("plan")).toMatchObject({ release: false });

    git("tag", "v0.1.0");
    expect(run("status")).toMatchObject({ pending: false, tagged: true });
    expect(run("plan")).toMatchObject({ release: false });
    commit("fix(daemon): second bug");
    expect(run("plan")).toMatchObject({ release: true, bump: "patch", version: "0.1.1" });
  });
});
