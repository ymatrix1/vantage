// Synthetic commands only. A grep or echo that mentions a test runner is not a test run.
import { describe, expect, it } from "vitest";
import { computeStages, linkEvents, splitCommandSegments } from "../src/index.ts";
import type { VantageEvent } from "../src/index.ts";

describe("splitCommandSegments", () => {
  it("splits on unquoted separators and keeps each segment's text", () => {
    expect(splitCommandSegments("a && b || c; d | e\nf")).toEqual(["a", "b", "c", "d", "e", "f"]);
  });

  it("does not cut inside double or single quotes", () => {
    expect(splitCommandSegments('grep "a|b;c&&d" f | wc -l')).toEqual(['grep "a|b;c&&d" f', "wc -l"]);
    expect(splitCommandSegments("echo 'x || y' && ls")).toEqual(["echo 'x || y'", "ls"]);
    expect(splitCommandSegments('echo "say \\"a|b\\"" | cat')).toEqual(['echo "say \\"a|b\\""', "cat"]);
  });

  it("does not cut after a backslash, inside backticks or inside $(...)", () => {
    expect(splitCommandSegments("grep a\\|b file; ls")).toEqual(["grep a\\|b file", "ls"]);
    expect(splitCommandSegments("echo `a | b` && ls")).toEqual(["echo `a | b`", "ls"]);
    expect(splitCommandSegments("echo $(a | b; c) && ls")).toEqual(["echo $(a | b; c)", "ls"]);
    expect(splitCommandSegments("echo $(a $(b | c) | d) | e")).toEqual(["echo $(a $(b | c) | d)", "e"]);
  });

  it("skips here-document bodies", () => {
    expect(splitCommandSegments("cat <<EOF\npytest | unittest; vitest\nEOF\nls")).toEqual([
      "cat <<EOF",
      "ls",
    ]);
  });

  it("copes with unbalanced quotes, empty input and stray separators", () => {
    expect(splitCommandSegments("")).toEqual([]);
    expect(splitCommandSegments(" ;; && ")).toEqual([]);
    expect(() => splitCommandSegments('echo "unterminated | x $(')).not.toThrow();
  });
});

let n = 0;
const at = (m: number): string => new Date(Date.UTC(2026, 0, 5, 9, m)).toISOString();
const ev = (kind: VantageEvent["kind"], m: number, payload: Record<string, unknown>): VantageEvent => ({
  sourceId: `p${++n}`,
  source: "claude_code",
  kind,
  timestamp: at(m),
  sessionId: "s1",
  payload: { branch: "feat/ftk-1-demo", ...payload },
});
/** One edit, then `command` run successfully: the proofs the machine recorded and the stage reached. */
function proofsOf(command: string): { proofs: number; stage: string } {
  const events = [
    ev("file.edited", 1, { path: "/w/src/a.ts", via: "edit-tool" }),
    ev("command.ran", 2, { command, ok: true }),
  ];
  const [item] = computeStages(events, linkEvents(events).links, {});
  return { proofs: item?.proofs.length ?? -1, stage: item?.stage ?? "" };
}

describe("a command that only mentions a runner is not a check", () => {
  it.each([
    // The shape found on real data: a quoted grep pattern holding `\|unittest`.
    'grep -n "^### D17\\|^### D33" docs/DECISIONS.md; grep -rn "check_docs\\|unittest" .github/workflows/*.yml',
    'grep -n "check_docs\\|unittest" tools/check_docs.py',
    'echo "pytest"',
    "echo vitest",
    "cat notes.txt | grep vitest",
    'rg "pytest|vitest" src',
    "head -20 tools/run-pytest.sh",
    "git log --oneline -5 -- test/unittest",
    "git grep -n 'npm test' -- docs",
    "ls tests/pytest",
    "find . -name '*.test.ts' | wc -l",
    "sed -n '1,20p' vitest.config.ts",
  ])("records no proof for %s", (command) => {
    expect(proofsOf(command)).toEqual({ proofs: 0, stage: "built" });
  });

  it("still counts a real run next to a read-only command", () => {
    expect(proofsOf('grep -n "x" f; pnpm vitest run')).toEqual({ proofs: 1, stage: "proven" });
    expect(proofsOf("cat notes.txt | pytest -q")).toEqual({ proofs: 1, stage: "proven" });
  });
});

describe("real runners are still recognised", () => {
  it.each([
    "pnpm vitest run",
    "npx vitest",
    "npm test",
    "pnpm test -- --run",
    "python -m pytest -q",
    "python3 -m unittest discover -s tools",
    "pytest tests/",
    "dotnet test",
    "cargo test",
    "go test ./...",
    "cd packages/core && pnpm vitest run",
    "time pnpm vitest run",
    "env CI=1 pnpm vitest run",
    "CI=1 NODE_ENV=test pnpm vitest run",
    "time env CI=1 pnpm test",
    "pnpm test 2>&1 | tail -20",
    "pnpm test | tee out.txt",
    'psql -c "select 1; select 2"',
    "duckdb db.duckdb < check.sql",
  ])("counts %s", (command) => {
    expect(proofsOf(command).proofs).toBe(1);
  });
});
