// Synthetic rows only. Covers the Track query API: each parameter, combinations, bad input,
// pagination edges, facets, the recent-flag window with a fake clock, and migrating from version 3.
import { DatabaseSync } from "node:sqlite";
import { request } from "node:http";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { parseTrackQuery, type TrackView, type VantageEvent } from "@vantage/core";
import {
  loadMigrations,
  BIND_HOST,
  Store,
  readFlagWindowHours,
  runStagePass,
  startHttp,
  trackView,
  type HttpHandle,
} from "../src/index.ts";

const NOW = new Date("2026-01-05T11:00:00Z");
const TOKEN = "t".repeat(64);
let dir = "";
let store: Store;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "vantage-track-q-"));
  store = new Store(join(dir, "v.db"));
});
afterEach(() => {
  store.close();
  rmSync(dir, { recursive: true, force: true });
});

interface Seed {
  repo?: string | null;
  branch?: string | null;
  title?: string;
  stage?: string;
  proof?: string;
  edits?: boolean;
  last: string;
  flags?: string[];
}
function seed(key: string, s: Seed): void {
  store.db
    .prepare(
      `INSERT INTO work_items (item_key, title, repo, branch, has_edits, stage, proof_status, first_activity,
         last_activity, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      key,
      s.title ?? key,
      s.repo ?? null,
      s.branch ?? null,
      s.edits === false ? 0 : 1,
      s.stage ?? "built",
      s.proof ?? "none",
      s.last,
      s.last,
      s.last,
      s.last,
    );
  const id = Number(store.db.prepare("SELECT id FROM work_items WHERE item_key = ?").get(key)?.["id"]);
  for (const kind of s.flags ?? []) {
    store.db
      .prepare(
        "INSERT INTO flags (work_item_id, kind, severity, raised_at, reason) VALUES (?, ?, 'amber', ?, ?)",
      )
      .run(id, kind, s.last, `reason for ${kind}`);
  }
}

/** Six items with distinct repos, stages, proofs, flags and ages relative to NOW (2026-01-05 11:00). */
function seedSix(): void {
  seed("A", {
    repo: "alpha",
    branch: "main",
    title: "Alpha billing",
    last: "2026-01-05T10:00:00Z",
    flags: ["thrashing"],
  });
  seed("B", {
    repo: "alpha",
    branch: "feat/x",
    stage: "proven",
    proof: "fresh",
    last: "2026-01-05T09:00:00Z",
  });
  seed("C", {
    repo: "beta",
    branch: "main",
    stage: "asked",
    edits: false,
    title: "beta · main · Jan 3",
    last: "2026-01-03T12:00:00Z",
  });
  seed("D", {
    repo: "beta",
    branch: "dev",
    proof: "failed",
    last: "2025-12-20T12:00:00Z",
    flags: ["unproven_claim", "thrashing"],
  });
  seed("E", { stage: "asked", edits: false, last: "2025-11-01T12:00:00Z", flags: ["forgotten"] });
  seed("F", {
    repo: "alpha",
    branch: "main",
    stage: "verified",
    proof: "fresh",
    last: "2026-01-05T08:00:00Z",
  });
}

function view(qs = ""): TrackView {
  const p = parseTrackQuery(new URLSearchParams(qs));
  if (!p.ok) throw new Error(p.error);
  return trackView(store, NOW, p.query);
}
const ids = (r: TrackView): string[] => r.groups.flatMap((g) => g.items.map((i) => i.id));
const flat = (qs: string): string[] => ids(view(`group=none&since=all&${qs}`));

describe("defaults", () => {
  it("hides items older than 7 days, groups by attention, newest first, with page and facets", () => {
    seedSix();
    const r = view();
    expect(r.page).toEqual({ page: 1, pageSize: 25, total: 4, pages: 1 });
    expect(r.groups.map((g) => [g.id, g.total, g.items.map((i) => i.id)])).toEqual([
      ["needs_you", 1, ["A"]],
      ["in_progress", 2, ["B", "C"]],
      ["waiting", 0, []],
      ["forgotten", 0, []],
      ["done", 1, ["F"]],
    ]);
    expect(r.groups[0]).toMatchObject({ attention: "needs_you", label: "Needs you" });
  });

  it("returns the item fields the UI needs, flag reasons included", () => {
    seedSix();
    const a = view().groups[0]?.items[0];
    expect(a).toMatchObject({
      id: "A",
      branch: "main",
      hasEdits: true,
      flags: [{ kind: "thrashing", severity: "amber", reason: "reason for thrashing" }],
      lastActivity: "2026-01-05T10:00:00Z",
    });
  });
});

const since = (v: string): string[] => ids(view(`group=none&since=${v}`));

describe("filters", () => {
  beforeEach(seedSix);

  it("repo and branch accept lists and combine with AND across parameters", () => {
    expect(flat("repo=alpha")).toEqual(["A", "B", "F"]);
    expect(flat("repo=alpha,beta")).toHaveLength(5);
    expect(flat("branch=main")).toEqual(["A", "F", "C"]);
    expect(flat("repo=alpha&branch=main")).toEqual(["A", "F"]);
  });

  it("stage and proof", () => {
    expect(flat("stage=asked")).toEqual(["C", "E"]);
    expect(flat("stage=asked,proven")).toEqual(["B", "C", "E"]);
    expect(flat("proof=fresh")).toEqual(["B", "F"]);
    expect(flat("proof=failed")).toEqual(["D"]);
    expect(flat("proof=none&stage=built")).toEqual(["A"]);
  });

  it("flag: a kind, several kinds (any of), and none", () => {
    expect(flat("flag=thrashing")).toEqual(["A", "D"]);
    expect(flat("flag=unproven_claim,forgotten")).toEqual(["D", "E"]);
    expect(flat("flag=none")).toEqual(["B", "F", "C"]);
    expect(flat("flag=none,forgotten")).toEqual(["B", "F", "C", "E"]);
  });

  it("a cleared or dismissed flag does not count", () => {
    store.db.exec("UPDATE flags SET dismissed = 1 WHERE kind = 'thrashing'");
    expect(flat("flag=thrashing")).toEqual([]);
    expect(flat("flag=none")).toContain("A");
  });

  it("since: 24h, 7d, 30d and all", () => {
    expect(since("24h")).toEqual(["A", "B", "F"]);
    expect(since("7d")).toEqual(["A", "B", "F", "C"]);
    expect(since("30d")).toEqual(["A", "B", "F", "C", "D"]);
    expect(since("all")).toHaveLength(6);
  });

  it("hasEdits", () => {
    expect(flat("hasEdits=false")).toEqual(["C", "E"]);
    expect(flat("hasEdits=true")).toEqual(["A", "B", "F", "D"]);
  });

  it("q matches title, repo and branch case-insensitively, and only those", () => {
    expect(flat("q=BILLING")).toEqual(["A"]);
    expect(flat("q=beta")).toEqual(["C", "D"]);
    expect(flat("q=feat/x")).toEqual(["B"]);
    expect(flat("q=reason")).toEqual([]); // flag text is not searched
    expect(flat("q=zzz")).toEqual([]);
  });

  it("q is a substring, not a pattern: wildcards and quotes match literally and never break the query", () => {
    seed("W", { title: "100% done_ok", last: "2026-01-05T10:30:00Z" });
    expect(flat("q=100%25")).toEqual(["W"]);
    expect(flat("q=%25")).toEqual(["W"]);
    expect(flat("q=done_ok")).toEqual(["W"]);
    expect(flat("q=_")).toEqual(["W"]);
    expect(flat("q=a_c")).toEqual([]);
    expect(flat("q=%27%20OR%201%3D1%20--")).toEqual([]);
    expect(flat("q=%5C")).toEqual([]);
    expect(flat("repo=%27%3B%20DROP%20TABLE%20work_items%3B%20--")).toEqual([]);
    expect(Number(store.db.prepare("SELECT COUNT(*) AS n FROM work_items").get()?.["n"])).toBe(7);
  });
});

describe("sorting", () => {
  beforeEach(seedSix);
  it("activity desc by default, asc on request", () => {
    expect(flat("")).toEqual(["A", "B", "F", "C", "D", "E"]);
    expect(flat("order=asc")).toEqual(["E", "D", "C", "F", "B", "A"]);
  });
  it("stage in lifecycle order, ties by newest activity", () => {
    expect(flat("sort=stage&order=asc")).toEqual(["C", "E", "A", "D", "B", "F"]);
    expect(flat("sort=stage&order=desc")).toEqual(["F", "B", "A", "D", "C", "E"]);
  });
  it("title, repo (no repo sorts first ascending) and flags (open flag count)", () => {
    expect(flat("sort=title&order=asc")).toEqual(["A", "B", "C", "D", "E", "F"]);
    expect(flat("sort=repo&order=asc")).toEqual(["E", "A", "B", "F", "C", "D"]);
    expect(flat("sort=flags&order=desc")).toEqual(["D", "A", "E", "B", "F", "C"]);
  });
});

describe("groups", () => {
  beforeEach(seedSix);
  it("repo groups carry id, label and the total across the filter; no-repo goes last", () => {
    const r = view("group=repo&since=all");
    expect(r.groups.map((g) => [g.id, g.label, g.total, g.items.length])).toEqual([
      ["repo:alpha", "alpha", 3, 3],
      ["repo:beta", "beta", 2, 2],
      ["repo:", "No repo", 1, 1],
    ]);
    expect(r.groups[0]?.attention).toBeUndefined();
  });
  it("stage groups follow the lifecycle order", () => {
    expect(view("group=stage&since=all").groups.map((g) => [g.id, g.total])).toEqual([
      ["stage:asked", 2],
      ["stage:built", 2],
      ["stage:proven", 1],
      ["stage:verified", 1],
    ]);
  });
  it("none is one group; its total is the whole filter", () => {
    const r = view("group=none&since=all&pageSize=2");
    expect(r.groups).toHaveLength(1);
    expect(r.groups[0]).toMatchObject({ id: "all", total: 6 });
    expect(r.groups[0]?.items).toHaveLength(2);
  });
  it("a group's total counts the whole filter while its items are only the current page", () => {
    const r = view("since=all&pageSize=1&page=1");
    expect(r.groups.find((g) => g.id === "needs_you")).toMatchObject({ total: 2 }); // A and D
    expect(r.groups.find((g) => g.id === "forgotten")).toMatchObject({ total: 1 }); // E
    expect(ids(r)).toEqual(["A"]);
  });
});

describe("pagination", () => {
  it("empty result: zero total, one page, no items", () => {
    const r = view("since=all");
    expect(r.page).toEqual({ page: 1, pageSize: 25, total: 0, pages: 1 });
    expect(ids(r)).toEqual([]);
    expect(r.groups.map((g) => g.total)).toEqual([0, 0, 0, 0, 0]);
  });
  it("splits the flat sorted list, the last page is short, and a page past the end is empty, not an error", () => {
    seedSix();
    expect(ids(view("group=none&since=all&pageSize=4&page=1"))).toEqual(["A", "B", "F", "C"]);
    const last = view("group=none&since=all&pageSize=4&page=2");
    expect(ids(last)).toEqual(["D", "E"]);
    expect(last.page).toEqual({ page: 2, pageSize: 4, total: 6, pages: 2 });
    const past = view("group=none&since=all&pageSize=4&page=9");
    expect(ids(past)).toEqual([]);
    expect(past.page).toEqual({ page: 9, pageSize: 4, total: 6, pages: 2 });
  });
  it("an exact multiple does not invent a trailing page", () => {
    seedSix();
    expect(view("since=all&pageSize=3").page.pages).toBe(2);
  });
  it("pages never overlap and cover everything, whatever the sort", () => {
    seedSix();
    for (const sort of ["activity", "stage", "title", "repo", "flags"]) {
      const seen = [1, 2, 3, 4].flatMap((p) => flat(`sort=${sort}&pageSize=2&page=${p}`));
      expect(seen.toSorted()).toEqual(["A", "B", "C", "D", "E", "F"]);
    }
  });
});

describe("facets", () => {
  beforeEach(seedSix);

  it("count each dimension over the items that pass every other filter, never its own", () => {
    const f = view("since=all&repo=alpha").facets;
    expect(f.repo).toEqual({ alpha: 3, beta: 2 }); // own filter not applied
    expect(f.stage).toMatchObject({ built: 1, proven: 1, verified: 1, asked: 0 }); // alpha only
    expect(f.branch).toEqual({ main: 2, "feat/x": 1 }); // alpha only; the branch filter itself is not applied;
  });

  it("zero-fill the known values: stage, proof, flag, age and hasEdits", () => {
    const f = view("since=all").facets;
    expect(f.stage).toEqual({ asked: 2, built: 2, proven: 1, reviewed: 0, shipped: 0, verified: 1 });
    expect(f.proof).toEqual({ none: 3, fresh: 2, expired: 0, failed: 1, weak: 0, not_required: 0 });
    expect(f.flag).toEqual({ thrashing: 2, unproven_claim: 1, forgotten: 1, none: 3 });
    expect(f.hasEdits).toEqual({ true: 4, false: 2 });
  });

  it("age buckets ignore the since filter, so they show what a wider window adds", () => {
    expect(view("since=24h").facets.age).toEqual({ today: 3, week: 1, older: 2 });
    expect(view("since=all").facets.age).toEqual({ today: 3, week: 1, older: 2 });
  });

  it("react to the other filters, text search included", () => {
    const f = view("since=all&q=beta&flag=thrashing").facets;
    expect(f.repo).toEqual({ beta: 1 });
    expect(f.flag).toEqual({ thrashing: 1, unproven_claim: 1, forgotten: 0, none: 1 });
  });

  it("an empty store gives all-zero facets", () => {
    store.db.exec("DELETE FROM flags; DELETE FROM work_items");
    const f = view().facets;
    expect(f.repo).toEqual({});
    expect(f.hasEdits).toEqual({ true: 0, false: 0 });
    expect(f.age).toEqual({ today: 0, week: 0, older: 0 });
  });
});

describe("scale", () => {
  it("3000 items: a combined query with search, sort by flags and all facets stays well under budget", () => {
    store.transaction(() => {
      for (let i = 0; i < 3000; i++) {
        seed(`S${i}`, {
          repo: `repo${i % 7}`,
          branch: `b${i % 30}`,
          title: `Synthetic ${i}`,
          stage: ["asked", "built", "proven"][i % 3] ?? "built",
          edits: i % 4 !== 0,
          last: new Date(NOW.getTime() - i * 600_000).toISOString().replace(/\.\d{3}Z$/, "Z"),
          flags: i % 5 === 0 ? ["thrashing"] : [],
        });
      }
    });
    const t0 = performance.now();
    const r = view("since=30d&q=synth&sort=flags&order=desc&repo=repo1,repo2&page=3&pageSize=50");
    const ms = performance.now() - t0;
    expect(r.page.total).toBeGreaterThan(100);
    expect(ids(r)).toHaveLength(50);
    expect(ms).toBeLessThan(250);
  });
});

describe("recent-flag window through the stage pass (fake clock)", () => {
  let n = 0;
  const put = (
    branch: string,
    kind: VantageEvent["kind"],
    iso: string,
    payload: Record<string, unknown>,
  ): void => {
    store.insertEvent(
      {
        sourceId: `w${++n}`,
        source: "claude_code",
        kind,
        timestamp: iso,
        sessionId: `s-${branch}`,
        payload: { branch, ...payload },
      },
      iso,
    );
  };
  const thrash = (branch: string, day: string): void => {
    for (let i = 0; i < 3; i++) {
      put(branch, "file.edited", `${day}T09:0${i * 2}:00Z`, {
        path: "/w/deep/foo.ts",
        cwd: "/home/u/proj-a",
      });
      put(branch, "command.ran", `${day}T09:0${i * 2 + 1}:00Z`, { command: "pnpm vitest run", ok: false });
    }
    put(branch, "session.stopped", `${day}T09:10:00Z`, {});
  };

  it("flags a fresh item and leaves a 14-day-old item with its stage and proof but no flag", () => {
    thrash("feat/ftk-1-fresh", "2026-01-05");
    thrash("feat/ftk-2-old", "2025-12-22");
    runStagePass(store, {}, NOW);
    const r = view("since=all&group=none");
    const byId = Object.fromEntries(r.groups[0]?.items.map((i) => [i.id, i]) ?? []);
    expect(byId["issue:FTK-1"]?.flags.map((f) => f.kind).toSorted()).toEqual(["thrashing", "unproven_claim"]);
    expect(byId["issue:FTK-1"]?.flags[0]?.reason).not.toContain("deep");
    expect(byId["issue:FTK-2"]?.flags.filter((f) => f.kind !== "forgotten")).toEqual([]);
    expect(byId["issue:FTK-2"]).toMatchObject({ stage: "built", proofStatus: "failed" });
    // The Needs you group no longer fills with backfilled history.
    const attention = view("since=all").groups;
    expect(attention.find((g) => g.id === "needs_you")?.items.map((i) => i.id)).toEqual(["issue:FTK-1"]);
    // The old item had code edits, so it is a forgotten item, not an urgent one.
    expect(attention.find((g) => g.id === "forgotten")?.items.map((i) => i.id)).toEqual(["issue:FTK-2"]);
    expect(view("since=all&flag=thrashing").page.total).toBe(1);
  });

  it("a flag clears on a later pass once the item ages out, and honors a custom window", () => {
    thrash("feat/ftk-1-fresh", "2026-01-05");
    runStagePass(store, {}, NOW);
    expect(view("flag=thrashing").page.total).toBe(1);
    runStagePass(store, {}, new Date("2026-01-08T11:00:00Z")); // 74 h later
    expect(view("since=all&flag=thrashing").page.total).toBe(0);
    runStagePass(store, { flagWindowHours: 200 }, new Date("2026-01-08T11:00:00Z"));
    expect(view("since=all&flag=thrashing").page.total).toBe(1);
  });

  /** A default-branch session becomes an item only once it edits something; a docs edit is not code. */
  const putDocEdit = (sessionId: string): void => {
    store.insertEvent(
      {
        sourceId: `d${++n}`,
        source: "claude_code",
        kind: "file.edited",
        timestamp: "2026-01-05T08:05:00Z",
        sessionId,
        payload: { cwd: "/home/u/claude-code", branch: "main", path: "/w/README.md" },
      },
      "2026-01-05T08:05:00Z",
    );
  };

  it("untitled sessions get a title from repo, branch and the first activity date, never from prompts", () => {
    store.insertEvent(
      {
        sourceId: "p1",
        source: "claude_code",
        kind: "prompt.submitted",
        timestamp: "2026-01-05T08:00:00Z",
        sessionId: "abcdef1234567890",
        payload: { cwd: "/home/u/claude-code", prompt: "SECRET PROMPT TEXT", branch: "main" },
      },
      "2026-01-05T08:00:00Z",
    );
    putDocEdit("abcdef1234567890");
    runStagePass(store, {}, NOW);
    const [item] = view("since=all&group=none").groups[0]?.items ?? [];
    expect(item).toMatchObject({
      // No scanned worktree contains /home/u/claude-code, so it has no repo and the folder is not shown.
      title: "main · Jan 5",
      repo: null,
      branch: "main",
      hasEdits: false,
    });
    expect(JSON.stringify(view("since=all"))).not.toContain("SECRET");
  });

  it("rewrites the title of a row the older release stored as Session <id>", () => {
    seed("session:abcdef1234567890", { title: "Session abcdef12", last: "2026-01-05T08:00:00Z" });
    store.insertEvent(
      {
        sourceId: "p2",
        source: "claude_code",
        kind: "prompt.submitted",
        timestamp: "2026-01-05T08:00:00Z",
        sessionId: "abcdef1234567890",
        payload: { cwd: "/home/u/claude-code", branch: "main" },
      },
      "2026-01-05T08:00:00Z",
    );
    putDocEdit("abcdef1234567890");
    runStagePass(store, {}, NOW);
    expect(view("since=all&group=none").groups[0]?.items[0]?.title).toBe("main · Jan 5");
  });
});

const plan = (sql: string): string =>
  store.db
    .prepare(`EXPLAIN QUERY PLAN ${sql}`)
    .all()
    .map((r) => String(r["detail"]))
    .join(" | ");

describe("migration 5", () => {
  it("upgrades a version 4 database in place: rows keep their data, new columns and indexes appear", () => {
    const path = join(dir, "v4.db");
    const old = new DatabaseSync(path);
    old.exec(`
      CREATE TABLE schema_meta (version INTEGER NOT NULL);
      INSERT INTO schema_meta (version) VALUES (4);
      CREATE TABLE events (id INTEGER PRIMARY KEY AUTOINCREMENT, source TEXT NOT NULL, source_id TEXT NOT NULL,
        kind TEXT NOT NULL, occurred_at TEXT NOT NULL, ingested_at TEXT NOT NULL, session_id TEXT, repo TEXT,
        payload_json TEXT NOT NULL, payload_version INTEGER NOT NULL DEFAULT 1, UNIQUE (source, source_id));
      CREATE TABLE cursors (source TEXT PRIMARY KEY, cursor TEXT NOT NULL, updated_at TEXT NOT NULL);
      CREATE TABLE links (event_id INTEGER NOT NULL REFERENCES events (id), item_key TEXT NOT NULL,
        method TEXT NOT NULL, anchor_kind TEXT NOT NULL, anchor_value TEXT NOT NULL, rule TEXT NOT NULL,
        confidence REAL NOT NULL, created_at TEXT NOT NULL, undone_at TEXT, PRIMARY KEY (event_id, item_key));
      CREATE TABLE work_items (id INTEGER PRIMARY KEY AUTOINCREMENT, item_key TEXT NOT NULL UNIQUE,
        kind TEXT NOT NULL DEFAULT 'own_work', title TEXT NOT NULL, project_id INTEGER, repo TEXT, stage TEXT NOT NULL,
        sub_state TEXT, proof_status TEXT NOT NULL, proof_level INTEGER NOT NULL DEFAULT 0,
        docs_only INTEGER NOT NULL DEFAULT 0, parked INTEGER NOT NULL DEFAULT 0, parent_id INTEGER,
        first_activity TEXT NOT NULL, last_activity TEXT NOT NULL, created_at TEXT NOT NULL, updated_at TEXT NOT NULL);
      CREATE TABLE proofs (id INTEGER PRIMARY KEY AUTOINCREMENT, work_item_id INTEGER NOT NULL, event_id INTEGER NOT NULL,
        type TEXT NOT NULL, level INTEGER NOT NULL, source TEXT NOT NULL, command TEXT NOT NULL, cwd TEXT,
        started_at TEXT NOT NULL, state TEXT NOT NULL, weak_reason TEXT, expired_by_event_id INTEGER,
        fingerprint TEXT NOT NULL);
      CREATE TABLE flags (id INTEGER PRIMARY KEY AUTOINCREMENT, work_item_id INTEGER NOT NULL, kind TEXT NOT NULL,
        severity TEXT NOT NULL, raised_at TEXT NOT NULL, cleared_at TEXT, dismissed INTEGER NOT NULL DEFAULT 0,
        reason TEXT NOT NULL, UNIQUE (work_item_id, kind));
      CREATE TABLE stage_changes (id INTEGER PRIMARY KEY AUTOINCREMENT, work_item_id INTEGER NOT NULL,
        from_stage TEXT, to_stage TEXT NOT NULL, at TEXT NOT NULL, event_id INTEGER NOT NULL, reason TEXT NOT NULL);
      CREATE VIEW item_sessions AS SELECT l.item_key AS item_key, 0 AS session_count, 0 AS derived_count, 0 AS subagent_count FROM links l;
      INSERT INTO work_items (item_key, title, repo, stage, proof_status, first_activity, last_activity, created_at, updated_at)
        VALUES ('issue:OLD-1', 'Old item', 'r', 'built', 'none', '2026-01-05T09:00:00Z', '2026-01-05T09:00:00Z',
          '2026-01-05T09:00:00Z', '2026-01-05T09:00:00Z');
    `);
    old.close();
    const upgraded = new Store(path);
    try {
      expect(Number(upgraded.db.prepare("SELECT version FROM schema_meta").get()?.["version"])).toBe(
        loadMigrations().length,
      );
      const idx = upgraded.db
        .prepare("SELECT name FROM sqlite_master WHERE type = 'index' AND tbl_name = 'work_items'")
        .all()
        .map((r) => String(r["name"]));
      expect(idx).toEqual(
        expect.arrayContaining(["work_items_activity", "work_items_repo", "work_items_stage"]),
      );
      const p = parseTrackQuery(new URLSearchParams("since=all"));
      if (!p.ok) throw new Error(p.error);
      const r = trackView(upgraded, NOW, p.query);
      expect(r.page.total).toBe(1);
      expect(r.groups.flatMap((g) => g.items)[0]).toMatchObject({
        id: "issue:OLD-1",
        title: "Old item",
        branch: null,
        hasEdits: true, // until the next pass rewrites it
      });
    } finally {
      upgraded.close();
    }
  });

  it("the filter and sort queries use the new indexes", () => {
    expect(
      plan("SELECT * FROM work_items w WHERE w.last_activity >= 'x' ORDER BY w.last_activity DESC LIMIT 25"),
    ).toContain("work_items_activity");
    expect(plan("SELECT * FROM work_items w WHERE w.repo = 'a' AND w.last_activity >= 'x'")).toContain(
      "work_items_repo",
    );
  });
});

const read = (text: string | null): number | undefined => {
  const home = join(dir, "home");
  rmSync(home, { recursive: true, force: true });
  if (text !== null) {
    rmSync(home, { recursive: true, force: true });
    writeFileSync(join(dir, "config.toml"), text);
  }
  return readFlagWindowHours(dir);
};
describe("config flag_window_hours", () => {
  it("reads a whole number of hours and ignores everything else", () => {
    expect(read("flag_window_hours = 72\n")).toBe(72);
    expect(read('repos = ["/a"]\n  flag_window_hours = 6 # six hours\n')).toBe(6);
    expect(read("flag_window_hours = 0\n")).toBeUndefined();
    expect(read("flag_window_hours = 99999\n")).toBeUndefined();
    expect(read("flag_window_hours = soon\n")).toBeUndefined();
    expect(read("# flag_window_hours = 5\n")).toBeUndefined();
    expect(read("repos = []\n")).toBeUndefined();
  });
  it("a missing config means the default", () => {
    expect(readFlagWindowHours(join(dir, "nowhere"))).toBeUndefined();
  });
});

describe("GET /api/track over HTTP", () => {
  let http: HttpHandle;
  beforeEach(async () => {
    seedSix();
    http = await startHttp({ store, token: TOKEN, now: () => NOW });
  });
  afterEach(async () => {
    await http.close();
  });
  const get = (path: string, token = true): Promise<{ status: number; body: string }> =>
    new Promise((resolve, reject) => {
      const req = request(
        {
          host: BIND_HOST,
          port: http.port,
          path,
          headers: { host: `127.0.0.1:${http.port}`, ...(token ? { authorization: `Bearer ${TOKEN}` } : {}) },
        },
        (res) => {
          let body = "";
          res.on("data", (c: Buffer) => (body += c.toString()));
          res.on("end", () => resolve({ status: res.statusCode ?? 0, body }));
        },
      );
      req.on("error", reject);
      req.end();
    });

  it("serves a filtered, paged query", async () => {
    const r = await get("/api/track?repo=alpha&since=all&group=none&sort=title&order=asc&pageSize=2&page=2");
    expect(r.status).toBe(200);
    const body = JSON.parse(r.body);
    expect(body.page).toEqual({ page: 2, pageSize: 2, total: 3, pages: 2 });
    expect(body.groups[0].items.map((i: { id: string }) => i.id)).toEqual(["F"]);
    expect(body.facets.repo).toEqual({ alpha: 3, beta: 2 });
  });

  it.each([
    "stage=nope",
    "page=0",
    "pageSize=1000",
    "sort=title%3B%20DROP%20TABLE%20x",
    "q=" + "x".repeat(81),
    "bogus=1",
    "hasEdits=maybe",
  ])("answers 400 with a plain error for %s, never a crash", async (qs) => {
    const r = await get(`/api/track?${qs}`);
    expect(r.status).toBe(400);
    expect(JSON.parse(r.body)).toEqual({ error: expect.any(String) });
    expect(r.body).not.toContain("DROP");
    expect((await get("/api/track")).status).toBe(200); // the server is still fine
  });

  it("still needs the header token, and a token in the query string does not count", async () => {
    expect((await get("/api/track", false)).status).toBe(401);
    expect((await get(`/api/track?token=${TOKEN}`, false)).status).toBe(401);
    expect((await get(`/api/track?token=${TOKEN}`)).status).toBe(400); // unknown parameter
  });
});

const group = (id: string, at: Date): string[] => {
  const p = parseTrackQuery(new URLSearchParams("since=all&pageSize=100"));
  if (!p.ok) throw new Error(p.error);
  return (
    trackView(store, at, p.query)
      .groups.find((g) => g.id === id)
      ?.items.map((i) => i.id)
      .toSorted() ?? []
  );
};

describe("forgotten and session counts through the stage pass (fake clock, proposed D94)", () => {
  let n = 0;
  const put = (
    branch: string,
    kind: VantageEvent["kind"],
    iso: string,
    session: string,
    payload: Record<string, unknown> = {},
  ): void => {
    store.insertEvent(
      {
        sourceId: `f${++n}`,
        source: "claude_code",
        kind,
        timestamp: iso,
        sessionId: session,
        payload: { branch, ...payload },
      },
      iso,
    );
  };

  it("a backfilled conversation gets no flag, now or later; fresh conversations and old work do", () => {
    // All three events are 20 days old when the first pass sees them.
    put("feat/ftk-1-chat", "prompt.submitted", "2025-12-16T09:00:00Z", "s1"); // conversation, no edit
    put("feat/ftk-2-work", "file.edited", "2025-12-16T09:00:00Z", "s2", { path: "/w/a.ts" }); // code edit
    runStagePass(store, {}, NOW);
    expect(group("forgotten", NOW)).toEqual(["issue:FTK-2"]);
    expect(group("in_progress", NOW)).toEqual(["issue:FTK-1"]);
    // A later pass still does not flag the conversation: it was already stale when first seen.
    const later = new Date("2026-01-20T11:00:00Z");
    runStagePass(store, {}, later);
    expect(group("forgotten", later)).toEqual(["issue:FTK-2"]);
    expect(group("in_progress", later)).toEqual(["issue:FTK-1"]);
  });

  it("a conversation that was fresh when first seen is flagged once it goes idle", () => {
    put("feat/ftk-3-fresh", "prompt.submitted", "2026-01-05T09:00:00Z", "s3");
    runStagePass(store, {}, NOW);
    expect(group("forgotten", NOW)).toEqual([]);
    const later = new Date("2026-01-12T11:00:00Z"); // 7 days idle
    runStagePass(store, {}, later);
    expect(group("forgotten", later)).toEqual(["issue:FTK-3"]);
  });

  it("only thrashing and unproven_claim count as Needs you; the flag facet keeps all three kinds", () => {
    put("feat/ftk-2-work", "file.edited", "2025-12-16T09:00:00Z", "s2", { path: "/w/a.ts" });
    put("feat/ftk-4-claim", "file.edited", "2026-01-05T09:00:00Z", "s4", { path: "/w/b.ts" });
    put("feat/ftk-4-claim", "session.stopped", "2026-01-05T09:05:00Z", "s4");
    runStagePass(store, {}, NOW);
    expect(group("needs_you", NOW)).toEqual(["issue:FTK-4"]);
    expect(group("forgotten", NOW)).toEqual(["issue:FTK-2"]);
    const p = parseTrackQuery(new URLSearchParams("since=all"));
    if (!p.ok) throw new Error(p.error);
    expect(trackView(store, NOW, p.query).facets.flag).toEqual({
      thrashing: 0,
      unproven_claim: 1,
      forgotten: 1,
      none: 0,
    });
  });

  it("items carry sessionCount and derivedCount, defaulting to 1 and 0", () => {
    put("feat/ftk-5-multi", "file.edited", "2026-01-05T08:00:00Z", "sa", { path: "/w/a.ts" });
    put("feat/ftk-5-multi", "file.edited", "2026-01-05T09:00:00Z", "sb", { path: "/w/a.ts" });
    store.insertEvent(
      {
        sourceId: "derived-sb",
        source: "claude_code",
        kind: "session.derived",
        timestamp: "2026-01-05T09:00:00Z",
        sessionId: "sb",
        payload: { parentSessionId: "sa", lineage: "continuation", signal: "transcript-history" },
      },
      "2026-01-05T09:00:00Z",
    );
    seed("plain", { repo: "r", last: "2026-01-05T10:00:00Z" }); // no linked session at all
    const p = parseTrackQuery(new URLSearchParams("since=all&group=none"));
    if (!p.ok) throw new Error(p.error);
    const items = (): Record<string, TrackView["groups"][number]["items"][number]> =>
      Object.fromEntries((trackView(store, NOW, p.query).groups[0]?.items ?? []).map((i) => [i.id, i]));
    expect(items()["plain"]).toMatchObject({ sessionCount: 1, derivedCount: 0 });
    runStagePass(store, {}, NOW);
    expect(items()["issue:FTK-5"]).toMatchObject({ sessionCount: 2, derivedCount: 1 });
  });
});
