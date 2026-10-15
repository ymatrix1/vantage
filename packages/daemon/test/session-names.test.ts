// Synthetic transcripts only. The name Claude Code wrote into a transcript titles the session, shows in the
// item detail and in "what made it Asked", and the Track page can group by branch (D191 to D193).
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { parseTrackQuery } from "@vantage/core";
import {
  Store,
  backfillTranscripts,
  itemDetailView,
  listItems,
  runStagePass,
  trackView,
  traceView,
} from "../src/index.ts";

const NOW = new Date("2026-01-05T11:00:00Z");
const SID = "abcdef12-3456-7890-abcd-ef1234567890";
let dir = "";
let projects = "";
let store: Store;
beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "vantage-session-names-"));
  projects = join(dir, "projects");
  mkdirSync(join(projects, "demo"), { recursive: true });
  store = new Store(join(dir, "v.db"));
});
afterEach(() => {
  store.close();
  rmSync(dir, { recursive: true, force: true });
});

const msg = (type: "user" | "assistant", uuid: string, m: number, content: unknown, branch: string): string =>
  JSON.stringify({
    type,
    uuid,
    sessionId: SID,
    timestamp: `2026-01-05T09:0${m}:00Z`,
    cwd: "/home/u/demo",
    gitBranch: branch,
    isSidechain: false,
    message: { role: type, content },
  });
const prompt = (branch = "main"): string =>
  msg("user", "u1", 0, "Add pagination to the track page. SECRETBODY", branch);
const edit = (branch = "main"): string =>
  msg(
    "assistant",
    "a1",
    1,
    [{ type: "tool_use", id: "t1", name: "Edit", input: { file_path: "/w/a.ts" } }],
    branch,
  );
const custom = (name: string): string =>
  JSON.stringify({ type: "custom-title", customTitle: name, sessionId: SID });
const agent = (name: string): string =>
  JSON.stringify({ type: "agent-name", agentName: name, sessionId: SID });
const run = (lines: string[], titles = true): void => {
  writeFileSync(join(projects, "demo", `${SID}.jsonl`), lines.join("\n") + "\n");
  backfillTranscripts(store, projects, NOW, undefined, titles);
  runStagePass(store, {}, NOW);
};
const query = (qs: string) => {
  const p = parseTrackQuery(new URLSearchParams(qs));
  if (!p.ok) throw new Error(p.error);
  return p.query;
};

describe("session names", () => {
  it("title a provisional session item: generated name first", () => {
    run([prompt(), edit(), agent("Generated name")]);
    expect(listItems(store)[0]).toMatchObject({ title: "Generated name", titleSource: "name" });
  });

  it("a custom name beats a generated one, whatever order they were written in", () => {
    run([prompt(), edit(), agent("Generated name"), custom("My own name"), agent("Later generated")]);
    expect(listItems(store)[0]).toMatchObject({ title: "My own name", titleSource: "name" });
  });

  it("fall back to the first-request title when the transcript has no name", () => {
    run([prompt(), edit()]);
    expect(listItems(store)[0]).toMatchObject({
      title: "Add pagination to the track page",
      titleSource: "request",
    });
  });

  it("are not captured when request titles are off", () => {
    run([prompt(), edit(), custom("Named")], false);
    expect(store.db.prepare("SELECT COUNT(*) AS n FROM session_names").get()?.["n"]).toBe(0);
    expect(listItems(store)[0]?.titleSource).toBe("fallback");
  });

  it("never store prompt text", () => {
    run([prompt(), edit(), custom("Named")]);
    const dump = JSON.stringify(store.db.prepare("SELECT * FROM session_names").all());
    expect(dump).toContain("Named");
    expect(dump).not.toContain("SECRETBODY");
  });

  it("show in the item detail with the session's folder, and in the Asked evidence", () => {
    run([prompt("feat/login"), edit("feat/login"), custom("Fix login redirect")]);
    const id = listItems(store)[0]?.itemKey ?? "";
    expect(itemDetailView(store, id)?.sessions[0]).toMatchObject({
      id: SID,
      name: "Fix login redirect",
      cwd: "/home/u/demo",
    });
    const asked = traceView(store, id)?.asked;
    expect(asked).toMatchObject({ sessionId: SID, sessionName: "Fix login redirect", anchorKind: "branch" });
    expect(JSON.stringify(asked)).not.toContain("SECRETBODY");
  });
});

describe("group by branch", () => {
  it("lists one group per branch with its total", () => {
    run([prompt("feat/a"), edit("feat/a")]);
    const view = trackView(store, NOW, query("group=branch&since=all"));
    expect(view.groups.map((g) => [g.id, g.label, g.total])).toEqual([["branch:feat/a", "feat/a", 1]]);
  });
});

describe("injected first messages (D194)", () => {
  const injected = msg(
    "user",
    "u0",
    0,
    "You are operating in a git worktree. Run commands here. SECRETBODY",
    "main",
  );
  const real = msg("user", "u1", 1, "Add pagination to the track page. Then more.", "main");
  const edit2 = msg(
    "assistant",
    "a1",
    2,
    [{ type: "tool_use", id: "t1", name: "Edit", input: { file_path: "/w/a.ts" } }],
    "main",
  );

  it("never title an item; the next real request does", () => {
    run([injected, real, edit2]);
    expect(listItems(store)[0]).toMatchObject({
      title: "Add pagination to the track page",
      titleSource: "request",
    });
  });

  it("leave an item with no real request on the fallback title, never the notice", () => {
    run([injected, edit2]);
    const item = listItems(store)[0];
    expect(item?.titleSource).toBe("fallback");
    expect(item?.title).not.toContain("worktree");
  });

  it("are repaired once: a stored notice title is dropped and the real one is captured", () => {
    store.db
      .prepare("INSERT INTO session_titles (session_id, title, captured_at) VALUES (?, ?, ?)")
      .run(SID, "You are operating in a git worktree", "2026-01-04T00:00:00Z");
    run([injected, real, edit2]);
    expect(
      store.db.prepare("SELECT title FROM session_titles WHERE session_id = ?").get(SID)?.["title"],
    ).toBe("Add pagination to the track page");
  });
});
