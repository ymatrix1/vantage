// Synthetic hook payloads and transcript lines; paths and output are invented for these tests.
import { describe, expect, it } from "vitest";
import { hookEvents, parseTranscriptLine, resolveRepoRoot, transcriptEvents } from "../src/index.ts";

const rec = (hook: Record<string, unknown>) => ({
  v: 1 as const,
  receivedAt: "2026-10-10T10:00:00.000Z",
  hook,
});

describe("resolveRepoRoot", () => {
  it("picks the longest root containing the cwd", () => {
    expect(resolveRepoRoot("/w/repo/pkg/a", ["/w/repo", "/w/repo/pkg", "/w/other"])).toBe("/w/repo/pkg");
  });
  it("returns undefined when no root contains the cwd or the cwd is unreadable", () => {
    expect(resolveRepoRoot("/w/repo-two", ["/w/repo"])).toBeUndefined();
    expect(resolveRepoRoot("~/x", ["/w"])).toBeUndefined();
    expect(resolveRepoRoot("", ["/w"])).toBeUndefined();
  });
  it("reads Windows roots with either separator and case, and a Git Bash cwd", () => {
    expect(resolveRepoRoot("C:\\Work\\Repo\\sub", ["c:/work/repo"])).toBe("c:/work/repo");
    expect(resolveRepoRoot("/c/work/repo/sub", ["C:\\Work\\Repo"])).toBe("C:\\Work\\Repo");
  });
  it("does not match a POSIX cwd against a Windows root", () => {
    expect(resolveRepoRoot("/work/repo", ["C:\\work"])).toBeUndefined();
  });
});

const post = (command: string, cwd: string, response: unknown) =>
  rec({
    hook_event_name: "PostToolUse",
    session_id: "s1",
    tool_use_id: "t1",
    tool_name: "Bash",
    tool_input: { command },
    tool_response: response,
    cwd,
  });
const edited = (ev: ReturnType<typeof hookEvents>) => ev.some((e) => e.kind === "file.edited");
const tline = (o: object) =>
  JSON.stringify({ sessionId: "s", timestamp: "2026-10-10T10:00:00Z", cwd: "/w/repo", ...o });

describe("repo root and test results at ingest", () => {
  const ctx = { repoRoots: ["/w/repo"] };

  it("a subdirectory cwd writing a sibling directory still edits (known root)", () => {
    const ev = hookEvents(post("echo a > ../docs/a.md", "/w/repo/src", { stdout: "" }), ctx);
    expect(ev.find((e) => e.kind === "file.edited")?.payload).toMatchObject({ paths: ["../docs/a.md"] });
  });
  it("without a known root the same write is outside (conservative fallback to cwd)", () => {
    expect(edited(hookEvents(post("echo a > ../docs/a.md", "/w/repo/src", { stdout: "" })))).toBe(false);
  });
  it("a write above the known root stays outside and is recorded", () => {
    const ev = hookEvents(post("echo a > ../../scratch.txt", "/w/repo/src", {}), ctx);
    expect(edited(ev)).toBe(false);
    expect(ev[0]?.payload).toMatchObject({ outsidePaths: ["../../scratch.txt"] });
  });
  it("a sibling repo that shares the root prefix stays outside", () => {
    expect(edited(hookEvents(post("echo a > ../../repo-two/a.ts", "/w/repo/src", {}), ctx))).toBe(false);
  });
  it("Windows subdirectory cwd with a Windows root", () => {
    const c = { repoRoots: ["C:\\Work\\Repo"] };
    expect(edited(hookEvents(post("echo a > ..\\docs\\a.md", "C:\\Work\\Repo\\src", {}), c))).toBe(true);
    expect(edited(hookEvents(post("echo a > ..\\..\\x.md", "C:\\Work\\Repo\\src", {}), c))).toBe(false);
  });

  it("attaches the parsed test counts and never the output text", () => {
    const ev = hookEvents(
      post("pnpm vitest run", "/w/repo", { stdout: "      Tests  0 passed (0)\nsecret-line" }),
    );
    expect(ev[0]?.payload["result"]).toEqual({ run: 0, passed: 0, failed: 0, skipped: 0 });
    expect(JSON.stringify(ev)).not.toContain("secret-line");
  });
  it("leaves result absent for unrecognised output", () => {
    const ev = hookEvents(post("pnpm vitest run", "/w/repo", { stdout: "hello" }));
    expect(ev[0]?.payload).not.toHaveProperty("result");
  });
  it("reads output from a transcript tool_result", () => {
    const lines = [
      tline({
        type: "assistant",
        message: { content: [{ type: "tool_use", id: "x", name: "Bash", input: { command: "pytest" } }] },
      }),
      tline({
        type: "user",
        uuid: "u",
        message: {
          content: [
            {
              type: "tool_result",
              tool_use_id: "x",
              content: [{ type: "text", text: "no tests ran in 0.01s" }],
            },
          ],
        },
      }),
    ].flatMap((l) => parseTranscriptLine(l) ?? []);
    const cmd = transcriptEvents(lines).find((e) => e.kind === "command.ran");
    expect(cmd?.payload["result"]).toMatchObject({ run: 0 });
  });
});
