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
      name: "acme/web",
      remoteUrl: "https://github.com/acme/web",
    });
    expect(repoInfoOf(null, "abc", "lonely")).toEqual({
      key: "no-remote#abc",
      name: "lonely",
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
    expect(view.groups.map((g) => g.label)).toEqual(["acme/web", "No repo"]);
    expect(view.groups.at(-1)).toMatchObject({ id: "repo:", total: 1 });
    expect(view.facets.repo).toEqual({ "github.com/acme/web": 1 });
    expect(listItems(store).find((i) => i.branch === "feat/in")?.repo).toBe("github.com/acme/web");
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
    expect(rows.find((r) => r.branch === "feat/r")?.repoUrl).toBe("https://github.com/acme/web");
    expect(rows.find((r) => r.branch === "feat/l")?.repoUrl).toBeNull();
  });
});

describe("detached HEAD", () => {
  it("is titled by its repo, not 'HEAD'", () => {
    scanned("C:\\work\\web", SSH, "abc", "web");
    session("C:\\work\\web", "HEAD");
    runStagePass(store, {}, NOW);
    const item = listItems(store).find((i) => i.branch === "HEAD");
    expect(item?.title).toBe("detached HEAD in acme/web");
  });
});

function parseTrackQueryOk(qs: string) {
  const parsed = parseTrackQuery(new URLSearchParams(qs));
  if (!parsed.ok) throw new Error(parsed.error);
  return parsed.query;
}
