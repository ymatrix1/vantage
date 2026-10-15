// Synthetic data only. Human titles, link building, project ordering and the header counts (pure, no DOM).
import { describe, expect, it } from "vitest";
import { branchLink, cdCommand, commitLink, repoLink, safeRepoUrl } from "../src/lib/links";
import { sectionsOf } from "../src/lib/projects";
import { nestSessions } from "../src/lib/sessions";
import { needsYouDetail, summaryOf } from "../src/lib/summary";
import { cleanBranch, humanTitle } from "../src/lib/title";
import { emptyFacets, group, item, track } from "./helpers";

describe("cleanBranch and humanTitle", () => {
  it("drops the agent prefix and a random six-hex suffix, and nothing else", () => {
    expect(cleanBranch("claude/track-ui-controls-798f90")).toBe("track-ui-controls");
    expect(cleanBranch("claude/fix-login")).toBe("fix-login");
    expect(cleanBranch("docs/agents-compact")).toBe("docs/agents-compact");
    expect(cleanBranch("feat/ftk-1-demo")).toBe("feat/ftk-1-demo");
    expect(cleanBranch("claude/")).toBe("claude/");
  });

  it.each([
    ["a ticket key stays", { id: "issue:FTK-1", title: "FTK-1", branch: "claude/x-abcdef" }, "FTK-1"],
    [
      "a real title stays",
      { id: "branch:r:b", title: "Add retry to sync", branch: "feat/retry" },
      "Add retry to sync",
    ],
    [
      "a fallback title becomes the cleaned branch",
      { id: "session:s", title: "web · main · Oct 14", branch: "claude/retry-0a1b2c" },
      "retry",
    ],
    [
      "a fallback with no branch stays",
      { id: "session:s", title: "Session abc12345 · Oct 14", branch: null },
      "Session abc12345 · Oct 14",
    ],
    [
      "a branch-named title is cleaned",
      { id: "branch:r:claude/x-abcdef", title: "claude/x-abcdef", branch: "claude/x-abcdef" },
      "x",
    ],
    [
      "a worktree item uses the branch, not the folder",
      {
        id: "worktree:C:/w/brave-joliot-995ebc",
        title: "brave-joliot-995ebc",
        branch: "docs/agents-compact",
      },
      "docs/agents-compact",
    ],
  ])("%s", (_n, it_, title) => {
    expect(humanTitle(it_)).toBe(title);
  });
});

describe("links", () => {
  it("builds a repo link only from a remote path", () => {
    expect(repoLink("github.com/acme/web")).toBe("https://github.com/acme/web");
    expect(repoLink("github.com/acme/web#abc123")).toBe("https://github.com/acme/web");
    for (const v of [
      "brave-joliot-995ebc",
      "no-remote",
      null,
      "",
      "github.com/a/b c",
      'github.com/a/"><b>',
    ]) {
      expect(repoLink(v)).toBeNull();
    }
  });

  it("accepts only an exact https repo URL", () => {
    expect(safeRepoUrl("https://github.com/acme/web")).toBe("https://github.com/acme/web");
    for (const v of [
      "http://github.com/acme/web",
      "javascript:alert(1)",
      "https://github.com/acme/web?x=1",
      "https://github.com/acme/web#frag",
      "https://github.com/acme/web/ with space",
      "https://user@github.com/acme/web",
      'https://github.com/acme/"><img src=x>',
      "//evil.com/a/b",
      null,
      undefined,
    ]) {
      expect(safeRepoUrl(v)).toBeNull();
    }
  });

  it("escapes branch names segment by segment", () => {
    const base = "https://github.com/acme/web";
    expect(branchLink(base, "feat/retry")).toBe(`${base}/tree/feat/retry`);
    expect(branchLink(base, "feat/a b#c?d")).toBe(`${base}/tree/feat/a%20b%23c%3Fd`);
    expect(branchLink(base, "x/../y")).toBeNull();
    expect(branchLink(base, '"><script>')).toBe(`${base}/tree/%22%3E%3Cscript%3E`);
    expect(branchLink(null, "feat/x")).toBeNull();
    expect(branchLink(base, "")).toBeNull();
    expect(branchLink("https://evil.com/x?y", "b")).toBeNull();
  });

  it("builds a commit link only from a hex sha", () => {
    const base = "https://github.com/acme/web";
    expect(commitLink(base, "DEADBEEF12")).toBe(`${base}/commit/deadbeef12`);
    for (const v of ["", "xyz", "abc", "deadbeef/../x", "deadbeef12 ; rm", null])
      expect(commitLink(base, v)).toBeNull();
    expect(commitLink(null, "deadbeef12")).toBeNull();
  });

  it("offers a cd command only for paths that need no shell-specific escaping", () => {
    expect(cdCommand("C:\\work\\brave-joliot-995ebc")).toBe('cd "C:\\work\\brave-joliot-995ebc"');
    expect(cdCommand("/home/u/my project")).toBe('cd "/home/u/my project"');
    for (const v of ['/a/"b', "/a/'b", "/a/$HOME", "/a/`x`", "/a/b\nc", "", null, undefined])
      expect(cdCommand(v)).toBeNull();
  });
});

describe("sectionsOf (projects)", () => {
  const flag = [{ kind: "k", severity: "amber", reason: "r" }];
  const groups = [
    group(
      "repo:github.com/acme/quiet",
      "github.com/acme/quiet",
      [item({ id: "q", lastActivity: "2026-01-05T10:00:00Z" })],
      3,
    ),
    group(
      "repo:github.com/acme/loud",
      "github.com/acme/loud",
      [
        item({ id: "a", lastActivity: "2026-01-04T10:00:00Z" }),
        item({ id: "b", flags: flag, lastActivity: "2026-01-04T09:00:00Z" }),
      ],
      9,
    ),
    group("repo:", "No repo", [item({ id: "n", flags: flag, lastActivity: "2026-01-06T10:00:00Z" })], 1),
    group(
      "repo:folder-only",
      "folder-only",
      [item({ id: "f", flags: flag, lastActivity: "2026-01-03T10:00:00Z" })],
      2,
    ),
    group("no_edits", "Conversations without code", [item({ id: "c", hasEdits: false })], 4),
  ];

  it("orders projects by who needs you most, then recency, with no-repo last and built groups after", () => {
    const s = sectionsOf("repo", groups);
    expect(s.map((x) => x.id)).toEqual([
      "repo:github.com/acme/loud",
      "repo:folder-only",
      "repo:github.com/acme/quiet",
      "repo:",
      "no_edits",
    ]);
  });

  it("names a project by owner and repo, links only real remotes, and puts flagged rows first", () => {
    const s = sectionsOf("repo", groups);
    const loud = s.find((x) => x.id === "repo:github.com/acme/loud");
    expect(loud).toMatchObject({
      label: "acme/loud",
      url: "https://github.com/acme/loud",
      needsYou: 1,
      inProgress: 1,
      total: 9,
    });
    expect(loud?.items.map((i) => i.id)).toEqual(["b", "a"]);
    expect(s.find((x) => x.id === "repo:folder-only")).toMatchObject({ label: "folder-only", url: null });
    expect(s.find((x) => x.id === "repo:")?.label).toBe("No repo");
  });

  it("keeps the API order for other groupings", () => {
    expect(sectionsOf("attention", groups).map((x) => x.id)).toEqual(groups.map((g) => g.id));
    expect(sectionsOf("attention", groups)[0]?.needsYou).toBeNull();
  });
});

describe("header counts", () => {
  it("reads totals and flag facets; names only the flags that exist", () => {
    const v = track([], {
      groups: [group("needs_you", "Needs you", [], 20), group("in_progress", "In progress", [], 98)],
      facets: {
        ...emptyFacets(),
        flag: { unproven_claim: 12, thrashing: 5, none: 98 },
        age: { today: 1, week: 2, older: 37 },
      },
    });
    const s = summaryOf(v);
    expect(s).toMatchObject({
      inProgress: 98,
      needsYou: 20,
      unproven: 12,
      stuck: 5,
      forgotten: 0,
      older: 37,
    });
    expect(needsYouDetail(s)).toBe("12 unproven, 5 stuck");
    expect(needsYouDetail({ ...s, unproven: 0, stuck: 0 })).toBe("");
  });
});

const s = (id: string, parentId: string | null) => ({ id, parentId, firstAt: "", lastAt: "", events: 1 });

describe("nestSessions", () => {
  it("nests a derived session under its parent and keeps an orphan as a root", () => {
    const tree = nestSessions([s("a", null), s("b", "a"), s("c", "b"), s("d", "gone")]);
    expect(tree.map((n) => n.session.id)).toEqual(["a", "d"]);
    expect(tree[0]?.children[0]?.children[0]?.session.id).toBe("c");
  });
  it("never loops on a cycle", () => {
    const tree = nestSessions([s("a", "b"), s("b", "a")]);
    expect(tree.length).toBeGreaterThan(0);
  });
});
