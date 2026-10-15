// Synthetic events only. A session that runs in one repo and edits files in another is one item that lists
// both repos (D190): the filter matches either, the facets count the item once per repo.
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { parseTrackQuery, repoInfoOf, repoKey, type VantageEvent } from "@vantage/core";
import { Store, getItem, itemDetailView, listItems, runStagePass, trackView } from "../src/index.ts";

const NOW = new Date("2026-01-05T11:00:00Z");
let dir = "";
let store: Store;
beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "vantage-multi-repo-"));
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
function scanned(worktree: string, remote: string, first: string, main: string): void {
  const info = repoInfoOf(remote, first, main);
  put({
    source: "git",
    sourceId: `git:${repoKey(remote, first) ?? ""}:scan:${worktree}:x:${++n}`,
    kind: "worktree.scanned",
    timestamp: "2026-01-05T08:00:00Z",
    payload: { worktree, branch: "main", head: "aaaaaaa", dirty: [], repo: info },
  });
}
const query = (qs: string) => {
  const p = parseTrackQuery(new URLSearchParams(qs));
  if (!p.ok) throw new Error(p.error);
  return p.query;
};

/** A session in `cwd` that edits `paths`. */
function session(id: string, cwd: string, branch: string, paths: string[]): void {
  put({
    sessionId: id,
    kind: "prompt.submitted",
    timestamp: "2026-01-05T09:00:00Z",
    payload: { branch, cwd },
  });
  put({
    sessionId: id,
    kind: "file.edited",
    timestamp: "2026-01-05T09:05:00Z",
    payload: { branch, cwd, paths },
  });
}

function setup(): void {
  scanned("C:/work/web", "https://github.com/acme/web.git", "aaa", "web");
  scanned("C:/work/api", "https://github.com/acme/api.git", "bbb", "api");
  scanned("C:/work/tools", "https://github.com/other/tools.git", "ccc", "tools");
  session("s1", "C:/work/web", "feat/both", ["C:/work/web/a.ts", "C:/work/api/src/b.ts", "C:/work/api/c.ts"]);
  session("s2", "C:/work/web", "feat/one", ["C:/work/web/z.ts"]);
  session("s3", "C:/work/tools", "feat/other", ["C:/work/tools/t.ts"]);
  runStagePass(store, {}, NOW);
}

describe("an item that touches several repos", () => {
  it("lists every repo, primary (the session's folder) first, each once", () => {
    setup();
    const both = listItems(store).find((i) => i.branch === "feat/both");
    expect(both?.repo).toBe("github.com/acme/web");
    expect(both?.repos).toEqual(["github.com/acme/web", "github.com/acme/api"]);
    expect(listItems(store).find((i) => i.branch === "feat/one")?.repos).toEqual(["github.com/acme/web"]);
    const id = both?.itemKey ?? "";
    expect(getItem(store, id)?.repos).toEqual(["github.com/acme/web", "github.com/acme/api"]);
    expect(itemDetailView(store, id)?.repos).toEqual(["github.com/acme/web", "github.com/acme/api"]);
  });

  it("matches a repo or owner filter on any of its repos", () => {
    setup();
    const byApi = trackView(store, NOW, query("repo=github.com/acme/api&since=all"));
    expect(byApi.groups.flatMap((g) => g.items).map((i) => i.branch)).toEqual(["feat/both"]);
    const byOrg = trackView(store, NOW, query("org=acme&since=all"));
    expect(byOrg.page.total).toBe(2);
    expect(trackView(store, NOW, query("q=acme/api&since=all")).page.total).toBe(1);
  });

  it("counts the item once per repo and once per owner in the facets", () => {
    setup();
    const f = trackView(store, NOW, query("since=all")).facets;
    expect(f.repo).toEqual({
      "github.com/acme/web": 2,
      "github.com/acme/api": 1,
      "github.com/other/tools": 1,
    });
    expect(f.org).toEqual({ acme: 2, other: 1 });
  });

  it("rewrites the set on every pass: a repo that is no longer touched drops out", () => {
    setup();
    store.db.prepare("INSERT INTO item_repos (item_key, repo, position) VALUES ('stale', 'x/y/z', 0)").run();
    runStagePass(store, {}, NOW);
    expect(
      store.db.prepare("SELECT COUNT(*) AS n FROM item_repos WHERE item_key = 'stale'").get()?.["n"],
    ).toBe(0);
  });
});
