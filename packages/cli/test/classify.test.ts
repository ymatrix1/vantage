// `vantage classify`. Hermetic: temp VANTAGE_HOME, loopback daemon on an ephemeral port, synthetic data. The real
// `claude` is never run: the daemon's config keeps the run blocked, and suggestions are seeded straight into the store.
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { Store, listSuggestions, startDaemon, suggestionCounts, type DaemonHandle } from "@vantage/daemon";
import { runCli } from "../src/cli.ts";

let home = "";
let daemon: DaemonHandle | null = null;
beforeEach(() => {
  home = mkdtempSync(join(tmpdir(), "vantage-classify-cli-"));
});
afterEach(async () => {
  await daemon?.stop();
  daemon = null;
  rmSync(home, { recursive: true, force: true });
});

const cli = async (args: string[], extra: { confirm?: boolean | "none" } = {}) => {
  const out: string[] = [];
  const err: string[] = [];
  const code = await runCli(["classify", ...args], {
    out: (l) => out.push(l),
    err: (l) => err.push(l),
    env: { ...process.env, VANTAGE_HOME: home, VANTAGE_PROJECTS_DIR: join(home, "projects") },
    ...(extra.confirm === "none" ? {} : { confirm: async () => extra.confirm !== false }),
  });
  return { code, out: out.join("\n"), err: err.join("\n") };
};

/** Starts the daemon, then seeds items and suggestions through a second connection to the same file. */
async function boot(): Promise<void> {
  mkdirSync(join(home, "projects"));
  daemon = await startDaemon({
    home,
    port: 0,
    projectsDir: join(home, "projects"),
    repos: [],
    ingestMs: 60_000,
    stageMs: 60_000,
  });
  const store = new Store(join(home, "vantage.db"));
  try {
    const at = "2026-01-05T09:00:00Z";
    for (const k of ["session:a", "session:b"]) {
      store.db
        .prepare(
          "INSERT INTO work_items (item_key, title, repo, stage, proof_status, first_activity, last_activity, created_at, updated_at) VALUES (?, 'Session 2026-01-05', ?, 'built', 'none', ?, ?, ?, ?)",
        )
        .run(k, "/code/demo", at, at, at, at);
    }
    const ins = store.db.prepare(
      "INSERT INTO suggestions (item_key, kind, payload_json, model, prompt_hash, content_hash, confidence, run_id, created_at) VALUES (?, ?, ?, 'haiku', 'p', ?, ?, 'r', ?)",
    );
    ins.run("session:a", "title", JSON.stringify({ title: "Add login form" }), "h1", 0.95, at);
    ins.run("session:b", "title", JSON.stringify({ title: "Fix flaky timer" }), "h2", 0.5, at);
    ins.run("session:a", "topic", JSON.stringify({ topic: "login", kind: "feature" }), "h1", 0.9, at);
  } finally {
    store.close();
  }
}

describe("vantage classify", () => {
  it("--dry-run prints counts and calls nothing; it works with the daemon stopped and does not write", async () => {
    mkdirSync(join(home, "projects"));
    const s = new Store(join(home, "vantage.db"));
    s.close();
    const r = await cli(["--dry-run"]);
    expect(r.code).toBe(0);
    expect(r.out).toContain("Classify dry run: nothing was sent.");
    expect(r.out).toMatch(/items: 0 settled/);
    expect(r.out).toContain("blocked");
    expect(r.out).toContain("engines.classify.enabled is off");
    const j = await cli(["--dry-run", "--json"]);
    expect(JSON.parse(j.out)).toMatchObject({ items: 0, calls: 0, model: "haiku" });
  });

  it("run is refused while settings are off, naming the switches", async () => {
    await boot();
    const r = await cli([]);
    expect(r.code).toBe(1);
    expect(r.err).toContain("data_policy.outside_calls is off");
  });

  it("accept previews first; declining applies nothing; --yes applies one batch; undo reverts it", async () => {
    await boot();
    const no = await cli(["accept", "--all"], { confirm: false });
    expect(no.code).toBe(0);
    expect(no.out).toContain("Would accept: 3 suggestions");
    expect(no.out).toContain("Nothing was applied.");
    const check = new Store(join(home, "vantage.db"));
    expect(suggestionCounts(check).accepted).toBe(0);
    check.close();

    const none = await cli(["accept", "--all"], { confirm: "none" });
    expect(none.code).toBe(1);
    expect(none.err).toContain("--yes");

    const yes = await cli(["accept", "--all", "--yes"]);
    expect(yes.code).toBe(0);
    expect(yes.out).toContain("accepted 3");
    const s = new Store(join(home, "vantage.db"));
    expect(suggestionCounts(s).accepted).toBe(3);
    expect(s.db.prepare("SELECT title FROM work_items WHERE item_key = 'session:a'").get()?.["title"]).toBe(
      "Add login form",
    );

    const undo = await cli(["undo"]);
    expect(undo.out).toContain("undid batch");
    expect(s.db.prepare("SELECT title FROM work_items WHERE item_key = 'session:a'").get()?.["title"]).toBe(
      "Session 2026-01-05",
    );
    expect(suggestionCounts(s).undone).toBe(3);
    s.close();
    expect((await cli(["undo"])).out).toContain("No batch to undo.");
  });

  it("accept without --all uses 0.8 by default; --kind and --repo narrow it; dismiss works the same way", async () => {
    await boot();
    const dflt = await cli(["accept", "--yes"]);
    expect(dflt.out).toContain("accepted 2"); // 0.95 title and 0.9 topic; the 0.5 title stays open
    const s = new Store(join(home, "vantage.db"));
    expect(listSuggestions(s, {}, "suggested").total).toBe(1);
    const wrongRepo = await cli(["dismiss", "--repo", "other", "--yes"]);
    expect(wrongRepo.out).toContain("Nothing to dismiss");
    const dis = await cli(["dismiss", "--kind", "titles", "--repo", "DEMO", "--yes"]);
    expect(dis.out).toContain("dismissed 1");
    expect(suggestionCounts(s).dismissed).toBe(1);
    s.close();
  });

  it("rejects bad flags and prints the report with aggregates only", async () => {
    await boot();
    expect((await cli(["accept", "--min-confidence", "2"])).code).toBe(2);
    expect((await cli(["accept", "--kind", "nope"])).code).toBe(2);
    expect((await cli(["bogus"])).code).toBe(2);
    await cli(["accept", "--all", "--yes"]);
    const r = await cli(["report"]);
    expect(r.code).toBe(0);
    expect(r.out).toContain("agreement");
    expect(r.out).not.toContain("Add login form");
    const status = await cli(["status"]);
    expect(status.out).toContain("auto-accept: off");
  });

  it("needs a running daemon for anything that changes state", async () => {
    mkdirSync(join(home, "projects"));
    writeFileSync(join(home, "x"), "");
    const r = await cli(["accept", "--yes"]);
    expect(r.code).toBe(1);
    expect(r.err).toContain("not running");
  });
});
