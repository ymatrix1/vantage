// Synthetic prompts only. Secret-looking strings below are made up and match no real service.
import { describe, expect, it } from "vitest";
import { REQUEST_TITLE_MAX, firstRequestTitle, parseTranscriptLine, requestTitle } from "../src/index.ts";

describe("requestTitle", () => {
  it("takes the first sentence of a plain request", () => {
    expect(requestTitle("Add pagination to the track page. Then update the docs and run the tests.")).toBe(
      "Add pagination to the track page",
    );
    expect(requestTitle("Why does the stage pass skip old items? I think it is the window.")).toBe(
      "Why does the stage pass skip old items?",
    );
  });

  it("keeps dots inside names and versions", () => {
    expect(requestTitle("Fix foo.ts and bump to v2.1.0 today")).toBe("Fix foo.ts and bump to v2.1.0 today");
  });

  it("uses only the first non-empty line, never the pasted body below it", () => {
    const t = requestTitle("\n\nRefactor the linker\n\nline two SECRETBODY\nline three");
    expect(t).toBe("Refactor the linker");
  });

  it.each([
    ["a URL", "Read https://internal.example.com/a?b=c and summarise it", "Read and summarise it"],
    ["a www host", "See www.example.com for the spec", "See for the spec"],
    ["a unix path", "Fix the bug in /home/someone/proj/src/a.ts please", "Fix the bug in please"],
    ["a home path", "Look at ~/.claude/settings.json now", "Look at now"],
    ["a windows path", "Open C:\\Users\\someone\\code\\a.ts quickly", "Open quickly"],
    ["a relative path", "Check ./packages/core/src/a.ts again", "Check again"],
    ["an email", ["Send it to someone", "@example.com later"].join(""), "Send it to later"],
    ["an env var", "Use $HOME and %APPDATA% here", "Use and here"],
  ])("removes %s", (_n, input, expected) => {
    expect(requestTitle(input)).toBe(expected);
  });

  it.each([
    ["sk", "-ant-api03-ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"].join(""),
    ["gh", "p_abcdefghijklmnopqrstuvwxyz0123456789"].join(""),
    ["xox", "b-1234-5678-abcdefghijkl"].join(""),
    "AKIAABCDEFGHIJKLMNOP",
    "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.abcdef",
    "0123456789abcdef0123456789abcdef",
    "QUJDREVGR0hJSktMTU5PUFFSU1RVVldYWVo=",
    "3f2504e0-4f89-11d3-9a0c-0305e82c3301",
    "a1b2c3d4e5f6g7h8",
  ])("removes the secret-looking string %s", (secret) => {
    const t = requestTitle(`Deploy with ${secret} to staging`);
    expect(t).toBe("Deploy with to staging");
    expect(t).not.toContain(secret.slice(0, 8));
  });

  it("removes key=value credentials and bearer tokens whatever the value looks like", () => {
    expect(requestTitle("Call the api with password=hunter2 and retry")).toBe("Call the api with and retry");
    expect(requestTitle("Use api_key: abc and token = xyz here")).toBe("Use and here");
    expect(requestTitle("Send Authorization: Bearer abc.def now")).toBe("Send now");
  });

  it("strips markup: fences, inline code, tags, links, headings, lists, emphasis", () => {
    expect(requestTitle("```ts\nconst secretStuff = 1\n```\nFix the parser")).toBe("Fix the parser");
    expect(requestTitle("Fix `parseThing()` in the **linker** now")).toBe("Fix in the linker now");
    expect(requestTitle("<command-message>x</command-message> Update the docs")).toBe("x Update the docs");
    expect(requestTitle("See [the guide](https://x.example/guide) first")).toBe("See the guide first");
    expect(requestTitle("## Plan\n- add tests")).toBe("Plan");
    expect(requestTitle("1. Rename the column")).toBe("Rename the column");
    expect(requestTitle("> quoted request here")).toBe("quoted request here");
  });

  it("caps at 80 characters, cutting at a word and adding an ellipsis", () => {
    const long = ["Please ", "refactor the stage machine so every flag keeps its reason "].join("").repeat(5);
    const t = requestTitle(long) ?? "";
    expect(Array.from(t).length).toBeLessThanOrEqual(REQUEST_TITLE_MAX);
    expect(t.endsWith("…")).toBe(true);
    expect(t).not.toMatch(/\s…$/);
  });

  it("cuts an 80-character word run with no spaces without throwing", () => {
    const t = requestTitle(
      "x"
        .repeat(200)
        .replace(/(.{10})/g, "$1 ")
        .trim(),
    );
    expect(Array.from(t ?? "").length).toBeLessThanOrEqual(REQUEST_TITLE_MAX);
  });

  it("counts characters, not UTF-16 units", () => {
    const t = requestTitle(["Ajuste a página de acompanhamento ", "ação "].join("").repeat(30)) ?? "";
    expect(Array.from(t).length).toBeLessThanOrEqual(REQUEST_TITLE_MAX);
  });

  it.each([
    "",
    "   \n\t ",
    "```\nonly code\n```",
    "https://example.com/only/a/url",
    "/clear",
    "<command-name>/clear</command-name>",
    "ok",
    "!!! ???",
    "12345678",
  ])("gives null when nothing usable is left: %j", (input) => {
    expect(requestTitle(input)).toBeNull();
  });

  it("never throws on odd input", () => {
    for (const s of ["\u0000\u0001", "a".repeat(100_000), "``` unterminated", "<<<>>>", "[](", "\\\\"]) {
      expect(() => requestTitle(s)).not.toThrow();
    }
  });
});

const line = (o: Record<string, unknown>): string =>
  JSON.stringify({ sessionId: "s1", timestamp: "2026-01-05T09:00:00Z", uuid: "u", isSidechain: false, ...o });
const parse = (o: Record<string, unknown>): NonNullable<ReturnType<typeof parseTranscriptLine>> => {
  const p = parseTranscriptLine(line(o));
  if (!p) throw new Error("unparsed");
  return p;
};

describe("firstRequestTitle", () => {
  it("reads string content and text blocks", () => {
    expect(
      firstRequestTitle([parse({ type: "user", message: { content: "Add a title. More text." } })], "s1"),
    ).toEqual({ found: true, title: "Add a title" });
    expect(
      firstRequestTitle(
        [parse({ type: "user", message: { content: [{ type: "text", text: "Block request" }] } })],
        "s1",
      ),
    ).toEqual({ found: true, title: "Block request" });
  });

  it("uses only the first request, even when it leaves nothing", () => {
    const lines = [
      parse({ type: "user", message: { content: "/clear" }, uuid: "a" }),
      parse({ type: "user", message: { content: "Second real request" }, uuid: "b" }),
    ];
    expect(firstRequestTitle(lines, "s1")).toEqual({ found: true, title: null });
  });

  it("skips meta, sidechain, sub-agent, tool results and other sessions' copied lines", () => {
    const lines = [
      parse({ type: "user", isMeta: true, message: { content: "Meta caveat text" } }),
      parse({ type: "user", isSidechain: true, message: { content: "Sidechain prompt" } }),
      parse({ type: "user", agentId: "ag1", message: { content: "Agent prompt" } }),
      parse({
        type: "user",
        message: { content: [{ type: "tool_result", tool_use_id: "t", content: "out" }] },
      }),
      parse({ type: "assistant", message: { content: [{ type: "text", text: "Assistant reply" }] } }),
      parse({ type: "user", sessionId: "parent", message: { content: "Copied parent history" } }),
    ];
    expect(firstRequestTitle(lines, "s1")).toEqual({ found: false, title: null });
    lines.push(parse({ type: "user", message: { content: "Mine" }, uuid: "z" }));
    expect(firstRequestTitle(lines, "s1")).toEqual({ found: true, title: "Mine" });
  });

  it("reports not found for an empty file head", () => {
    expect(firstRequestTitle([], "s1")).toEqual({ found: false, title: null });
  });
});
