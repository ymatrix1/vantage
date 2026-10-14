import { describe, expect, it } from "vitest";
import {
  detectShellEffects,
  hookEvents,
  parseSpoolRecord,
  parseTranscriptLine,
  transcriptEvents,
} from "../src/index.ts";

const rec = (hook: Record<string, unknown>) => ({
  v: 1 as const,
  receivedAt: "2026-10-10T10:00:00.000Z",
  hook,
});

describe("detectShellEffects", () => {
  it.each([
    ["echo hi > out.txt", ["out.txt"]],
    ["echo hi >> log/out.txt", ["log/out.txt"]],
    ["cat a | tee -a b.txt", ["b.txt"]],
    ["Set-Content -Path a.md 'x'", ["a.md"]],
    ['"x" | Out-File "my file.txt"', ["my file.txt"]],
  ])("names written paths in %s", (cmd, writes) => {
    expect(detectShellEffects(cmd).writes).toEqual(writes);
  });

  it.each([
    "pnpm test 2>&1",
    "ls 2>/dev/null",
    "cmd > /dev/null",
    "foo > $null",
    "grep a < in.txt",
    "echo 1>&2",
  ])("ignores non-writes in %s", (cmd) => {
    expect(detectShellEffects(cmd).writes).toEqual([]);
  });

  it("flags opaque writes and commits", () => {
    expect(detectShellEffects("sed -i s/a/b/ f.ts").opaqueWrite).toBe(true);
    expect(detectShellEffects("apply_patch <<EOF").opaqueWrite).toBe(true);
    expect(detectShellEffects("git commit -m x").commit).toBe(true);
    expect(detectShellEffects("git -C repo commit -m x").commit).toBe(true);
    expect(detectShellEffects("git status").commit).toBe(false);
  });

  // Regression: false-positive shapes found sampling real transcripts (vantage-9bg1). Synthetic commands.
  it.each([
    ['grep -n "a->b" src/x.cpp', "arrow inside a quoted grep pattern"],
    ["grep -E 'size>256M' app.log | head", "redirect character inside single quotes"],
    ["sed -E 's/[a-z]{4,}/<id>/g' notes.json", "angle brackets inside a quoted sed script"],
    ['echo "a > b" | wc -c', "greater-than inside a quoted echo"],
    ["awk '{ if (n>=3) print }' data.txt", "comparison operator inside quotes"],
    ["python3 - <<'E'\nif a >= 1: print(a)\nE", "comparison inside a here-document body"],
    ["cat <<EOF\nx => y\nEOF", "arrow inside a here-document body"],
    ["echo pitch >= 3", "operator that is not a redirect"],
  ])("does not name a write for %s (%s)", (cmd) => {
    expect(detectShellEffects(cmd).writes).toEqual([]);
  });

  it("still names a quoted redirect target and a heredoc redirect", () => {
    expect(detectShellEffects('echo hi > "my file.txt"').writes).toEqual(["my file.txt"]);
    expect(detectShellEffects("cat > notes.md <<'EOF'\nbody > ignored\nEOF").writes).toEqual(["notes.md"]);
  });

  it("ignores sed -i and git commit that only appear as quoted text", () => {
    expect(detectShellEffects("grep -n 'sed -i' docs/a.md").opaqueWrite).toBe(false);
    expect(detectShellEffects('echo "run git commit later"').commit).toBe(false);
  });

  it("flags scripted file writes as opaque writes", () => {
    const script = "python3 - <<'E'\np='a.txt'\nopen(p,'w',newline='').write('x')\nE";
    expect(detectShellEffects(script).opaqueWrite).toBe(true);
    expect(detectShellEffects("python3 - <<'E'\nprint(open('a.txt').read())\nE").opaqueWrite).toBe(false);
    expect(detectShellEffects("git mv a.ts b.ts").opaqueWrite).toBe(true);
  });

  it("finds a commit whose config argument is quoted", () => {
    expect(detectShellEffects('git -c user.name="A B" commit -m x').commit).toBe(true);
  });
});

const kind = (name: string, extra = {}) =>
  hookEvents(rec({ hook_event_name: name, session_id: "s-1", ...extra })).map((e) => e.kind);

describe("hookEvents", () => {
  it("maps lifecycle hooks to catalog kinds", () => {
    expect(kind("SessionStart", { source: "startup" })).toEqual(["session.started"]);
    expect(kind("SessionEnd")).toEqual(["session.ended"]);
    expect(kind("PreCompact", { trigger: "auto" })).toEqual(["session.compacted"]);
    expect(kind("PermissionRequest", { tool_name: "Bash" })).toEqual(["session.waiting"]);
    expect(kind("Notification", { notification_type: "idle_prompt" })).toEqual(["session.waiting"]);
    expect(kind("Stop")).toEqual([]);
  });

  it("gives a replayed spool line the same source id", () => {
    const r = rec({ hook_event_name: "SessionStart", session_id: "s-1" });
    expect(hookEvents(r)[0]?.sourceId).toBe(hookEvents(r)[0]?.sourceId);
  });

  it("records PostToolUseFailure as a failed command", () => {
    const [e] = hookEvents(
      rec({
        hook_event_name: "PostToolUseFailure",
        session_id: "s-1",
        tool_use_id: "t1",
        tool_name: "Bash",
        tool_input: { command: "pnpm test" },
      }),
    );
    expect(e).toMatchObject({
      kind: "command.ran",
      sourceId: "cc:tool:t1:command",
      payload: { ok: false },
    });
  });

  it("treats shell writes and commits as edits", () => {
    const events = hookEvents(
      rec({
        hook_event_name: "PostToolUse",
        session_id: "s-1",
        tool_use_id: "t2",
        tool_name: "Bash",
        tool_input: { command: "echo a > src/a.ts && git commit -am x" },
      }),
    );
    expect(events.map((e) => e.kind)).toEqual(["command.ran", "file.edited"]);
    expect(events[1]?.payload).toMatchObject({ via: "shell", paths: ["src/a.ts"] });
  });

  it("maps edit tools to file.edited with the path", () => {
    const [e] = hookEvents(
      rec({
        hook_event_name: "PostToolUse",
        session_id: "s-1",
        tool_use_id: "t3",
        tool_name: "Write",
        tool_input: { file_path: "/w/a.ts" },
      }),
    );
    expect(e).toMatchObject({
      kind: "file.edited",
      payload: { path: "/w/a.ts", via: "edit-tool" },
    });
  });
});

describe("spool and transcript parsing", () => {
  it("rejects malformed spool lines", () => {
    expect(parseSpoolRecord("nope")).toBeNull();
    expect(parseSpoolRecord('{"v":2,"receivedAt":"2026-10-10T10:00:00Z","hook":{}}')).toBeNull();
  });

  it("pairs tool results with calls and gives hook and transcript the same id", () => {
    const lines = [
      '{"type":"assistant","sessionId":"s-1","timestamp":"2026-10-10T10:00:05Z","message":{"content":[{"type":"tool_use","id":"t1","name":"Bash","input":{"command":"pnpm test"}}]}}',
      '{"type":"user","uuid":"u1","sessionId":"s-1","timestamp":"2026-10-10T10:00:09Z","message":{"content":[{"type":"tool_result","tool_use_id":"t1","is_error":true}]}}',
    ].flatMap((l) => parseTranscriptLine(l) ?? []);
    const [e] = transcriptEvents(lines);
    expect(e).toMatchObject({ sourceId: "cc:tool:t1:command", payload: { ok: false } });
  });
});
