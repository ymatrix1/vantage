// Synthetic data only: every secret, path and command below is invented.
import { describe, expect, it } from "vitest";
import {
  CLASSIFY_PROMPT_VERSION,
  batchIds,
  buildPrompt,
  classifySchema,
  contentHash,
  parseClassifyOutput,
  payloadItem,
  requestSnippet,
  stripText,
  toBatches,
  type ClassifyCandidate,
} from "../src/classify.ts";

const SECRET = "sk-ant-api03-ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
const candidate: ClassifyCandidate = {
  repo: "C:\\Users\\someone\\code\\synthetic-repo",
  branch: "feat/login-form",
  request: `Fix the login form so it validates email. See https://internal.example.test/ticket/42 and use token=${SECRET}. Second sentence stays out.`,
  files: [
    "C:\\work\\secret-project\\src\\LoginForm.svelte",
    "/home/someone/code/synthetic-repo/src/validate.ts",
    "/home/someone/code/synthetic-repo/src/validate.ts",
    "README.md",
  ],
  sessions: 3,
  edits: 7,
  proof: "fresh",
  title: "Session 2026-10-14",
};

describe("payload", () => {
  it("sends only the allowed fields and no paths, urls, secrets or commands", () => {
    // Extra fields a caller might attach: they must not reach the payload.
    const p = payloadItem(
      Object.assign({}, candidate, { command: "rm -rf /secret", transcript: "long text" }),
      "i1",
    );
    expect(Object.keys(p).toSorted()).toEqual(
      ["branch", "edits", "files", "id", "proof", "repo", "request", "sessions", "title"].toSorted(),
    );
    const sent = JSON.stringify(p);
    expect(sent).not.toContain(SECRET);
    expect(sent).not.toContain("internal.example.test");
    expect(sent).not.toContain("someone");
    expect(sent).not.toContain("secret-project");
    expect(sent).not.toContain("rm -rf");
    expect(sent).not.toContain("Second sentence");
    expect(sent).not.toMatch(/[\\/]src[\\/]/);
    expect(p.repo).toBe("synthetic-repo");
    expect(p.files).toEqual(["LoginForm.svelte", "validate.ts", "README.md"]);
    expect(p.request).toBe("Fix the login form so it validates email.");
  });

  it("caps the request at 300 characters and the files at 10", () => {
    const long = `${"word ".repeat(100)}.`;
    expect(requestSnippet(long).length).toBeLessThanOrEqual(300);
    const files = Array.from({ length: 30 }, (_, i) => `/a/b/file${i}.ts`);
    expect(payloadItem({ ...candidate, files }, "i1").files).toHaveLength(10);
  });

  it("strips credential-looking runs, emails and long numbers", () => {
    const s = stripText(
      `mail me@example.test pass: hunter2 ghp_${"a".repeat(30)} ${"0123456789".repeat(3)} ok`,
    );
    expect(s).toBe("mail ok");
  });

  it("the prompt holds the payload and nothing else about the item", () => {
    const items = [payloadItem(candidate, "i1")];
    const prompt = buildPrompt(items);
    expect(prompt).toContain('"id":"i1"');
    expect(prompt).not.toContain(SECRET);
  });

  it("content hash ignores counts and the current title, not the text", () => {
    const a = payloadItem(candidate, "i1");
    const b = payloadItem({ ...candidate, sessions: 9, edits: 1, title: "Another title" }, "i7");
    expect(contentHash(a)).toBe(contentHash(b));
    expect(contentHash(payloadItem({ ...candidate, branch: "feat/other" }, "i1"))).not.toBe(contentHash(a));
    expect(CLASSIFY_PROMPT_VERSION).toBeGreaterThan(0);
  });
});

const good = (id: string, extra: Record<string, unknown> = {}) => ({
  id,
  title: "Validate email in login form",
  topic: "login",
  kind: "bugfix",
  same_as: [],
  confidence: 0.9,
  reason: "Branch and request agree.",
  ...extra,
});
const wrap = (items: unknown[], extra: Record<string, unknown> = {}) =>
  JSON.stringify({ is_error: false, structured_output: { items }, ...extra });

describe("output validation", () => {
  const ids = batchIds(3);

  it("accepts good output", () => {
    const out = parseClassifyOutput(
      wrap([good("i1"), good("i2", { same_as: [{ id: "i1", confidence: 0.7 }] })]),
      ids,
    );
    expect(out).toHaveLength(2);
    expect(out?.[1]?.sameAs).toEqual([{ id: "i1", confidence: 0.7 }]);
  });

  it("returns null for malformed JSON, is_error, and a wrong shape", () => {
    expect(parseClassifyOutput("not json", ids)).toBeNull();
    expect(parseClassifyOutput(wrap([good("i1")], { is_error: true }), ids)).toBeNull();
    expect(parseClassifyOutput(JSON.stringify({ structured_output: { nope: 1 } }), ids)).toBeNull();
    expect(parseClassifyOutput('"just text"', ids)).toBeNull();
  });

  it("drops an invalid item and keeps the valid ones", () => {
    const out = parseClassifyOutput(
      wrap([
        good("i1"),
        good("i2", { title: "x".repeat(61) }),
        good("i3", { kind: "epic" }),
        good("i9"), // not in the batch
        good("i1", { title: "Duplicate id" }),
      ]),
      ids,
    );
    expect(out?.map((o) => [o.id, o.title])).toEqual([["i1", "Validate email in login form"]]);
  });

  it("rejects confidence out of range, non-numbers and bad same_as", () => {
    const out = parseClassifyOutput(
      wrap([
        good("i1", { confidence: 1.5 }),
        good("i2", { confidence: "high" }),
        good("i3", { same_as: [{ id: "zz", confidence: 0.5 }] }),
      ]),
      ids,
    );
    expect(out).toEqual([]);
  });

  it("ignores self references and repeated same_as ids", () => {
    const out = parseClassifyOutput(
      wrap([
        good("i1", {
          same_as: [
            { id: "i1", confidence: 1 },
            { id: "i2", confidence: 0.8 },
            { id: "i2", confidence: 0.2 },
          ],
        }),
      ]),
      ids,
    );
    expect(out?.[0]?.sameAs).toEqual([{ id: "i2", confidence: 0.8 }]);
  });

  it("ignores status, stage, proof and flag fields: they are never copied", () => {
    const out = parseClassifyOutput(
      wrap([
        good("i1", { status: "done", stage: "shipped", proof: "fresh", flags: ["x"], proof_status: "fresh" }),
      ]),
      ids,
    );
    expect(out).toHaveLength(1);
    expect(Object.keys(out?.[0] ?? {}).toSorted()).toEqual(
      ["confidence", "id", "kind", "reason", "sameAs", "title", "topic"].toSorted(),
    );
  });

  it("collapses whitespace and control characters in model text", () => {
    const out = parseClassifyOutput(wrap([good("i1", { title: "  Fix\n\tlogin  " })]), ids);
    expect(out?.[0]?.title).toBe("Fix login");
  });
});

describe("schema and batches", () => {
  it("puts the batch ids in an enum", () => {
    const s = JSON.stringify(classifySchema(["i1", "i2"]));
    expect(s).toContain('"enum":["i1","i2"]');
    expect(s).toContain("maxLength");
  });

  it("splits into batches of the given size, keeping order", () => {
    expect(toBatches([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]]);
    expect(toBatches([], 20)).toEqual([]);
    expect(batchIds(2)).toEqual(["i1", "i2"]);
  });
});
