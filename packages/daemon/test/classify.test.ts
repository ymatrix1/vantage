// Synthetic data only. The real `claude` is never run: a fake executable stands in (fixtures/fake-claude.mjs),
// driven through the real spawn code, so arguments, environment, stdin, working folder and timeout are exercised.
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { request } from "node:http";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { isInsideDir, type VantageEvent } from "@vantage/core";
import {
  CLASSIFY_DEFAULTS,
  Store,
  acceptedTitles,
  applyBatch,
  applyNow,
  backfillTranscripts,
  classifyConfigFromText,
  classifyReport,
  createClassifyJob,
  dryRun,
  getItem,
  ingestSpool,
  lastOpenBatch,
  linkStoredEvents,
  linksForItem,
  listItems,
  listSuggestions,
  planRun,
  readClassifyConfig,
  previewBatch,
  renderReport,
  runStagePass,
  spawnClaude,
  startHttp,
  suggestionCounts,
  undoBatch,
  type ClassifyConfig,
  type HttpHandle,
  type Spawner,
} from "../src/index.ts";

const FAKE = fileURLToPath(new URL("./fixtures/fake-claude.mjs", import.meta.url));
const HOOK_BIN = fileURLToPath(new URL("../../hooks/dist/src/bin.js", import.meta.url));
const NOW = new Date("2026-01-05T12:00:00Z");
// Built, not written out, so secret scanners do not mistake the fake key for a real one.
const SECRET = ["sk", "ant", "api03", "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"].join("-");
const ON: ClassifyConfig = {
  ...CLASSIFY_DEFAULTS,
  enabled: true,
  outsideCalls: true,
  allowTranscripts: true,
  timeoutMs: 5000,
};

let dir = "";
let home = "";
let projects = "";
let log = "";
let store: Store;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "vantage-classify-test-"));
  home = join(dir, "home");
  projects = join(dir, "projects");
  log = join(dir, "fake.log");
  mkdirSync(home);
  mkdirSync(projects);
  writeFileSync(log, "");
  store = new Store(join(dir, "v.db"));
});
afterEach(() => {
  store.close();
  rmSync(dir, { recursive: true, force: true });
});

let n = 0;
const put = (
  sid: string,
  branch: string,
  kind: VantageEvent["kind"],
  m: number,
  payload: Record<string, unknown>,
): void => {
  store.insertEvent(
    {
      sourceId: `c${++n}`,
      source: "claude_code",
      kind,
      timestamp: `2026-01-05T09:${String(m).padStart(2, "0")}:00Z`,
      sessionId: sid,
      payload: { branch, cwd: "/w/repo", ...payload },
    },
    "2026-01-05T10:00:00Z",
  );
};
const transcript = (sid: string, text: string): void => {
  const d = join(projects, "p1");
  mkdirSync(d, { recursive: true });
  writeFileSync(
    join(d, `${sid}.jsonl`),
    `${JSON.stringify({ type: "user", sessionId: sid, uuid: `u-${sid}`, timestamp: "2026-01-05T09:00:00Z", message: { content: text } })}\n`,
  );
};

/** Four provisional session items (default branch, no key) plus one issue item, each with a request. */
function seed(): void {
  for (const [i, sid] of ["s1", "s2", "s3", "s4"].entries()) {
    put(sid, "main", "file.edited", i * 5, { path: `/home/someone/repo/src/file${i}.ts` });
    put(sid, "main", "command.ran", i * 5 + 1, {
      command: `curl -H "Authorization: Bearer ${SECRET}" https://internal.example.test`,
      ok: true,
    });
    transcript(
      sid,
      `Request number ${i + 1} about the thing. Then ${SECRET} and /home/someone/private/notes.txt follow.`,
    );
  }
  put("s5", "feat/ftk-5-login", "file.edited", 30, { path: "/w/repo/login.ts" });
  transcript("s5", "Add the login page. It should validate.");
  runStagePass(store, {}, NOW);
}

const fake =
  (mode: string, extra: Record<string, string> = {}): Spawner =>
  (req) =>
    spawnClaude({
      ...req,
      command: process.execPath,
      args: [FAKE, ...req.args],
      env: { ...req.env, FAKE_MODE: mode, FAKE_LOG: log, ...extra },
    });

const rec = (v: unknown): Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v) ? Object.fromEntries(Object.entries(v)) : {};
const arr = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);

const calls = (): { args: string[]; cwd: string; skip: string | null; input: string }[] =>
  readFileSync(log, "utf8")
    .split("\n")
    .filter(Boolean)
    .map((l) => JSON.parse(l));

const jobWith = (spawn: Spawner, cfg: Partial<ClassifyConfig> = {}) =>
  createClassifyJob({
    store,
    home,
    projectsDir: projects,
    config: () => ({ ...ON, ...cfg }),
    spawn,
    now: () => NOW,
    env: { ...process.env, VANTAGE_HOME: home },
  });

const run = async (spawn: Spawner, cfg: Partial<ClassifyConfig> = {}) => {
  const job = jobWith(spawn, cfg);
  const r = job.start();
  await job.idle();
  return { r, status: job.status() };
};

describe("settings", () => {
  it("everything is off by default and blocks a run, naming the switches", () => {
    const c = classifyConfigFromText("");
    expect(c).toMatchObject({
      enabled: false,
      outsideCalls: false,
      allowTranscripts: false,
      autoAccept: "off",
      model: "haiku",
    });
    const job = createClassifyJob({
      store,
      home,
      projectsDir: projects,
      config: () => c,
      spawn: fake("ok"),
      now: () => NOW,
    });
    const r = job.start();
    expect(r).toMatchObject({ started: false, reason: "blocked" });
    expect(JSON.stringify(r)).toContain("data_policy.outside_calls");
    expect(readFileSync(log, "utf8")).toBe(""); // nothing was called
  });

  it("reads the keys, ignores bad values, and auto_accept stays off unless titles or all", () => {
    const c = classifyConfigFromText(`
[engines.classify]
enabled = true
model = "claude-haiku-5-5"
batch_size = 10
daily_calls = 5
auto_accept = "everything"
auto_min_confidence = 7
[data_policy]
outside_calls = true
[data_policy.allow]
transcripts = true
`);
    expect(c).toMatchObject({
      enabled: true,
      model: "claude-haiku-5-5",
      batchSize: 10,
      dailyCalls: 5,
      autoAccept: "off",
      autoMinConfidence: 0.9,
      outsideCalls: true,
      allowTranscripts: true,
    });
    expect(classifyConfigFromText('[engines.classify]\nauto_accept = "titles"\n').autoAccept).toBe("titles");
  });
});

describe("dry run and payload", () => {
  it("counts items, calls and bytes and calls nothing", () => {
    seed();
    const d = dryRun(store, { ...ON, batchSize: 2 }, projects, NOW);
    expect(d.eligible).toBe(5);
    expect(d.items).toBe(5);
    expect(d.calls).toBe(3);
    expect(d.payloadBytes).toBeGreaterThan(100);
    expect(d.callsAllowed).toBe(3);
    expect(d.samplePrompt).toContain('"id":"i1"');
    expect(readFileSync(log, "utf8")).toBe("");
  });

  it("an item settles for 30 minutes before it is classified", () => {
    seed();
    expect(planRun(store, ON, projects, new Date("2026-01-05T09:40:00Z")).eligible).toBeLessThan(5);
    expect(
      planRun(store, { ...ON, settleMinutes: 30 }, projects, new Date("2026-01-05T09:31:00Z")).items,
    ).toBeLessThan(5);
  });

  it("what reaches `claude` holds only the allowed fields: no secrets, paths, commands or later sentences", async () => {
    seed();
    await run(fake("ok"));
    const sent = calls()
      .map((c) => c.input)
      .join("\n");
    expect(sent.length).toBeGreaterThan(0);
    const forbidden = [
      SECRET,
      "internal.example.test",
      "someone",
      "/home",
      "curl",
      "Authorization",
      "Bearer",
      "private",
      "notes.txt",
      "Then ",
    ];
    expect(forbidden.filter((bad) => sent.includes(bad))).toEqual([]);
    expect(sent).toContain("Request number 1 about the thing.");
    expect(sent).toContain("file0.ts");
    const input = calls()[0]?.input ?? "";
    const first: unknown = JSON.parse(input.slice(input.indexOf("\n") + 1));
    expect(Array.isArray(first)).toBe(true);
    for (const entry of Array.isArray(first) ? first : []) {
      expect(Object.keys(entry).toSorted()).toEqual([
        "branch",
        "edits",
        "files",
        "id",
        "proof",
        "repo",
        "request",
        "sessions",
        "title",
      ]);
      expect(entry.id).toMatch(/^i\d+$/); // opaque ids, never item keys
    }
  });
});

describe("the run", () => {
  it("runs `claude -p` isolated: haiku, json schema, no tools, no settings, VANTAGE_SKIP=1, a classifier work folder", async () => {
    seed();
    const { status } = await run(fake("ok"));
    const c = calls()[0]!;
    expect(c.args).toEqual(
      expect.arrayContaining([
        "-p",
        "--model",
        "haiku",
        "--output-format",
        "json",
        "--json-schema",
        "--strict-mcp-config",
        "--no-session-persistence",
      ]),
    );
    expect(c.args[c.args.indexOf("--tools") + 1]).toBe("");
    expect(c.args[c.args.indexOf("--setting-sources") + 1]).toBe("");
    expect(c.skip).toBe("1");
    expect(c.cwd.replaceAll("\\", "/")).toContain("/work/classify/");
    expect(existsSync(c.cwd)).toBe(false); // removed afterwards
    expect(status).toMatchObject({ state: "idle", callsDone: 1, callsFailed: 0 });
  });

  it("stores suggestions, ignores status and stage fields, and a rerun makes no call (cache)", async () => {
    seed();
    const first = await run(fake("ok"));
    expect(first.status.suggestions).toBeGreaterThan(0);
    const rows = listSuggestions(store, {}, "suggested", 500).rows;
    expect(rows.some((r) => r.kind === "title")).toBe(true);
    expect(JSON.stringify(rows)).not.toContain("shipped");
    expect(listItems(store).every((i) => i.stage !== "shipped")).toBe(true);
    const before = calls().length;
    const again = await run(fake("ok"));
    expect(again.status.callsDone).toBe(0);
    expect(calls().length).toBe(before);
  });

  it("no title suggestion for an item named by a ticket or branch (explicit key)", async () => {
    seed();
    await run(fake("ok"));
    const titles = listSuggestions(store, { kinds: ["title"] }, "suggested", 500).rows;
    expect(titles.length).toBeGreaterThan(0);
    expect(titles.some((t) => t.itemKey.startsWith("issue:") || t.itemKey.startsWith("branch:"))).toBe(false);
  });

  it("the daily cap limits calls and a second run the same day makes none", async () => {
    seed();
    const a = await run(fake("ok"), { batchSize: 1, dailyCalls: 2 });
    expect(a.status).toMatchObject({ callsDone: 2, capReached: true });
    const b = await run(fake("ok"), { batchSize: 1, dailyCalls: 2 });
    expect(b.status.callsDone).toBe(0);
    expect(calls()).toHaveLength(2);
  });

  it("two calls at most in flight", async () => {
    seed();
    const spawn = fake("ok");
    let live = 0;
    let peak = 0;
    const counted: Spawner = async (req) => {
      live++;
      peak = Math.max(peak, live);
      try {
        return await spawn(req);
      } finally {
        live--;
      }
    };
    await run(counted, { batchSize: 1 });
    expect(peak).toBe(2);
  });

  it.each(["fail", "invalid", "is_error"] as const)(
    "a %s call gives no suggestion and stops the run after two in a row",
    async (mode) => {
      seed();
      const { status } = await run(fake(mode), { batchSize: 1 });
      expect(status.suggestions).toBe(0);
      expect(status.callsFailed).toBeGreaterThanOrEqual(2);
      expect(status.stoppedEarly).toBe(true);
      expect(status.callsDone).toBeLessThan(5);
      expect(suggestionCounts(store).open).toEqual({ title: 0, topic: 0, group: 0 });
      // a failure is not cached: the next run sends the items again
      expect(planRun(store, ON, projects, NOW).items).toBe(5);
    },
  );

  it("a hanging call times out, is killed and gives no suggestion", async () => {
    seed();
    const { status } = await run(fake("hang"), { timeoutMs: 400, batchSize: 5 });
    expect(status).toMatchObject({ callsFailed: 1, lastFailure: "timeout", suggestions: 0 });
  }, 20_000);

  it("a missing executable is a failure, not a crash", async () => {
    seed();
    const { status } = await run((req) => spawnClaude({ ...req, command: join(dir, "no-such-claude") }));
    expect(status.suggestions).toBe(0);
    expect(status.callsFailed).toBeGreaterThan(0);
  });
});

const work = (): string => join(home, "work");

describe("a classifier run never produces events, items or sessions (work-folder rule + VANTAGE_SKIP)", () => {
  it("runs in a folder under <home>/work, and its hook, transcript and sessions leave no trace", async () => {
    seed();
    backfillTranscripts(store, projects, NOW, 14, true, work()); // the seeded history is ours; the baseline is after it
    runStagePass(store, {}, NOW);
    const events = store.countEvents();
    const items = listItems(store).length;
    const titles = Number(store.db.prepare("SELECT COUNT(*) AS n FROM session_titles").get()?.["n"]);

    await run(fake("ok", { FAKE_HOOK: HOOK_BIN, FAKE_PROJECTS: projects, VANTAGE_HOME: home }));
    const first = calls()[0];
    expect(first?.cwd.replaceAll("\\", "/").toLowerCase()).toContain(
      `${work().replaceAll("\\", "/").toLowerCase()}/classify/`,
    );
    expect(first?.args).toContain("--no-session-persistence");
    // Layer 3: the hook exits early, so the spool was never created.
    expect(existsSync(join(home, "spool"))).toBe(false);
    // Layer 1: the fake wrote a transcript whose cwd is the work folder, next to ordinary history in the same pass.
    transcript("s6", "An ordinary request. It is history.");
    put("s6", "main", "file.edited", 40, { path: "/w/ordinary.ts" });
    const before = store.countEvents();
    const r = backfillTranscripts(store, projects, NOW, 14, true, work());
    expect(r.inserted).toBeGreaterThan(0); // ordinary history is still ingested
    expect(store.countEvents()).toBeGreaterThan(before);
    const classifier = (sql: string) => Number(store.db.prepare(sql).get()?.["n"]);
    expect(classifier("SELECT COUNT(*) AS n FROM events WHERE session_id = 'fake-classifier'")).toBe(0);
    expect(classifier("SELECT COUNT(*) AS n FROM session_titles WHERE session_id = 'fake-classifier'")).toBe(
      0,
    );
    expect(
      classifier("SELECT COUNT(*) AS n FROM event_branches WHERE source_id LIKE '%fake-classifier%'"),
    ).toBe(0);
    runStagePass(store, {}, NOW);
    expect(listItems(store).some((i) => i.itemKey.includes("fake-classifier"))).toBe(false);
    expect(listItems(store).length).toBe(items + 1); // only s6's item is new
    expect(events).toBeLessThanOrEqual(store.countEvents());
    expect(titles).toBeLessThanOrEqual(
      Number(store.db.prepare("SELECT COUNT(*) AS n FROM session_titles").get()?.["n"]),
    );
    expect(readdirSync(projects).length).toBeGreaterThan(1); // the fake did write its transcript
  });

  it("the same transcript IS ingested when the rule is not applied (so the test above proves something)", async () => {
    seed();
    await run(fake("ok", { FAKE_PROJECTS: projects, VANTAGE_HOME: home }));
    const other = new Store(join(dir, "control.db"));
    try {
      expect(backfillTranscripts(other, projects, NOW).inserted).toBeGreaterThan(0);
      expect(
        other.db.prepare("SELECT COUNT(*) AS n FROM events WHERE session_id = 'fake-classifier'").get()?.[
          "n"
        ],
      ).toBe(2);
    } finally {
      other.close();
    }
  });

  it("an older hook without the skip guard still leaves nothing: the spool line is dropped by cwd, with its whole session", () => {
    const spool = join(home, "spool");
    mkdirSync(spool, { recursive: true });
    const inside = join(work(), "classify", "c-abc");
    const lines = [
      {
        hook_event_name: "PostToolUse",
        session_id: "x",
        tool_use_id: "tu-x",
        tool_name: "Edit",
        tool_input: { file_path: "a.ts" },
        cwd: inside,
      },
      { hook_event_name: "Stop", session_id: "x" }, // no cwd: dropped because the session ran inside the folder
      {
        hook_event_name: "PostToolUse",
        session_id: "ordinary",
        tool_use_id: "tu-o",
        tool_name: "Edit",
        tool_input: { file_path: "b.ts" },
        cwd: "/w/repo",
      },
    ].map((hook) => JSON.stringify({ v: 1, receivedAt: "2026-01-05T09:00:00.000Z", hook }));
    writeFileSync(join(spool, "2026-01-05.jsonl"), `${lines.join("\n")}\n`);
    const r = ingestSpool(store, spool);
    expect(r.inserted).toBe(1);
    expect(store.db.prepare("SELECT COUNT(*) AS n FROM events WHERE session_id = 'x'").get()?.["n"]).toBe(0);
  });

  it("a path is inside the work folder in any spelling, and a sibling folder is not", () => {
    expect(isInsideDir("C:\\Users\\a\\.vantage\\work\\classify\\c-1", "c:/users/a/.vantage/work")).toBe(true);
    expect(isInsideDir("/home/a/.vantage/work", "/home/a/.vantage/work/")).toBe(true);
    expect(isInsideDir("/home/a/.vantage/workshop", "/home/a/.vantage/work")).toBe(false);
    expect(isInsideDir("/home/a/code", "")).toBe(false);
  });
});

async function classified(): Promise<void> {
  seed();
  await run(fake("ok"));
}

describe("bulk accept", () => {
  it("preview applies nothing; apply needs its token; a changed selection is refused", async () => {
    await classified();
    const before = listItems(store).map((i) => i.title);
    const p = previewBatch(store, "accept", {});
    expect(p.total).toBeGreaterThan(0);
    expect(p.byKind.title + p.byKind.topic + p.byKind.group).toBe(p.total);
    expect(p.sample.length).toBeGreaterThan(0);
    expect(listItems(store).map((i) => i.title)).toEqual(before);
    expect(suggestionCounts(store).accepted).toBe(0);
    expect(() => applyBatch(store, "accept", {}, "wrong-token")).toThrow(/selection changed/);
    expect(() => applyBatch(store, "accept", { kinds: ["title"] }, p.token)).toThrow(/selection changed/); // token is for another selection
    expect(suggestionCounts(store).accepted).toBe(0);
    const r = applyBatch(store, "accept", {}, p.token, NOW);
    expect(r.total).toBe(p.total);
    expect(suggestionCounts(store).accepted).toBe(p.total);
  });

  it("accept all sets titles that survive a stage pass, never over an issue or branch title; undo reverts exactly the batch", async () => {
    await classified();
    const issue = getItem(store, "issue:FTK-5")?.title;
    const before = new Map(listItems(store).map((i) => [i.itemKey, i.title]));
    const r = applyNow(store, "accept", {}, NOW);
    expect(r.counts.title).toBeGreaterThan(0);
    const after = new Map(listItems(store).map((i) => [i.itemKey, i.title]));
    const changed = [...after].filter(([k, t]) => t !== before.get(k));
    expect(changed.length).toBe(r.counts.title);
    expect(after.get("issue:FTK-5")).toBe(issue);
    runStagePass(store, {}, new Date("2026-01-05T12:05:00Z"));
    for (const [k, t] of changed) expect(getItem(store, k)?.title).toBe(t);
    expect(acceptedTitles(store).size).toBe(r.counts.title);

    expect(undoBatch(store, r.batchId, NOW)?.undone).toBe(true);
    runStagePass(store, {}, new Date("2026-01-05T12:06:00Z"));
    expect(new Map(listItems(store).map((i) => [i.itemKey, i.title]))).toEqual(before);
    expect(suggestionCounts(store).undone).toBe(r.total);
    expect(undoBatch(store, r.batchId, NOW)).toBeNull(); // already undone
  });

  it("by confidence threshold: only suggestions at or above it", async () => {
    await classified();
    const all = previewBatch(store, "accept", {});
    const high = previewBatch(store, "accept", { minConfidence: 0.8 });
    expect(high.total).toBeGreaterThan(0);
    expect(high.total).toBeLessThan(all.total);
    const r = applyBatch(store, "accept", { minConfidence: 0.8 }, high.token, NOW);
    expect(r.total).toBe(high.total);
    expect(listSuggestions(store, {}, "accepted", 500).rows.every((x) => x.confidence >= 0.8)).toBe(true);
    expect(listSuggestions(store, {}, "suggested", 500).rows.every((x) => x.confidence < 0.8)).toBe(true);
  });

  it("by kind: titles only, groups only", async () => {
    await classified();
    const t = applyNow(store, "accept", { kinds: ["title"] }, NOW);
    expect(t.counts.topic + t.counts.group).toBe(0);
    expect(suggestionCounts(store).open.title).toBe(0);
    expect(suggestionCounts(store).open.topic).toBeGreaterThan(0);
    const g = applyNow(store, "accept", { kinds: ["group"] }, NOW);
    expect(g.counts.group).toBeGreaterThan(0);
    expect(g.counts.title).toBe(0);
  });

  it("by repo: only the suggestions of one repo", async () => {
    await classified();
    store.db
      .prepare("UPDATE work_items SET repo = ? WHERE item_key IN ('session:s1', 'session:s2')")
      .run("C:\\code\\alpha");
    store.db
      .prepare("UPDATE work_items SET repo = ? WHERE item_key IN ('session:s3', 'session:s4')")
      .run("/code/beta");
    const p = previewBatch(store, "accept", { repo: "ALPHA", kinds: ["title"] });
    expect(p.total).toBe(2);
    const r = applyBatch(store, "accept", { repo: "ALPHA", kinds: ["title"] }, p.token, NOW);
    expect(r.total).toBe(2);
    expect(listSuggestions(store, { repo: "beta", kinds: ["title"] }, "suggested").total).toBe(2);
  });

  it("dismiss all (with filters) is one batch with one undo that makes them open again", async () => {
    await classified();
    const open = suggestionCounts(store).open;
    const r = applyNow(store, "dismiss", { kinds: ["topic"], minConfidence: 0.8 }, NOW);
    expect(r.total).toBeGreaterThan(0);
    expect(suggestionCounts(store).dismissed).toBe(r.total);
    expect(suggestionCounts(store).open.topic).toBeLessThan(open.topic);
    expect(lastOpenBatch(store)?.id).toBe(r.batchId);
    undoBatch(store, undefined, NOW);
    expect(suggestionCounts(store).open).toEqual(open);
    expect(suggestionCounts(store).dismissed).toBe(0);
  });

  it("accepting a group makes an inferred link, keeps it across passes, and undo removes it", async () => {
    await classified();
    const group = listSuggestions(store, { kinds: ["group"] }, "suggested", 50).rows[0];
    expect(group).toBeDefined();
    const other = group!.withKey!;
    const eventsOf = (k: string) =>
      linksForItem(store, k).filter((l) => !l.undoneAt && l.rule !== "classifier-same-as").length;
    const r = applyNow(store, "accept", { kinds: ["group"] }, NOW);
    expect(r.counts.group).toBeGreaterThan(0);
    const inferred = (k: string) =>
      store.db
        .prepare(
          "SELECT COUNT(*) AS n FROM links WHERE item_key = ? AND method = 'inferred' AND undone_at IS NULL",
        )
        .get(k)?.["n"];
    const keep = [group!.itemKey, other].find((k) => Number(inferred(k)) > 0)!;
    expect(keep).toBeDefined();
    expect(Number(inferred(keep))).toBeGreaterThan(0);
    expect(eventsOf(keep)).toBeGreaterThan(0);
    // a later pass rewrites the linker's links but not the user's grouping
    linkStoredEvents(store, {}, NOW);
    runStagePass(store, {}, NOW);
    expect(Number(inferred(keep))).toBeGreaterThan(0);
    // stages come from evidence only: the grouping did not change either item's stage
    expect(
      listItems(store)
        .filter((i) => i.itemKey.startsWith("session:"))
        .every((i) => i.stage === "built"),
    ).toBe(true);
    undoBatch(store, r.batchId, NOW);
    expect(Number(inferred(keep))).toBe(0);
    linkStoredEvents(store, {}, NOW);
    expect(Number(inferred(keep))).toBe(0);
    // accepting again after an undo works (the tombstone is revived)
    const again = previewBatch(store, "accept", { kinds: ["group"] });
    expect(again.total).toBe(0); // the undone suggestion is not offered again
  });

  it("auto-accept is off by default (nothing applied) and on it applies at or above the minimum and records one batch", async () => {
    seed();
    await run(fake("ok"));
    expect(suggestionCounts(store).accepted).toBe(0);
    expect(lastOpenBatch(store)).toBeNull();

    // reset and run again with auto-accept on titles
    store.db.exec("DELETE FROM suggestions; DELETE FROM classify_calls;");
    const job = jobWith(fake("ok"), { autoAccept: "titles", autoMinConfidence: 0.8 });
    job.start();
    await job.idle();
    const s = job.status();
    expect(s.lastAuto?.total).toBeGreaterThan(0);
    expect(s.lastAuto?.counts.topic).toBe(0);
    expect(lastOpenBatch(store)).toMatchObject({ action: "auto_accept" });
    expect(
      listSuggestions(store, {}, "accepted", 500).rows.every(
        (r) => r.kind === "title" && r.confidence >= 0.8,
      ),
    ).toBe(true);
    expect(undoBatch(store, undefined, NOW)?.undone).toBe(true);
  });
});

describe("report", () => {
  it("aggregates by kind and confidence band with no titles, keys or repo names", async () => {
    await classified();
    applyNow(store, "accept", { minConfidence: 0.8 }, NOW);
    applyNow(store, "dismiss", {}, NOW);
    const r = classifyReport(store);
    expect(r.total).toBeGreaterThan(0);
    expect(r.cells.map((c) => c.kind)).toContain("group");
    const text = JSON.stringify(r) + renderReport(r).join("\n");
    expect(text).not.toMatch(/session:|issue:|branch:|Do Request|repo/);
    const topic = r.cells.filter((c) => c.kind === "topic");
    expect(
      topic.every((c) => c.agreementRate === null || (c.agreementRate >= 0 && c.agreementRate <= 1)),
    ).toBe(true);
  });

  it("agrees when two grouped items share an issue anchor and disagrees when anchors differ", () => {
    // two sessions on branches of one issue, one on another issue
    put("a", "feat/ftk-7-x", "file.edited", 1, { path: "/w/a.ts" });
    put("b", "fix/ftk-7-y", "file.edited", 2, { path: "/w/b.ts" });
    put("c", "feat/ftk-8-z", "file.edited", 3, { path: "/w/c.ts" });
    runStagePass(store, {}, NOW);
    const ins = store.db.prepare(
      "INSERT INTO suggestions (item_key, kind, payload_json, model, prompt_hash, content_hash, confidence, status, run_id, created_at) VALUES (?, 'group', ?, 'haiku', 'p', ?, 0.9, 'accepted', 'r', '2026-01-05T00:00:00Z')",
    );
    ins.run("issue:FTK-7", JSON.stringify({ with: "issue:FTK-7" }), "h1");
    ins.run("issue:FTK-7", JSON.stringify({ with: "issue:FTK-8" }), "h2");
    const cell = classifyReport(store).cells.find((c) => c.kind === "group" && c.band === ">=0.8");
    expect(cell).toMatchObject({ agree: 1, disagree: 1, agreementRate: 0.5, accepted: 2 });
  });
});

describe("HTTP", () => {
  let http: HttpHandle;
  const TOKEN = "t".repeat(64);
  let job: ReturnType<typeof createClassifyJob>;
  beforeEach(async () => {
    seed();
    // As in the daemon: the job and the status view read the same config.toml (absent here, so everything is off).
    job = createClassifyJob({
      store,
      home,
      projectsDir: projects,
      config: () => readClassifyConfig(home),
      spawn: fake("ok"),
      now: () => NOW,
    });
    http = await startHttp({
      store,
      token: TOKEN,
      now: () => NOW,
      classify: { store, home, projectsDir: projects, job, now: () => NOW },
    });
  });
  afterEach(async () => {
    await http.close();
  });

  const call = (
    method: string,
    path: string,
    body?: unknown,
    token: string | null = TOKEN,
  ): Promise<{ status: number; json: Record<string, unknown> }> =>
    new Promise((resolve, reject) => {
      const data = body === undefined ? undefined : JSON.stringify(body);
      const req = request(
        {
          host: "127.0.0.1",
          port: http.port,
          path,
          method,
          headers: {
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
            ...(data
              ? { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(data) }
              : {}),
          },
        },
        (res) => {
          let t = "";
          res.on("data", (c) => (t += c));
          res.on("end", () => resolve({ status: res.statusCode ?? 0, json: t ? JSON.parse(t) : {} }));
        },
      );
      req.on("error", reject);
      if (data) req.write(data);
      req.end();
    });

  it("POST needs the token, and only /api/classify/ takes POST", async () => {
    expect((await call("POST", "/api/classify/preview", { action: "accept" }, null)).status).toBe(401);
    expect((await call("POST", "/api/track", {})).status).toBe(405);
    expect((await call("POST", "/api/classify/nope", {})).status).toBe(404);
    expect((await call("GET", "/api/classify/status")).status).toBe(200);
  });

  it("status says blocked by default; run is refused until settings allow it", async () => {
    const s = await call("GET", "/api/classify/status");
    expect(s.json["enabled"]).toBe(false);
    expect(s.json["blockers"]).toEqual(
      expect.arrayContaining([expect.stringContaining("engines.classify.enabled")]),
    );
    // home has no config.toml in this test, so the daemon's own config reader keeps it off
    const dry = await call("GET", "/api/classify/dry-run");
    expect(arr(dry.json["blockers"]).length).toBeGreaterThan(0);
  });

  it("preview then apply then undo over HTTP; a bad token is 409", async () => {
    await run(fake("ok"));
    const p = await call("POST", "/api/classify/preview", { action: "accept", filter: { kinds: ["title"] } });
    expect(p.status).toBe(200);
    const stale = await call("POST", "/api/classify/apply", {
      action: "accept",
      filter: { kinds: ["title"] },
      token: "nope",
    });
    expect(stale.status).toBe(409);
    const noToken = await call("POST", "/api/classify/apply", {
      action: "accept",
      filter: { kinds: ["title"] },
    });
    expect(noToken.status).toBe(400);
    const done = await call("POST", "/api/classify/apply", {
      action: "accept",
      filter: { kinds: ["title"] },
      token: p.json["token"],
    });
    expect(done.status).toBe(200);
    expect(rec(done.json["counts"])["title"]).toBe(p.json["total"]);
    const undo = await call("POST", "/api/classify/undo", {});
    expect(undo.status).toBe(200);
    expect((await call("POST", "/api/classify/undo", {})).status).toBe(404);
    expect(
      (await call("POST", "/api/classify/preview", { action: "accept", filter: { minConfidence: 3 } }))
        .status,
    ).toBe(400);
  });

  it("decide accepts or dismisses one row as its own undoable batch", async () => {
    await run(fake("ok"));
    const row = listSuggestions(store, { kinds: ["title"] }).rows[0]!;
    const r = await call("POST", "/api/classify/decide", { action: "dismiss", id: row.id });
    expect(r.status).toBe(200);
    expect(r.json["total"]).toBe(1);
    expect(suggestionCounts(store).dismissed).toBe(1);
  });

  it("run is blocked (403) while settings are off", async () => {
    const r = await call("POST", "/api/classify/run", {});
    expect(r.status).toBe(403);
    expect(readFileSync(log, "utf8")).toBe("");
  });

  it("run starts once settings allow it, and a second start while running is 409", async () => {
    writeFileSync(
      join(home, "config.toml"),
      [
        "[engines.classify]",
        "enabled = true",
        "[data_policy]",
        "outside_calls = true",
        "[data_policy.allow]",
        "transcripts = true",
        "",
      ].join(String.fromCharCode(10)),
    );
    const r = await call("POST", "/api/classify/run", {});
    expect(r.status).toBe(200);
    expect((await call("POST", "/api/classify/run", {})).status).toBe(409);
    await job.idle();
    expect(job.status().callsDone).toBeGreaterThan(0);
    const after = await call("GET", "/api/classify/status");
    expect(Number(rec(rec(after.json["counts"])["open"])["title"])).toBeGreaterThan(0);
  });
});
