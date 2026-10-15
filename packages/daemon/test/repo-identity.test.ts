// Synthetic events only. An item's repo comes from git identity (the scanned worktree its session ran in),
// never from the worktree folder; paths in no scanned worktree have no repo.
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { normalizeRemoteUrl, parseTrackQuery, repoInfoOf, repoKey, type VantageEvent } from "@vantage/core";
import { Store, listItems, runStagePass, trackView } from "../src/index.ts";

const AT = "@"; // built, not written out, so the repo scanner does not mistake a remote for an email
const NOW = new Date("2026-01-05T11:00:00Z");
let dir = "";
let store: Store;
beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "vantage-repo-id-"));
  store = new Store(join(dir, "v.db"));
});
afterEach(() => {
  store.close();
  rmSync(dir, { recursive: true, force: true });
});

let n = 0;
const put = (e: Omit<VantageEvent, "sourceId" | "source"> & { source?: string; sourceId?: string }): void => {
  store.insertEvent({ source: "claude_code", sourceId: `e${++n}`, ...e }, "2026-01-05T10:00:00Z");
};

const SSH = `git${AT}github.com:Acme/Web.git`;
const HTTPS = "https://github.com/acme/web.git";

/** A scanned worktree. `withRepo` false writes the older event shape (the repo only in the id). */
function scanned(
  worktree: string,
  remote: string | null,
  first: string,
  main: string,
  withRepo = true,
): void {
  const info = repoInfoOf(remote, first, main);
  const key = repoKey(remote, first) ?? "";
  put({
    source: "git",
    sourceId: `git:${key}:scan:${worktree}:x:${++n}`,
    kind: "worktree.scanned",
    timestamp: "2026-01-05T08:00:00Z",
    payload: {
      worktree,
      branch: "main",
      head: "aaaaaaa",
      dirty: [],
      ...(withRepo && info ? { repo: info } : {}),
    },
  });
}

let s = 0;
/** One agent session in `cwd` on `branch`: an edit, so an item exists. */
function session(cwd: string, branch: string): void {
  const sessionId = `s${++s}`;
  put({ sessionId, kind: "prompt.submitted", timestamp: "2026-01-05T09:00:00Z", payload: { branch, cwd } });
  put({
    sessionId,
    kind: "file.edited",
    timestamp: "2026-01-05T09:05:00Z",
    payload: { branch, cwd, path: `${cwd}/a.ts` },
  });
}

const repoOf = (branch: string): string | null | undefined =>
  listItems(store).find((i) => i.branch === branch)?.repo;

describe("repoInfoOf", () => {
  it("names a repo owner/repo from the remote, and from the main worktree folder without one", () => {
    expect(repoInfoOf(SSH, "abc", "main-folder")).toEqual({
      key: "github.com/acme/web#abc",
      name: "Acme/Web",
      org: "Acme",
      repoName: "Web",
      host: "github.com",
      remoteUrl: "https://github.com/acme/web",
    });
    expect(repoInfoOf(null, "abc", "lonely")).toEqual({
      key: "no-remote#abc",
      name: "lonely",
      org: "local",
      repoName: "lonely",
      host: null,
      remoteUrl: null,
    });
    expect(repoInfoOf(null, null, "x")).toBeNull();
  });

  it("gives one identity to the ssh and https forms of a remote", () => {
    expect(normalizeRemoteUrl(SSH)).toBe(normalizeRemoteUrl(HTTPS));
    expect(repoKey(SSH, "abc")).toBe(repoKey(HTTPS, "abc"));
  });
});

describe("an item's repo", () => {
  it("is the git repo of its worktree, one entry per repo however many worktrees and remote forms", () => {
    scanned("C:\\work\\brave-joliot-995ebc", SSH, "abc", "web");
    scanned("C:\\work\\upbeat-archimedes-602cae", HTTPS, "abc", "web");
    scanned("C:\\work\\api", "https://github.com/acme/api.git", "def", "api");
    session("C:\\work\\brave-joliot-995ebc\\packages\\ui", "feat/one");
    session("C:\\work\\upbeat-archimedes-602cae", "feat/two");
    session("C:\\work\\api", "feat/three");
    runStagePass(store, {}, NOW);
    expect(repoOf("feat/one")).toBe("github.com/acme/web");
    expect(repoOf("feat/two")).toBe("github.com/acme/web");
    expect(repoOf("feat/three")).toBe("github.com/acme/api");
    const view = trackView(store, NOW, parseTrackQueryOk("group=repo&since=all"));
    expect(Object.keys(view.facets.repo).toSorted()).toEqual(["github.com/acme/api", "github.com/acme/web"]);
    expect(view.facets.repo["github.com/acme/web"]).toBe(2);
    expect(JSON.stringify(view)).not.toContain("brave-joliot");
    expect(JSON.stringify(view)).not.toContain("upbeat-archimedes");
  });

  it("is the main worktree's folder for a repo with no remote, never a linked worktree's folder", () => {
    scanned("C:\\work\\lonely", null, "ccc", "lonely");
    scanned("C:\\work\\lonely-feature-9f9f9f", null, "ccc", "lonely");
    session("C:\\work\\lonely-feature-9f9f9f", "feat/nr");
    runStagePass(store, {}, NOW);
    expect(repoOf("feat/nr")).toBe("lonely");
  });

  it("is null for a folder in no scanned worktree, and those items form a final No repo group", () => {
    scanned("C:\\work\\web", SSH, "abc", "web");
    session("C:\\work\\web", "feat/in");
    session("C:\\dev", "feat/out");
    runStagePass(store, {}, NOW);
    expect(repoOf("feat/out")).toBeNull();
    const view = trackView(store, NOW, parseTrackQueryOk("group=repo&since=all"));
    expect(view.groups.map((g) => g.label)).toEqual(["Acme/Web", "No repo"]);
    expect(view.groups.at(-1)).toMatchObject({ id: "repo:", total: 1 });
    expect(view.facets.repo).toEqual({ "github.com/Acme/Web": 1 });
    expect(listItems(store).find((i) => i.branch === "feat/in")?.repo).toBe("github.com/Acme/Web");
  });

  it("still resolves from the older event shape and for a worktree that was later removed", () => {
    // Older events only name the repo key in the id; the worktree is gone from disk, the history stays.
    scanned("C:\\work\\old-tree-aaaaaa", SSH, "abc", "web", false);
    session("C:\\work\\old-tree-aaaaaa", "feat/old");
    runStagePass(store, {}, NOW);
    expect(repoOf("feat/old")).toBe("github.com/acme/web");
  });

  it("the longest worktree root wins when roots nest", () => {
    scanned("C:\\work", "https://github.com/acme/mono.git", "m1", "work");
    scanned("C:\\work\\nested", "https://github.com/acme/nested.git", "n1", "nested");
    session("C:\\work\\nested\\src", "feat/n");
    session("C:\\work\\other", "feat/m");
    runStagePass(store, {}, NOW);
    expect(repoOf("feat/n")).toBe("github.com/acme/nested");
    expect(repoOf("feat/m")).toBe("github.com/acme/mono");
  });

  it("exposes a repo URL on the Track item only for a remote", () => {
    scanned("C:\\work\\web", SSH, "abc", "web");
    scanned("C:\\work\\lonely", null, "ccc", "lonely");
    session("C:\\work\\web", "feat/r");
    session("C:\\work\\lonely", "feat/l");
    runStagePass(store, {}, NOW);
    const rows = trackView(store, NOW, parseTrackQueryOk("since=all")).groups.flatMap((g) => g.items);
    expect(rows.find((r) => r.branch === "feat/r")?.repoUrl).toBe("https://github.com/Acme/Web");
    expect(rows.find((r) => r.branch === "feat/l")?.repoUrl).toBeNull();
  });
});

describe("detached HEAD", () => {
  it("is titled by its repo, not 'HEAD'", () => {
    scanned("C:\\work\\web", SSH, "abc", "web");
    session("C:\\work\\web", "HEAD");
    runStagePass(store, {}, NOW);
    const item = listItems(store).find((i) => i.branch === "HEAD");
    expect(item?.title).toBe("detached HEAD in Acme/Web");
  });
});

describe("organisation", () => {
  const GL = "https://gitlab.example.com/Team/sub/api.git";

  function seedOrgs(): void {
    scanned("C:\\work\\web", SSH, "abc", "web"); // github.com/Acme/Web
    scanned("C:\\work\\web2", "https://github.com/ACME/docs.git", "abd", "docs"); // same org, other case
    scanned("C:\\work\\flip", "https://github.com/Flip-to/platform.git", "fff", "flip");
    scanned("C:\\work\\gl", GL, "ggg", "gl");
    scanned("C:\\work\\lonely", null, "ccc", "lonely");
    for (const [sub, branch] of [
      ["web", "feat/w"],
      ["web2", "feat/d"],
      ["flip", "feat/f"],
      ["gl", "feat/g"],
      ["lonely", "feat/l"],
      ["../dev", "feat/none"],
    ] as const) {
      session(`C:\\work\\${sub}`, branch);
    }
    runStagePass(store, {}, NOW);
  }

  it("gives each Track item its owner in the case it was written in, Local without a remote, null without a repo", () => {
    seedOrgs();
    const rows = trackView(store, NOW, parseTrackQueryOk("since=all")).groups.flatMap((g) => g.items);
    const org = (b: string) => rows.find((r) => r.branch === b)?.org;
    expect([
      org("feat/w"),
      org("feat/d"),
      org("feat/f"),
      org("feat/g"),
      org("feat/l"),
      org("feat/none"),
    ]).toEqual(["Acme", "ACME", "Flip-to", "Team", "local", null]);
  });

  it("counts organisations once however the owner is cased, and keeps repos out of the owner's name", () => {
    seedOrgs();
    const f = trackView(store, NOW, parseTrackQueryOk("since=all")).facets;
    expect(Object.values(f.org).reduce((a, b) => a + b, 0)).toBe(5);
    expect(
      Object.keys(f.org)
        .map((k) => k.toLowerCase())
        .toSorted((a, b) => a.localeCompare(b)),
    ).toEqual(["acme", "flip-to", "local", "team"]);
    expect(Object.values(f.org).toSorted((a, b) => a - b)).toEqual([1, 1, 1, 2]);
  });

  it("filters by org case-insensitively and scopes the repo facet to the selected org", () => {
    seedOrgs();
    for (const spelling of ["acme", "ACME", "Acme"]) {
      const v = trackView(store, NOW, parseTrackQueryOk(`since=all&org=${spelling}`));
      expect(v.page.total).toBe(2);
      expect(
        v.groups
          .flatMap((g) => g.items)
          .map((i) => i.branch)
          .toSorted((a, b) => (a ?? "").localeCompare(b ?? "")),
      ).toEqual(["feat/d", "feat/w"]);
    }
    const v = trackView(store, NOW, parseTrackQueryOk("since=all&org=acme"));
    // The repo facet counts over the org filter; the org facet ignores its own filter.
    expect(
      Object.keys(v.facets.repo)
        .map((k) => k.toLowerCase())
        .toSorted((a, b) => a.localeCompare(b)),
    ).toEqual(["github.com/acme/docs", "github.com/acme/web"]);
    expect(Object.keys(v.facets.org).length).toBe(4);
    const local = trackView(store, NOW, parseTrackQueryOk("since=all&org=local"));
    expect(local.groups.flatMap((g) => g.items).map((i) => i.branch)).toEqual(["feat/l"]);
  });

  it("groups by org with the owner as written, Local for no remote and No repo last", () => {
    seedOrgs();
    const v = trackView(store, NOW, parseTrackQueryOk("since=all&group=org"));
    expect(v.groups.map((g) => g.label)).toEqual(["ACME", "Flip-to", "Local", "Team", "No repo"]);
    const acme = v.groups.find((g) => g.id === "org:acme");
    expect(acme).toMatchObject({ total: 2 });
    expect(acme?.items).toHaveLength(2);
  });

  it("keeps a subgroup in the repo and the host in the repo path", () => {
    seedOrgs();
    const row = trackView(store, NOW, parseTrackQueryOk("since=all"))
      .groups.flatMap((g) => g.items)
      .find((r) => r.branch === "feat/g");
    expect(row).toMatchObject({
      repo: "gitlab.example.com/Team/sub/api",
      org: "Team",
      repoUrl: "https://gitlab.example.com/Team/sub/api",
    });
  });

  it("rejects a bad org parameter without echoing it", () => {
    const parsed = parseTrackQuery(new URLSearchParams(`org=${"x".repeat(300)}`));
    expect(parsed).toEqual({ ok: false, error: "bad value for org" });
  });
});

function parseTrackQueryOk(qs: string) {
  const parsed = parseTrackQuery(new URLSearchParams(qs));
  if (!parsed.ok) throw new Error(parsed.error);
  return parsed.query;
}
