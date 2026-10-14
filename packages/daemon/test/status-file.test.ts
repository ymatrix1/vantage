// Synthetic events only.
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { parseStatusSummary, renderStatusLine } from "@vantage/core";
import type { VantageEvent } from "@vantage/core";
import { Store, buildStatusSummary, createStageLoop, runStagePass, writeStatusFile } from "../src/index.ts";

let dir = "";
let store: Store;
beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "vantage-status-"));
  store = new Store(join(dir, "v.db"));
});
afterEach(() => {
  store.close();
  rmSync(dir, { recursive: true, force: true });
});

let n = 0;
const put = (kind: VantageEvent["kind"], at: string, session: string, payload: Record<string, unknown>) => {
  store.insertEvent(
    { sourceId: `d${++n}`, source: "claude_code", kind, timestamp: at, sessionId: session, payload },
    "2026-01-05T10:00:00Z",
  );
};
const now = new Date("2026-01-05T10:00:00Z");

describe("status file", () => {
  it("maps each session to its item, with stage, proof and flags", () => {
    put("file.edited", "2026-01-05T09:00:00Z", "s1", { branch: "feat/billing", path: "src/a.ts" });
    put("command.ran", "2026-01-05T09:05:00Z", "s1", {
      branch: "feat/billing",
      command: "vitest run",
      ok: true,
      cwd: "/r",
    });
    put("file.edited", "2026-01-05T09:10:00Z", "s2", { branch: "feat/other", path: "src/b.ts" });
    runStagePass(store, {}, now);
    const s = buildStatusSummary(store, now);
    expect(s.sessions["s1"]).toMatchObject({ stage: "proven" });
    expect(s.sessions["s2"]).toMatchObject({ stage: "built" });
    expect(s.writtenAt).toBe(now.toISOString());
  });

  it("counts items with an open flag as needs you", () => {
    put("file.edited", "2026-01-05T09:00:00Z", "s1", { branch: "feat/billing", path: "src/a.ts" });
    put("session.stopped", "2026-01-05T09:30:00Z", "s1", { branch: "feat/billing" });
    runStagePass(store, {}, now);
    const s = buildStatusSummary(store, now);
    expect(s.needsYou).toBe(1);
    expect(s.sessions["s1"]?.flags).toEqual(["unproven_claim"]);
  });

  it("leaves out sessions idle for more than seven days", () => {
    put("file.edited", "2025-12-20T09:00:00Z", "old", { branch: "feat/old", path: "src/a.ts" });
    runStagePass(store, {}, now);
    expect(Object.keys(buildStatusSummary(store, now).sessions)).toEqual([]);
  });

  it("writes a file the renderer reads back (nested directory created)", () => {
    put("file.edited", "2026-01-05T09:00:00Z", "s1", { branch: "feat/billing", path: "src/a.ts" });
    runStagePass(store, {}, now);
    const path = join(dir, "nested", "status.json");
    writeStatusFile(store, path, now);
    const parsed = parseStatusSummary(readFileSync(path, "utf8"));
    expect(renderStatusLine(parsed, { sessionId: "s1", now, columns: 80 })).toContain("●●◐○○○");
  });

  it("the stage loop rewrites it after every pass, and a failed write does not hide the pass", () => {
    put("file.edited", "2026-01-05T09:00:00Z", "s1", { branch: "feat/billing", path: "src/a.ts" });
    const path = join(dir, "status.json");
    const loop = createStageLoop({ store, statusFile: path, now: () => now });
    expect(loop.tick().items).toBe(1);
    expect(parseStatusSummary(readFileSync(path, "utf8"))?.sessions["s1"]?.stage).toBe("built");

    const errors: unknown[] = [];
    const bad = createStageLoop({
      store,
      statusFile: join(path, "x"),
      now: () => now,
      onError: (e) => errors.push(e),
    });
    expect(bad.tick().items).toBe(1);
    expect(errors).toHaveLength(1);
  });
});
