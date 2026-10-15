// Release planning from Conventional Commits (docs/specs/ci.md "Releasing", RELEASING.md).
// No network and no writes outside package.json and CHANGELOG.md; it never tags, pushes or publishes.
//
// Usage:
//   node tools/release.mjs status                 JSON: current version, latest tag, whether a release is pending
//   node tools/release.mjs plan [--write]         JSON: next version and notes; --write updates package.json and CHANGELOG.md
//   node tools/release.mjs notes <version>        prints that version's CHANGELOG section
//   node tools/release.mjs pr-body <version>      prints the release PR description
//
// Pre-1.0 rules (D98): feat bumps minor, fix and perf bump patch, a breaking change bumps minor until 1.0.
// From 1.0 a breaking change bumps major.
import { execFileSync } from "node:child_process";
import { appendFileSync, readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const SEMVER = /^(\d+)\.(\d+)\.(\d+)$/;

/** Section order and titles. Types not listed here never reach the changelog. */
export const SECTIONS = [
  ["feat", "Features"],
  ["fix", "Bug fixes"],
  ["perf", "Performance"],
];
const BUMPING = new Set(SECTIONS.map(([t]) => t));

const HEADER = /^(\w+)(?:\(([^)]*)\))?(!)?: (.+)$/;

/** Parses one commit. Returns null for anything that is not a Conventional Commit or is a release commit. */
export function parseCommit({ sha = "", subject, body = "" }) {
  const m = HEADER.exec(subject.trim());
  if (!m) return null;
  const [, type, scope, bang, description] = m;
  if (type === "chore" && scope === "release") return null;
  const breakingNote = /^BREAKING[ -]CHANGE: (.+)/m.exec(body)?.[1];
  return {
    sha,
    type,
    scope: scope || undefined,
    description,
    breaking: Boolean(bang) || breakingNote !== undefined,
    breakingNote,
  };
}

/** "major" | "minor" | "patch" | null (nothing releasable). */
export function bumpFor(commits, currentVersion) {
  const m = SEMVER.exec(currentVersion);
  if (!m) throw new Error(`bad version ${currentVersion}`);
  const preOne = Number(m[1]) === 0;
  let bump = null;
  for (const c of commits) {
    if (c.breaking) return preOne ? "minor" : "major";
    if (c.type === "feat") bump = "minor";
    else if (BUMPING.has(c.type) && bump === null) bump = "patch";
  }
  return bump;
}

export function nextVersion(currentVersion, bump) {
  const m = SEMVER.exec(currentVersion);
  if (!m) throw new Error(`bad version ${currentVersion}`);
  const [maj, min, pat] = m.slice(1).map(Number);
  if (bump === "major") return `${maj + 1}.0.0`;
  if (bump === "minor") return `${maj}.${min + 1}.0`;
  if (bump === "patch") return `${maj}.${min}.${pat + 1}`;
  throw new Error(`bad bump ${bump}`);
}

const line = (c) =>
  `- ${c.scope ? `**${c.scope}:** ` : ""}${c.description}${c.sha ? ` (${c.sha.slice(0, 7)})` : ""}`;

/** The body of one changelog entry (no version heading). */
export function renderNotes(commits) {
  const out = [];
  const breaking = commits.filter((c) => c.breaking);
  if (breaking.length > 0) {
    out.push(
      "### Breaking changes",
      "",
      ...breaking.map((c) => `- ${c.scope ? `**${c.scope}:** ` : ""}${c.breakingNote ?? c.description}`),
      "",
    );
  }
  for (const [type, title] of SECTIONS) {
    const list = commits.filter((c) => c.type === type);
    if (list.length > 0) out.push(`### ${title}`, "", ...list.map(line), "");
  }
  return out.join("\n").trimEnd() + "\n";
}

const CHANGELOG_HEAD =
  "# Changelog\n\nGenerated from Conventional Commits by `tools/release.mjs`. See [RELEASING.md](RELEASING.md).\n";

/** Puts a new entry first. `changelog` is the current file text, or "" when there is none. */
export function prependEntry(changelog, version, date, notes) {
  const first = changelog.indexOf("\n## ");
  const rest = first >= 0 ? `\n${changelog.slice(first + 1)}` : "";
  return `${CHANGELOG_HEAD}\n## ${version} (${date})\n\n${notes}${rest}`;
}

/** Body of the release PR; follows the repo's PR structure (AGENTS.md rule 5). */
export function renderPrBody(version, notes) {
  return [
    "## Context",
    "",
    `Automatic release PR. Merging it cuts v${version}: tag, GitHub Release with artifacts, and the gated npm publish (RELEASING.md).`,
    "",
    "## Higher Goal",
    "",
    "Releases are a deliberate human merge, built from Conventional Commits, never from a laptop.",
    "",
    "## Acceptance Criteria",
    "",
    "- [ ] The notes below describe what you want to ship",
    "- [ ] `code` and `docs` checks are green (close and reopen this PR to start them; see RELEASING.md)",
    "- [ ] The `npm-publish` environment and its secret are configured (first release only)",
    "",
    "## Out of Scope",
    "",
    "Anything not merged to `main` yet. Edit nothing here by hand: the next push to `main` regenerates this PR.",
    "",
    "## Summary of Changes",
    "",
    notes.trimEnd(),
    "",
  ].join("\n");
}

/** One version's section, without its heading; null when absent. */
export function extractNotes(changelog, version) {
  const lines = changelog.split("\n");
  const start = lines.findIndex((l) => l.startsWith(`## ${version} (`) || l === `## ${version}`);
  if (start < 0) return null;
  let end = lines.findIndex((l, i) => i > start && l.startsWith("## "));
  if (end < 0) end = lines.length;
  return (
    lines
      .slice(start + 1, end)
      .join("\n")
      .trim() + "\n"
  );
}

const git = (args) => execFileSync("git", args, { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });

/** Highest vMAJOR.MINOR.PATCH tag, or null. */
export function latestTag(tags) {
  const versions = tags
    .map((t) => ({ t, m: /^v(\d+)\.(\d+)\.(\d+)$/.exec(t) }))
    .filter((x) => x.m)
    .map((x) => ({ t: x.t, n: x.m.slice(1).map(Number) }));
  versions.sort((a, b) => a.n[0] - b.n[0] || a.n[1] - b.n[1] || a.n[2] - b.n[2]);
  return versions.at(-1)?.t ?? null;
}

/** True when a is a higher version than b. */
export function newerThan(a, b) {
  const x = SEMVER.exec(a)?.slice(1).map(Number);
  const y = SEMVER.exec(b)?.slice(1).map(Number);
  if (!x || !y) throw new Error(`bad version ${a} or ${b}`);
  const d = x[0] - y[0] || x[1] - y[1] || x[2] - y[2];
  return d > 0;
}

function readCommits(since) {
  const range = since ? [`${since}..HEAD`] : ["HEAD"];
  const raw = git(["log", "--no-merges", "--format=%H%x1f%s%x1f%b%x1e", ...range]);
  return raw
    .split("\x1e")
    .map((r) => r.replace(/^\n/, ""))
    .filter(Boolean)
    .map((r) => {
      const [sha, subject, body] = r.split("\x1f");
      return parseCommit({ sha, subject: subject ?? "", body: body ?? "" });
    })
    .filter(Boolean);
}

function status() {
  const version = JSON.parse(readFileSync("package.json", "utf8")).version;
  const tag = latestTag(git(["tag", "--list", "v*"]).split("\n").filter(Boolean));
  const tagged = git(["tag", "--list", `v${version}`]).trim() !== "";
  // A version above the latest tag with no tag of its own is a release PR that was merged and is not cut yet.
  const pending = !tagged && version !== "0.0.0" && (tag === null || newerThan(version, tag.slice(1)));
  return { version, tag: `v${version}`, latestTag: tag, tagged, pending };
}

function plan(write) {
  const s = status();
  if (s.pending)
    return { ...s, release: false, reason: "a release is already pending (version bumped, not tagged)" };
  const base = s.latestTag ? s.latestTag.slice(1) : s.version;
  const commits = readCommits(s.latestTag);
  const bump = bumpFor(commits, base);
  if (!bump) return { ...s, release: false, reason: "no feat, fix or perf commits since the last release" };
  const version = nextVersion(base, bump);
  const notes = renderNotes(commits);
  if (write) {
    const pkg = JSON.parse(readFileSync("package.json", "utf8"));
    pkg.version = version;
    writeFileSync("package.json", JSON.stringify(pkg, null, 2) + "\n");
    let old = "";
    try {
      old = readFileSync("CHANGELOG.md", "utf8");
    } catch {
      /* first release */
    }
    writeFileSync("CHANGELOG.md", prependEntry(old, version, new Date().toISOString().slice(0, 10), notes));
  }
  return { ...s, release: true, bump, version, tag: `v${version}`, notes };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const [cmd, ...args] = process.argv.slice(2);
  if (cmd === "status") {
    const s = status();
    console.log(JSON.stringify(s));
    if (process.env["GITHUB_OUTPUT"]) {
      appendFileSync(
        process.env["GITHUB_OUTPUT"],
        `version=${s.version}\ntag=${s.tag}\ntagged=${s.tagged}\npending=${s.pending}\n`,
      );
    }
  } else if (cmd === "plan") {
    const p = plan(args.includes("--write"));
    console.log(JSON.stringify(p));
    if (process.env["GITHUB_OUTPUT"]) {
      appendFileSync(process.env["GITHUB_OUTPUT"], `release=${p.release}\nversion=${p.version ?? ""}\n`);
    }
  } else if (cmd === "pr-body") {
    process.stdout.write(
      renderPrBody(args[0] ?? "", extractNotes(readFileSync("CHANGELOG.md", "utf8"), args[0] ?? "") ?? ""),
    );
  } else if (cmd === "notes") {
    const notes = extractNotes(readFileSync("CHANGELOG.md", "utf8"), args[0] ?? "");
    if (notes === null) {
      console.error(`No CHANGELOG.md section for ${args[0]}`);
      process.exit(1);
    }
    process.stdout.write(notes);
  } else {
    console.error("Usage: release.mjs status | plan [--write] | notes <version> | pr-body <version>");
    process.exit(2);
  }
}
