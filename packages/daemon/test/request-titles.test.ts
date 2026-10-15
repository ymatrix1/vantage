// Synthetic transcripts only. Secret-looking strings are made up and match no real service.
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  Store,
  backfillTranscripts,
  clearRequestTitles,
  listRequestTitles,
  readRequestTitlesEnabled,
  runStagePass,
  trackView,
  writeStatusFile,
} from "../src/index.ts";

const NOW = new Date("2026-01-05T11:00:00Z");
const SID = "abcdef12-3456-7890-abcd-ef1234567890";
let dir = "";
let projects = "";
let store: Store;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "vantage-req-titles-"));
  projects = join(dir, "projects");
  mkdirSync(join(projects, "demo"), { recursive: true });
  store = new Store(join(dir, "v.db"));
  // The session ran in a scanned worktree of acme/demo, so the fallback title names that repo.
  store.insertEvent(
    {
      source: "git",
      sourceId: "git:github.com/acme/demo#abc:scan:/home/u/demo:x:1",
      kind: "worktree.scanned",
      timestamp: "2026-01-05T07:00:00Z",
      payload: { worktree: "/home/u/demo", branch: "main", head: "aaaaaaa", dirty: [] },
    },
    "2026-01-05T07:00:00Z",
  );
});
afterEach(() => {
  store.close();
  rmSync(dir, { recursive: true, force: true });
});

const user = (content: unknown, uuid: string, m: number, extra: Record<string, unknown> = {}): string =>
  JSON.stringify({
    type: "user",
    uuid,
    sessionId: SID,
    timestamp: `2026-01-05T09:0${m}:00Z`,
    cwd: "/home/u/demo",
    gitBranch: "main",
    isSidechain: false,
    message: { role: "user", content },
    ...extra,
  });
const edit = (uuid: string, m: number, extra: Record<string, unknown> = {}): string =>
  JSON.stringify({
    type: "assistant",
    uuid,
    sessionId: SID,
    timestamp: `2026-01-05T09:0${m}:00Z`,
    cwd: "/home/u/demo",
    gitBranch: "main",
    isSidechain: false,
    message: {
      role: "assistant",
      content: [{ type: "tool_use", id: `t-${uuid}`, name: "Edit", input: { file_path: "/w/a.ts" } }],
    },
    ...extra,
  });
const write = (name: string, lines: string[]): string => {
  const p = join(projects, "demo", name);
  writeFileSync(p, lines.join("\n") + "\n");
  return p;
};
const ingest = (titles = true): void => {
  backfillTranscripts(store, projects, NOW, undefined, titles);
};
const items = (): { title: string; source: string | undefined; id: string }[] =>
  trackView(store, NOW, {
    repo: [],
    branch: [],
    stage: [],
    proof: [],
    flag: [],
    since: "all",
    hasEdits: null,
    q: "",
    sort: "activity",
    order: "desc",
    group: "none",
    page: 1,
    pageSize: 100,
  }).groups.flatMap((g) => g.items.map((i) => ({ id: i.id, title: i.title, source: i.titleSource })));
/** Every table, as text: where a leaked string would show up. */
const dump = (): string =>
  store.db
    .prepare("SELECT name FROM sqlite_master WHERE type = 'table'")
    .all()
    .map((t) => JSON.stringify(store.db.prepare(`SELECT * FROM ${String(t["name"])}`).all()))
    .join("\n");

describe("request titles", () => {
  it("titles a provisional session item with the first sentence of the first request", () => {
    write(`${SID}.jsonl`, [
      user("Add pagination to the track page. Then update every doc BODYMARKER", "u1", 0),
      edit("a1", 1),
      user("Second request mentions SECONDMARKER", "u2", 2),
    ]);
    ingest();
    runStagePass(store, {}, NOW);
    expect(items()).toEqual([
      { id: `session:${SID}`, title: "Add pagination to the track page", source: "request" },
    ]);
    expect(listRequestTitles(store)).toMatchObject([
      { sessionId: SID, title: "Add pagination to the track page" },
    ]);
  });

  it("stores no other part of any prompt, in any table", () => {
    write(`${SID}.jsonl`, [
      user("Fix the parser. BODYMARKER lives in the rest of the first request", "u1", 0),
      edit("a1", 1),
      user("SECONDMARKER is a later request", "u2", 2),
    ]);
    ingest();
    runStagePass(store, {}, NOW);
    const all = dump();
    expect(all).not.toContain("BODYMARKER");
    expect(all).not.toContain("SECONDMARKER");
    expect(all).toContain("Fix the parser");
  });

  it("strips secrets, paths and markup before storing; the raw text is never stored", () => {
    const secret = ["sk", "-ant-api03-ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"].join("");
    write(`${SID}.jsonl`, [
      user(
        `Deploy with ${secret} to /home/u/demo/out using password=hunter2 from https://x.example/y`,
        "u1",
        0,
      ),
      edit("a1", 1),
    ]);
    ingest();
    runStagePass(store, {}, NOW);
    expect(listRequestTitles(store)[0]?.title).toBe("Deploy with to using from");
    const all = dump();
    for (const s of [secret, "sk-ant", "hunter2", "/home/u/demo/out", "x.example"])
      expect(all).not.toContain(s);
  });

  it("caps a very long first line at 80 characters", () => {
    write(`${SID}.jsonl`, [
      user(["Please ", "improve the thing "].join("").repeat(40), "u1", 0),
      edit("a1", 1),
    ]);
    ingest();
    expect(Array.from(listRequestTitles(store)[0]?.title ?? "").length).toBeLessThanOrEqual(80);
  });

  it("leaves an empty or unusable first request on the fallback title and never reads the second", () => {
    write(`${SID}.jsonl`, [
      user("/clear", "u1", 0),
      edit("a1", 1),
      user("A perfectly good second request", "u2", 2),
    ]);
    ingest();
    runStagePass(store, {}, NOW);
    expect(listRequestTitles(store)).toEqual([]);
    expect(items()[0]).toMatchObject({ title: "acme/demo · main · Jan 5", source: "fallback" });
  });

  it("an empty prompt stores nothing", () => {
    write(`${SID}.jsonl`, [user("", "u1", 0), edit("a1", 1)]);
    ingest();
    expect(listRequestTitles(store)).toEqual([]);
  });

  it("is idempotent: re-ingesting and re-running the pass changes nothing", () => {
    write(`${SID}.jsonl`, [user("Add a title column", "u1", 0), edit("a1", 1)]);
    ingest();
    runStagePass(store, {}, NOW);
    const state = (): string[] =>
      ["events", "session_titles", "cursors"]
        .map((t) => JSON.stringify(store.db.prepare(`SELECT * FROM ${t}`).all()))
        .concat(JSON.stringify(items()));
    const before = state();
    ingest();
    ingest();
    runStagePass(store, {}, NOW);
    expect(state()).toEqual(before);
    expect(listRequestTitles(store)).toHaveLength(1);
  });

  it("keeps the first title even if the transcript is rewritten with another first request", () => {
    write(`${SID}.jsonl`, [user("Original request here", "u1", 0), edit("a1", 1)]);
    ingest();
    write(`${SID}.jsonl`, [user("Rewritten request here", "u1", 0), edit("a1", 1)]);
    ingest();
    expect(listRequestTitles(store)[0]?.title).toBe("Original request here");
  });

  it("titles sessions that were ingested before the feature existed", () => {
    write(`${SID}.jsonl`, [user("Older session request", "u1", 0), edit("a1", 1)]);
    ingest(false); // events ingested, cursor advanced, no title captured
    expect(listRequestTitles(store)).toEqual([]);
    ingest(true);
    runStagePass(store, {}, NOW);
    expect(items()[0]).toMatchObject({ title: "Older session request", source: "request" });
  });

  it("waits for the first request when the file has none yet", () => {
    write(`${SID}.jsonl`, [edit("a1", 1)]);
    ingest();
    expect(listRequestTitles(store)).toEqual([]);
    write(`${SID}.jsonl`, [user("Now there is a request", "u1", 0), edit("a1", 1)]);
    ingest();
    expect(listRequestTitles(store)).toHaveLength(1);
  });

  it("ignores sub-agent files, which carry the parent's session id", () => {
    mkdirSync(join(projects, "demo", "subagents"), { recursive: true });
    writeFileSync(
      join(projects, "demo", "subagents", "agent-1.jsonl"),
      user("Sub-agent task text", "u9", 0, { agentId: "ag1", isSidechain: true }) + "\n",
    );
    ingest();
    expect(listRequestTitles(store)).toEqual([]);
  });

  it("an anchor title wins: a branch or issue item keeps its own title", () => {
    write(`${SID}.jsonl`, [
      user("Work on the billing flow", "u1", 0, { gitBranch: "feat/ftk-3-billing" }),
      edit("a1", 1, { gitBranch: "feat/ftk-3-billing" }),
    ]);
    ingest();
    runStagePass(store, {}, NOW);
    // Tool events now carry the branch (D92), so no session item exists; a request never titles an anchored item.
    const byId = Object.fromEntries(items().map((i) => [i.id, i]));
    expect(byId["issue:FTK-3"]).toEqual({ id: "issue:FTK-3", title: "FTK-3", source: "anchor" });
    expect(Object.values(byId).filter((i) => i.source === "request")).toEqual([]);
  });
});

describe("the switch", () => {
  it("off: nothing is captured and the item uses the repo, branch and date title", () => {
    write(`${SID}.jsonl`, [user("Add pagination", "u1", 0), edit("a1", 1)]);
    ingest(false);
    runStagePass(store, { requestTitles: false }, NOW);
    expect(listRequestTitles(store)).toEqual([]);
    expect(items()[0]).toMatchObject({ title: "acme/demo · main · Jan 5", source: "fallback" });
  });

  it("turning it off later falls back at once even though titles are stored, and on restores them", () => {
    write(`${SID}.jsonl`, [user("Add pagination", "u1", 0), edit("a1", 1)]);
    ingest();
    runStagePass(store, {}, NOW);
    expect(items()[0]?.source).toBe("request");
    runStagePass(store, { requestTitles: false }, NOW);
    expect(items()[0]).toMatchObject({ title: "acme/demo · main · Jan 5", source: "fallback" });
    runStagePass(store, { requestTitles: true }, NOW);
    expect(items()[0]).toMatchObject({ title: "Add pagination", source: "request" });
  });

  it("reads item_titles_from_requests from config.toml: only an explicit false turns it off", () => {
    const read = (text: string | null): boolean => {
      if (text !== null) writeFileSync(join(dir, "config.toml"), text);
      return readRequestTitlesEnabled(dir);
    };
    expect(readRequestTitlesEnabled(join(dir, "nowhere"))).toBe(true);
    expect(read("repos = []\n")).toBe(true);
    expect(read("item_titles_from_requests = true\n")).toBe(true);
    expect(read("item_titles_from_requests = false\n")).toBe(false);
    expect(read("  item_titles_from_requests = false # private\n")).toBe(false);
    expect(read("# item_titles_from_requests = false\n")).toBe(true);
    expect(read('item_titles_from_requests = "false"\n')).toBe(true);
    expect(read("item_titles_from_requests = 0\n")).toBe(true);
  });
});

describe("see and clear", () => {
  it("clear deletes every stored title, items fall back, and the text is not captured again", () => {
    write(`${SID}.jsonl`, [user("Add pagination", "u1", 0), edit("a1", 1)]);
    ingest();
    runStagePass(store, {}, NOW);
    expect(clearRequestTitles(store)).toBe(1);
    runStagePass(store, {}, NOW);
    expect(dump()).not.toContain("Add pagination");
    expect(items()[0]).toMatchObject({ title: "acme/demo · main · Jan 5", source: "fallback" });
    ingest();
    expect(listRequestTitles(store)).toEqual([]);
  });
});

describe("where the title appears", () => {
  it("shows in the status file only as the item title, never any other part of the prompt", () => {
    write(`${SID}.jsonl`, [user("Fix the linker. BODYMARKER follows", "u1", 0), edit("a1", 1)]);
    ingest();
    runStagePass(store, {}, NOW);
    const file = join(dir, "status.json");
    writeStatusFile(store, file, NOW);
    const text = readFileSync(file, "utf8");
    expect(text).not.toContain("BODYMARKER");
  });
});

describe("migration 8", () => {
  it("adds title_source and session_titles to a version 7 database and keeps its rows", () => {
    const path = join(dir, "old.db");
    const first = new Store(path);
    first.db.exec(
      `INSERT INTO work_items (item_key, title, stage, proof_status, first_activity, last_activity, created_at, updated_at)
       VALUES ('issue:OLD-1', 'Old', 'built', 'none', 'x', 'x', 'x', 'x');
       DROP TABLE session_titles;
       ALTER TABLE work_items DROP COLUMN title_source;
       DELETE FROM schema_migrations WHERE number = 8;
       UPDATE schema_meta SET version = 7;`,
    );
    first.close();
    const upgraded = new Store(path);
    try {
      expect(Number(upgraded.db.prepare("SELECT version FROM schema_meta").get()?.["version"])).toBe(8);
      expect(upgraded.db.prepare("SELECT title, title_source FROM work_items").get()).toMatchObject({
        title: "Old",
        title_source: "fallback",
      });
      expect(listRequestTitles(upgraded)).toEqual([]);
    } finally {
      upgraded.close();
    }
  });
});
