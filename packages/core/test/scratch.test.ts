// Synthetic events only. Scratch files (logs, temp output, ignored files) are not code edits.
import { describe, expect, it } from "vitest";
import { computeStages, isScratchPath, linkEvents, normalizeEditPath } from "../src/index.ts";
import type { ItemState, VantageEvent } from "../src/index.ts";

describe("isScratchPath", () => {
  it.each([
    "daemon.log",
    "/w/proj/real.log",
    "C:\\Users\\someone\\proj\\out.log",
    "/w/a.tmp",
    "/w/a.out",
    "/w/a.bak",
    "/w/.a.ts.swp",
    "/w/notes.txt~",
    "/w/a.pyc",
    "/w/a.log.1",
    "/w/a.log.2026-01-05",
    "/tmp/x.ts",
    "/w/proj/tmp/helper.py",
    "C:\\Users\\someone\\AppData\\Local\\Temp\\x.py",
    "/w/proj/node_modules/pkg/index.js",
    "/w/proj/src/__pycache__/a.cpython-312.pyc",
    "/w/proj/.cache/data.json",
    "/w/.DS_Store",
    "/w/Thumbs.db",
  ])("treats %s as scratch", (path) => {
    expect(isScratchPath(path)).toBe(true);
  });

  it.each([
    "/w/src/a.ts",
    "/w/README.md",
    "/w/proj/logger.ts",
    "/w/proj/catalog.py",
    "/w/proj/template.html",
    "/w/proj/src/tmpfile-parser.ts",
    "/w/proj/docs2.py",
    "/w/proj/output/report.ts",
    "",
    "/",
    "src/",
  ])("does not treat %j as scratch", (path) => {
    expect(isScratchPath(path)).toBe(false);
  });

  it("never throws on odd input", () => {
    for (const p of ["\0", "a".repeat(100_000), "\\\\", "..", "/../..", "~"]) {
      expect(() => isScratchPath(p)).not.toThrow();
    }
    expect(Reflect.apply(isScratchPath, undefined, [undefined])).toBe(false);
  });
});

let n = 0;
const at = (m: number): string => new Date(Date.UTC(2026, 0, 5, 9, m)).toISOString();
const ev = (kind: VantageEvent["kind"], m: number, payload: Record<string, unknown> = {}): VantageEvent => ({
  sourceId: `x${++n}`,
  source: "claude_code",
  kind,
  timestamp: at(m),
  sessionId: "s1",
  payload: { branch: "feat/ftk-1-demo", ...payload },
});
const edit = (m: number, path: string | null, extra: Record<string, unknown> = {}): VantageEvent =>
  ev("file.edited", m, { ...(path === null ? {} : { path }), via: "edit-tool", ...extra });
const cmd = (m: number, command: string, ok = true): VantageEvent => ev("command.ran", m, { command, ok });

function one(events: VantageEvent[], opts = {}): ItemState {
  const [item] = computeStages(events, linkEvents(events).links, opts);
  if (!item) throw new Error("no item");
  return item;
}
const kinds = (s: ItemState): string[] => s.flags.map((f) => f.kind).toSorted();

describe("scratch edits in the stage machine", () => {
  it("a scratch-only item stays Asked: no code edit, no stage move, no flag", () => {
    const s = one([ev("prompt.submitted", 0), edit(1, "/w/proj/daemon.log"), ev("session.stopped", 2)], {
      now: new Date(at(3)),
    });
    expect(s.stage).toBe("asked");
    expect(s.codeEdits).toBe(0);
    expect(s.flags).toEqual([]);
    expect(s.scratchEdits).toBe(1);
    expect(s.scratchFiles).toEqual(["daemon.log"]);
  });

  it("a scratch edit after proof does not expire it, and the item stays proven", () => {
    const s = one([edit(1, "/w/src/a.ts"), cmd(2, "pnpm vitest run"), edit(3, "/w/proj/real.log")]);
    expect(s.stage).toBe("proven");
    expect(s.proofStatus).toBe("fresh");
    expect(s.proofs[0]?.state).toBe("fresh");
    expect(s.scratchFiles).toEqual(["real.log"]);
  });

  it("a scratch edit after the last code edit does not raise unproven_claim twice over or move the claim", () => {
    // Code edit, proof, scratch edit, stop: still proven, so no claim flag.
    const s = one(
      [edit(1, "/w/src/a.ts"), cmd(2, "pnpm vitest run"), edit(3, "/w/out.tmp"), ev("session.stopped", 4)],
      { now: new Date(at(5)) },
    );
    expect(kinds(s)).toEqual([]);
  });

  it("a real unproven claim is still flagged, and its reason names the code file, not the scratch one", () => {
    const s = one([edit(1, "/w/src/billing.ts"), edit(2, "/w/proj/daemon.log"), ev("session.stopped", 3)], {
      now: new Date(at(4)),
    });
    expect(kinds(s)).toEqual(["unproven_claim"]);
    expect(s.flags[0]?.reason).toContain("billing.ts");
    expect(s.flags[0]?.reason).not.toContain("daemon.log");
  });

  it("failing runs between scratch edits never make a thrash cycle", () => {
    const s = one(
      [
        edit(1, "/w/proj/a.log"),
        cmd(2, "pnpm vitest run", false),
        edit(3, "/w/proj/a.log"),
        cmd(4, "pnpm vitest run", false),
        edit(5, "/w/proj/a.log"),
        cmd(6, "pnpm vitest run", false),
      ],
      { now: new Date(at(7)) },
    );
    expect(kinds(s)).toEqual([]);
  });

  it("an event touching a scratch file and a code file counts as code", () => {
    const s = one([ev("file.edited", 1, { paths: ["/w/proj/a.log", "/w/src/a.ts"], via: "shell" })]);
    expect(s.codeEdits).toBe(1);
    expect(s.scratchEdits).toBe(0);
    expect(s.stage).toBe("built");
  });

  it("an edit with no readable path keeps counting as code (unclassified)", () => {
    const s = one([edit(1, null)]);
    expect(s.codeEdits).toBe(1);
    expect(s.scratchEdits).toBe(0);
  });

  it("an untracked source file the name rules cannot judge counts as code", () => {
    const s = one([edit(1, "/w/proj/docs2.py")]);
    expect(s.codeEdits).toBe(1);
  });

  it("paths git ignores arrive as scratchPaths and are treated like scratch, in any spelling of the path", () => {
    const ignored = new Set([normalizeEditPath("C:\\Repo\\build-out\\gen.ts")]);
    const s = one([edit(1, "C:\\Repo\\build-out\\gen.ts")], { scratchPaths: ignored });
    expect(s.codeEdits).toBe(0);
    expect(s.scratchFiles).toEqual(["gen.ts"]);
    // The same path without the git answer counts as code.
    expect(one([edit(1, "C:\\Repo\\build-out\\gen.ts")]).codeEdits).toBe(1);
  });

  it("keeps at most 20 scratch names, once each", () => {
    const events = Array.from({ length: 30 }, (_, i) => edit(i % 9, `/w/p/f${i}.log`));
    events.push(edit(1, "/w/p/f0.log"));
    const s = one(events);
    expect(s.scratchFiles).toHaveLength(20);
    expect(new Set(s.scratchFiles).size).toBe(20);
  });

  it("documentation edits and a shell commit are unaffected", () => {
    expect(one([edit(1, "/w/README.md")]).docsOnly).toBe(true);
    expect(one([ev("prompt.submitted", 0), edit(1, "x", { via: "shell-commit" })]).scratchEdits).toBe(0);
  });
});

describe("repoRelative", () => {
  it("reads the name rules on the path inside the repo only", () => {
    const abs = "/home/u/tmp/projects/app/src/a.ts"; // the repo itself sits under a tmp folder
    expect(one([edit(1, abs)]).scratchEdits).toBe(1); // without git, the name rule sees "tmp"
    const rel = new Map([[normalizeEditPath(abs), "src/a.ts"]]);
    const s = one([edit(1, abs)], { repoRelative: rel });
    expect(s.codeEdits).toBe(1);
    expect(s.scratchEdits).toBe(0);
  });

  it("still catches scratch inside the repo", () => {
    const abs = "/home/u/tmp/projects/app/tmp/x.ts";
    const rel = new Map([[normalizeEditPath(abs), "tmp/x.ts"]]);
    expect(one([edit(1, abs)], { repoRelative: rel }).scratchEdits).toBe(1);
  });
});
