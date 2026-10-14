import {
  appendFileSync,
  copyFileSync,
  mkdirSync,
  mkdtempSync,
  rmSync,
  utimesSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { Store, backfillTranscripts, ingestSpool, runOnce } from "../src/index.ts";

const NOW = new Date("2026-10-14T12:00:00Z");
const fixture = fileURLToPath(new URL("./fixtures/transcript.jsonl", import.meta.url));
let dir = "";
let store: Store;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "vantage-daemon-"));
  store = new Store(join(dir, "v.db"));
});
afterEach(() => {
  store.close();
  rmSync(dir, { recursive: true, force: true });
});

const spoolLine = (hook: object, at = "2026-10-14T11:00:00.000Z") =>
  JSON.stringify({ v: 1, receivedAt: at, hook }) + "\n";
const sourceIds = (): string[] =>
  store.db
    .prepare("SELECT source_id FROM events ORDER BY id")
    .all()
    .map((r) => String(r["source_id"]));
const place = (mtime: Date) => {
  mkdirSync(projectDir(), { recursive: true });
  const f = join(projectDir(), "s-1.jsonl");
  copyFileSync(fixture, f);
  utimesSync(f, mtime, mtime);
};
const projectsRoot = () => join(dir, "projects");
const projectDir = () => join(projectsRoot(), "demo");

describe("spool ingest", () => {
  it("ingests new lines, resumes by offset and leaves a partial trailing line", () => {
    const spool = join(dir, "spool");
    mkdirSync(spool);
    const f = join(spool, "2026-10-14.jsonl");
    const start = spoolLine({ hook_event_name: "SessionStart", session_id: "s-1" });
    writeFileSync(f, start + '{"v":1,"recei');
    expect(ingestSpool(store, spool, NOW).inserted).toBe(1);
    expect(ingestSpool(store, spool, NOW).inserted).toBe(0);
    writeFileSync(f, start + spoolLine({ hook_event_name: "SessionEnd", session_id: "s-1" }));
    expect(ingestSpool(store, spool, NOW).inserted).toBe(1);
    expect(store.countEvents()).toBe(2);
  });

  it("is idempotent when the cursor is lost", () => {
    const spool = join(dir, "spool");
    mkdirSync(spool);
    appendFileSync(join(spool, "a.jsonl"), spoolLine({ hook_event_name: "SessionEnd", session_id: "s-1" }));
    ingestSpool(store, spool, NOW);
    store.db.exec("DELETE FROM cursors");
    expect(ingestSpool(store, spool, NOW).inserted).toBe(0);
    expect(store.countEvents()).toBe(1);
  });

  it("returns nothing when the spool directory does not exist", () => {
    expect(ingestSpool(store, join(dir, "none"), NOW)).toEqual({ files: 0, inserted: 0 });
  });
});

describe("transcript backfill", () => {
  it("emits prompts, edits, commands with outcome and shell edits", () => {
    place(new Date("2026-10-13T00:00:00Z"));
    backfillTranscripts(store, projectsRoot(), NOW);
    expect(new Set(sourceIds())).toEqual(
      new Set([
        "cc:prompt:u-1",
        "cc:tool:toolu_edit:edit",
        "cc:tool:toolu_sed:command",
        "cc:tool:toolu_sed:edit",
        "cc:tool:toolu_test:command",
      ]),
    );
    const test = store.db
      .prepare("SELECT payload_json FROM events WHERE source_id = 'cc:tool:toolu_test:command'")
      .get();
    expect(JSON.parse(String(test?.["payload_json"]))).toMatchObject({ ok: false });
    expect(backfillTranscripts(store, projectsRoot(), NOW).inserted).toBe(0);
  });

  it("dedupes a tool call already ingested from a hook", () => {
    const spool = join(dir, "spool");
    mkdirSync(spool);
    appendFileSync(
      join(spool, "a.jsonl"),
      spoolLine({
        hook_event_name: "PostToolUseFailure",
        session_id: "s-1",
        tool_use_id: "toolu_test",
        tool_name: "Bash",
        tool_input: { command: "pnpm test" },
      }),
    );
    ingestSpool(store, spool, NOW);
    place(new Date("2026-10-13T00:00:00Z"));
    backfillTranscripts(store, projectsRoot(), NOW);
    expect(sourceIds().filter((id) => id === "cc:tool:toolu_test:command")).toHaveLength(1);
  });

  it("skips files untouched for more than 14 days and lines older than the window", () => {
    place(new Date("2026-09-01T00:00:00Z"));
    expect(backfillTranscripts(store, projectsRoot(), NOW).files).toBe(0);
    const late = new Date("2026-11-10T00:00:00Z");
    utimesSync(join(projectDir(), "s-1.jsonl"), late, late);
    expect(backfillTranscripts(store, projectsRoot(), late).inserted).toBe(0);
  });

  it("picks up only appended lines on the next pass", () => {
    place(new Date("2026-10-13T00:00:00Z"));
    backfillTranscripts(store, projectsRoot(), NOW);
    appendFileSync(
      join(projectDir(), "s-1.jsonl"),
      '{"type":"user","uuid":"u-9","sessionId":"s-1","timestamp":"2026-10-14T09:00:00Z","message":{"content":"next"}}\n',
    );
    expect(backfillTranscripts(store, projectsRoot(), NOW).inserted).toBe(1);
  });
});

describe("runOnce", () => {
  it("creates the store and ingests with no spool and no transcripts", () => {
    const r = runOnce({ home: join(dir, "home"), projectsDir: join(dir, "missing"), now: NOW });
    expect(r).toEqual({ spool: 0, transcripts: 0 });
  });
});
