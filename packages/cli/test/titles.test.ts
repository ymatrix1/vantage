// Hermetic: temp VANTAGE_HOME, synthetic data.
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { Store, listRequestTitles, runStagePass } from "@vantage/daemon";
import { runCli } from "../src/cli.ts";

let home = "";
const out: string[] = [];
const err: string[] = [];
const run = (...argv: string[]): Promise<number> =>
  runCli(argv, { out: (l) => out.push(l), err: (l) => err.push(l), env: { VANTAGE_HOME: home } });

beforeEach(() => {
  home = mkdtempSync(join(tmpdir(), "vantage-titles-cli-"));
  out.length = 0;
  err.length = 0;
});
afterEach(() => {
  rmSync(home, { recursive: true, force: true });
});

function seed(): void {
  const store = new Store(join(home, "vantage.db"));
  try {
    store.db
      .prepare("INSERT INTO session_titles (session_id, title, captured_at) VALUES (?, ?, ?)")
      .run(
        "abcdef12-0000-0000-0000-000000000000",
        "Add pagination to the track page",
        "2026-01-05T09:00:00Z",
      );
    store.db
      .prepare("INSERT INTO session_titles (session_id, title, captured_at) VALUES (?, ?, ?)")
      .run("99999999-0000-0000-0000-000000000000", "Fix the linker", "2026-01-04T09:00:00Z");
  } finally {
    store.close();
  }
}

describe("vantage titles", () => {
  it("says so when there is no database yet, and creates none", async () => {
    expect(await run("titles")).toBe(0);
    expect(out.join("\n")).toContain("No request titles stored");
  });

  it("lists what is stored, with the capture setting", async () => {
    seed();
    expect(await run("titles")).toBe(0);
    const text = out.join("\n");
    expect(text).toContain("2 request title(s) stored locally");
    expect(text).toContain("Capture is on");
    expect(text).toContain("abcdef12  2026-01-05  Add pagination to the track page");
    expect(text).toContain("99999999  2026-01-04  Fix the linker");
  });

  it("clear deletes every stored title and says how many", async () => {
    seed();
    expect(await run("titles", "clear")).toBe(0);
    expect(out.join("\n")).toContain("Cleared 2 request title(s)");
    const store = new Store(join(home, "vantage.db"));
    try {
      expect(listRequestTitles(store)).toEqual([]);
      runStagePass(store); // still runs on an empty store
    } finally {
      store.close();
    }
  });

  it("rejects anything else with a usage line", async () => {
    expect(await run("titles", "wipe")).toBe(2);
    expect(await run("titles", "clear", "now")).toBe(2);
    expect(err.join("\n")).toContain("Usage: vantage titles [clear]");
  });
});
