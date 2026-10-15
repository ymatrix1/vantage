// Real `git` in temporary repositories, synthetic file names. Hermetic: no network, no global config.
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { normalizeEditPath, type VantageEvent } from "@vantage/core";
import { Store, editedPaths, classifyPaths, listItems, newScratchCache, runStagePass } from "../src/index.ts";

const NOW = new Date("2026-01-05T11:00:00Z");
let dir = "";
let repo = "";

const git = (...args: string[]): void => {
  execFileSync(
    "git",
    ["-c", "user.name=tester", "-c", "user.email=tester@localhost", "-c", "commit.gpgsign=false", ...args],
    { cwd: repo, stdio: "ignore" },
  );
};
const file = (rel: string, text = "x\n"): string => {
  const p = join(repo, ...rel.split("/"));
  mkdirSync(join(p, ".."), { recursive: true });
  writeFileSync(p, text);
  return p;
};

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "vantage-scratch-"));
  repo = join(dir, "repo");
  mkdirSync(repo);
  git("init", "-q");
  file(".gitignore", "build-out/\n*.generated.ts\n");
  file("src/tracked.ts");
  file("src/other.ts");
  git("add", ".");
  git("commit", "-q", "-m", "init");
});
afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

const ignored = (paths: string[], cache = newScratchCache()): string[] =>
  [...classifyPaths(paths, cache, NOW.getTime()).ignored].toSorted();

describe("classifyPaths with real git", () => {
  it("names git-ignored files, and only those", () => {
    const out = file("build-out/gen.ts");
    const generated = file("src/api.generated.ts");
    const tracked = join(repo, "src", "tracked.ts");
    const untracked = file("src/new-source.ts");
    const missing = join(repo, "build-out", "deleted-later.ts"); // ignored and not on disk any more
    expect(ignored([out, generated, tracked, untracked, missing])).toEqual(
      [out, generated, missing].map(normalizeEditPath).toSorted(),
    );
  });

  it("a tracked file is code even when an ignore rule matches it", () => {
    const forced = file("src/forced.generated.ts");
    git("add", "-f", "src/forced.generated.ts");
    git("commit", "-q", "-m", "force add");
    expect(ignored([forced])).toEqual([]);
  });

  it("an untracked source file that is not ignored counts as code", () => {
    expect(ignored([file("src/brand-new.ts")])).toEqual([]);
  });

  it("answers for a path whose folder was removed, by the nearest existing folder", () => {
    const gone = join(repo, "build-out", "deep", "er", "gen.ts");
    expect(ignored([gone])).toEqual([normalizeEditPath(gone)]);
  });

  it("outside any repository, with a bad path or a relative path, nothing is classified", () => {
    const plain = join(dir, "not-a-repo");
    mkdirSync(plain);
    expect(ignored([join(plain, "a.ts"), join(dir, "nope", "x", "a.ts")])).toEqual([]);
    expect(ignored(["relative/a.ts", "", "\0", "C:", "src"])).toEqual([]);
  });

  it("handles file names with spaces and glob characters literally", () => {
    const odd = file("build-out/a [1] #x.ts");
    const plainName = file("src/a [1] #x.ts"); // untracked and not ignored
    expect(ignored([odd, plainName])).toEqual([normalizeEditPath(odd)]);
  });

  it("caches answers: a second ask does not need git, and a path added later is asked again after the TTL", () => {
    const cache = newScratchCache();
    const a = file("build-out/a.ts");
    expect(ignored([a], cache)).toEqual([normalizeEditPath(a)]);
    rmSync(join(repo, ".git"), { recursive: true, force: true }); // git is gone: the cache still answers
    expect(ignored([a], cache)).toEqual([normalizeEditPath(a)]);
    const later = classifyPaths([a], cache, NOW.getTime() + 10 * 60_000); // TTL over, git gone: unclassified
    expect([...later.ignored]).toEqual([]);
  });

  it("answers in batches larger than one call", () => {
    const many = Array.from({ length: 450 }, (_, i) => file(`build-out/f${i}.ts`));
    expect(ignored(many)).toHaveLength(450);
  });
});

const e = (kind: VantageEvent["kind"], payload: Record<string, unknown>): VantageEvent => ({
  sourceId: String(Math.random()),
  source: "claude_code",
  kind,
  timestamp: "2026-01-05T09:00:00Z",
  payload,
});

describe("editedPaths", () => {
  it("collects absolute paths from path and paths, skipping relative, empty and non-edit events", () => {
    const got = editedPaths([
      e("file.edited", { path: "/w/a.ts" }),
      e("file.edited", { paths: ["C:\\w\\b.ts", "rel/c.ts", 5, ""] }),
      e("file.edited", {}),
      e("command.ran", { path: "/w/d.ts" }),
    ]);
    expect([...got].toSorted()).toEqual(["/w/a.ts", "C:\\w\\b.ts"]);
  });
});

describe("through the stage pass", () => {
  let store: Store;
  beforeEach(() => {
    store = new Store(join(dir, "v.db"));
  });
  afterEach(() => {
    store.close();
  });
  let n = 0;
  const put = (
    kind: VantageEvent["kind"],
    m: number,
    branch: string,
    payload: Record<string, unknown>,
  ): void => {
    store.insertEvent(
      {
        sourceId: `g${++n}`,
        source: "claude_code",
        kind,
        timestamp: `2026-01-05T09:0${m}:00Z`,
        sessionId: `s-${branch}`,
        payload: { branch, ...payload },
      },
      "2026-01-05T10:00:00Z",
    );
  };
  const flagsOf = (key: string): string[] =>
    (listItems(store).find((i) => i.itemKey === key)?.flags ?? []).map((f) => f.kind).toSorted();

  it("a git-ignored file edit raises no claim; a tracked file edit does", () => {
    put("file.edited", 1, "feat/ftk-1-ignored", { path: file("build-out/gen.ts") });
    put("session.stopped", 2, "feat/ftk-1-ignored", {});
    put("file.edited", 1, "feat/ftk-2-tracked", { path: join(repo, "src", "tracked.ts") });
    put("session.stopped", 2, "feat/ftk-2-tracked", {});
    runStagePass(store, {}, NOW);
    expect(flagsOf("issue:FTK-1")).toEqual([]);
    expect(listItems(store).find((i) => i.itemKey === "issue:FTK-1")?.stage).toBe("asked");
    expect(flagsOf("issue:FTK-2")).toEqual(["unproven_claim"]);
  });

  it("a log written by the shell (relative, no git needed) raises no claim", () => {
    put("file.edited", 1, "feat/ftk-3-log", { paths: ["daemon.log"], via: "shell" });
    put("session.stopped", 2, "feat/ftk-3-log", {});
    runStagePass(store, { gitScratch: false }, NOW);
    expect(flagsOf("issue:FTK-3")).toEqual([]);
  });

  it("with git switched off only the name rules apply: a file no name rule judges counts as code", () => {
    put("file.edited", 1, "feat/ftk-4-nogit", { path: "/w/proj/build-out/gen.ts" });
    put("session.stopped", 2, "feat/ftk-4-nogit", {});
    runStagePass(store, { gitScratch: false }, NOW);
    expect(flagsOf("issue:FTK-4")).toEqual(["unproven_claim"]);
  });
});

describe("repo-relative paths", () => {
  it("reports each answered path relative to its repo, so a repo under a temp folder is not all scratch", () => {
    const src = join(repo, "src", "tracked.ts");
    const res = classifyPaths([src], newScratchCache(), NOW.getTime());
    expect(res.relative.get(normalizeEditPath(src))).toBe("src/tracked.ts");
    // The temp folder this test repo lives in is not part of the relative path.
    expect(res.relative.get(normalizeEditPath(src))).not.toMatch(/temp|tmp/i);
  });

  it("a code edit inside a repo that lives under a temp folder still counts as code in the stage pass", () => {
    const store = new Store(join(dir, "v2.db"));
    try {
      store.insertEvent(
        {
          sourceId: "r1",
          source: "claude_code",
          kind: "file.edited",
          timestamp: "2026-01-05T09:01:00Z",
          sessionId: "s",
          payload: { branch: "feat/ftk-9-rel", path: join(repo, "src", "tracked.ts") },
        },
        "2026-01-05T10:00:00Z",
      );
      runStagePass(store, {}, NOW);
      expect(listItems(store).find((i) => i.itemKey === "issue:FTK-9")?.stage).toBe("built");
    } finally {
      store.close();
    }
  });
});
