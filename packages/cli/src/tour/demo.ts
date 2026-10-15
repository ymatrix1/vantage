// `vantage tour --demo`: a temporary, synthetic Vantage home (docs/specs/first-run.md#the-guided-tour).
// Everything here is invented: repos named demo-*, paths under /demo, titles that say they are fake. Nothing is
// read from the real home, the real Claude Code folder or any repo, and nothing is written outside the temp dir.
import { mkdirSync, mkdtempSync, realpathSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, join, resolve, sep } from "node:path";
import { Store, runStagePass } from "@vantage/daemon";
import type { VantageEvent } from "@vantage/core";

export const DEMO_PREFIX = "vantage-demo-";
const H = 3_600_000;
const D = 24 * H;
const SOURCE = "claude_code";

/** Invented items, by the stage and flag each one is meant to show. */
export interface DemoItemSpec {
  /** What the item demonstrates; the title the Track page shows is derived from its branch or request. */
  shows: string;
  stage: "asked" | "built" | "proven";
  flags: Array<"unproven_claim" | "thrashing" | "forgotten">;
}

export const DEMO_ITEMS: readonly DemoItemSpec[] = [
  { shows: "proven, L2 (the test names the changed file)", stage: "proven", flags: [] },
  { shows: "proven, L1", stage: "proven", flags: [] },
  { shows: "built, no proof yet", stage: "built", flags: [] },
  { shows: "an unproven claim (said done, no check)", stage: "built", flags: ["unproven_claim"] },
  { shows: "thrashing (three edit-then-fail loops)", stage: "built", flags: ["thrashing"] },
  { shows: "asked, nothing built yet", stage: "asked", flags: [] },
  { shows: "asked, a second one", stage: "asked", flags: [] },
  { shows: "forgotten (quiet for 8 days)", stage: "built", flags: ["forgotten"] },
  { shows: "proof expired by a later edit", stage: "built", flags: [] },
  { shows: "docs only, proof not required", stage: "built", flags: [] },
  { shows: "a group of derived sessions on one item", stage: "built", flags: [] },
  { shows: "a session with no ticket or branch", stage: "built", flags: [] },
];

/** A fresh temp directory for the demo home. Never inside the real home, never `VANTAGE_HOME`. */
export function makeDemoHome(): string {
  return mkdtempSync(join(tmpdir(), DEMO_PREFIX));
}

/** Deletes a demo home, and only a directory this module made (name prefix, directly inside the temp dir). */
export function removeDemoHome(home: string): boolean {
  const dir = resolve(home);
  const inTmp = dir.startsWith(realpathSync(tmpdir()) + sep) || dir.startsWith(resolve(tmpdir()) + sep);
  if (!inTmp || !basename(dir).startsWith(DEMO_PREFIX)) return false;
  rmSync(dir, { recursive: true, force: true });
  return true;
}

/** True when `a` and `b` are the same folder (case-insensitive on Windows). */
export function sameFolder(a: string, b: string): boolean {
  return normalize(a) === normalize(b);
}

const normalize = (p: string): string =>
  process.platform === "win32" ? resolve(p).toLowerCase() : resolve(p);

/** Writes the synthetic events and runs one stage pass so the Track page has rows at once. */
export function seedDemoHome(home: string, now: Date = new Date()): void {
  mkdirSync(home, { recursive: true });
  const store = new Store(join(home, "vantage.db"));
  try {
    let seq = 0;
    const at = (msAgo: number): string => new Date(now.getTime() - msAgo).toISOString();
    const put = (
      session: string,
      kind: VantageEvent["kind"],
      msAgo: number,
      payload: Record<string, unknown>,
    ): void => {
      store.insertEvent(
        {
          sourceId: `demo:${++seq}`,
          source: SOURCE,
          kind,
          timestamp: at(msAgo),
          sessionId: session,
          payload,
        },
        at(msAgo),
      );
    };
    const shop = { cwd: "/demo/demo-shop" };
    const api = { cwd: "/demo/demo-api" };
    const docs = { cwd: "/demo/demo-docs" };
    const edit = (s: string, repo: { cwd: string }, branch: string, file: string, msAgo: number): void =>
      put(s, "file.edited", msAgo, { ...repo, branch, path: `${repo.cwd}/${file}` });
    const run = (
      s: string,
      repo: { cwd: string },
      branch: string,
      command: string,
      ok: boolean,
      msAgo: number,
    ): void => put(s, "command.ran", msAgo, { ...repo, branch, command, ok });

    // 1. Proven, L2: the test command names the edited file.
    edit("demo-s01", shop, "feat/checkout-retry", "checkout.ts", 5 * H);
    run(
      "demo-s01",
      shop,
      "feat/checkout-retry",
      "pnpm vitest run checkout.test.ts checkout.ts",
      true,
      5 * H - 60_000,
    );
    // 2. Proven, L1: a plain test run.
    edit("demo-s02", shop, "feat/promo-banner", "banner.ts", 4 * H);
    run("demo-s02", shop, "feat/promo-banner", "pnpm test", true, 4 * H - 60_000);
    // 3. Built, no proof yet.
    edit("demo-s03", api, "feat/rate-limit", "limiter.ts", 3 * H);
    // 4. Unproven claim: edits, then the session stops with no check.
    edit("demo-s04", api, "fix/login-timeout", "login.ts", 2 * H);
    put("demo-s04", "session.stopped", 2 * H - 60_000, { ...api, branch: "fix/login-timeout" });
    // 5. Thrashing: three edit-then-fail loops on one file.
    for (let i = 0; i < 3; i++) {
      edit("demo-s05", api, "fix/flaky-parser", "parser.ts", 3 * H - i * 20 * 60_000);
      run("demo-s05", api, "fix/flaky-parser", "pnpm test", false, 3 * H - i * 20 * 60_000 - 60_000);
    }
    // 6 and 7. Asked: a request, no code yet.
    put("demo-s06", "prompt.submitted", 6 * H, { ...shop, branch: "feat/wishlist" });
    put("demo-s07", "prompt.submitted", 7 * H, { ...docs, branch: "docs/faq-page" });
    // 8. Forgotten: built, quiet for 8 days.
    edit("demo-s08", shop, "wip/old-idea", "idea.ts", 8 * D);
    // 9. Proof expired: tested, then edited again.
    edit("demo-s09", shop, "feat/search-filter", "filter.ts", 9 * H);
    run("demo-s09", shop, "feat/search-filter", "pnpm test", true, 9 * H - 60_000);
    edit("demo-s09", shop, "feat/search-filter", "filter.ts", 8 * H);
    // 10. Docs only.
    edit("demo-s10", docs, "docs/changelog", "CHANGELOG.md", 10 * H);
    // 11. A group of derived sessions: a root, a resume and a fork, all on the default branch.
    edit("demo-s11a", docs, "main", "guide.ts", 12 * H);
    put("demo-s11b", "session.derived", 11 * H, { parentSessionId: "demo-s11a", lineage: "continuation" });
    edit("demo-s11b", docs, "main", "guide.ts", 11 * H - 60_000);
    put("demo-s11c", "session.derived", 10 * H, { parentSessionId: "demo-s11a", lineage: "continuation" });
    edit("demo-s11c", docs, "main", "guide.ts", 10 * H - 60_000);
    // 12. A session with edits and nothing to name it: the "Session ..." fallback.
    edit("demo-s12", api, "main", "scratch.ts", H);

    // A readable title for the derived group, as a stored first request would give it (made up).
    store.db
      .prepare("INSERT OR IGNORE INTO session_titles (session_id, title, captured_at) VALUES (?, ?, ?)")
      .run("demo-s11a", "Tidy the demo guide page", at(12 * H));
    runStagePass(store, { requestTitles: true }, now);
  } finally {
    store.close();
  }
}
