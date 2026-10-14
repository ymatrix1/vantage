import { describe, expect, it } from "vitest";
// @ts-expect-error plain JS module without types
import { checkFixture } from "../check-fixtures.mjs";

const header = '{"_fixture":"synthetic"}\n';

describe("fixture scrub check", () => {
  it("passes a synthetic fixture", () => {
    expect(checkFixture(header + '{"url":"https://api.example.com/x","path":"/work/demo"}')).toEqual([]);
  });

  it("requires a header", () => {
    expect(checkFixture('{"a":1}')).toContain("missing synthetic/scrubbed header");
  });

  // Split literals so the repo's own privacy scans don't flag these samples.
  // Split literals so the repo's own privacy scans don't flag these samples.
  it.each([
    ["email", ["dev", "acme.io"].join("@")],
    ["url", "https://jira.acme.internal/browse/X-1"],
    ["token", "ghp_" + "a".repeat(30)],
    ["uuid", "123e4567-e89b-12d3-a456-426614174000"],
    ["home path", "/Users/alice/project"],
  ])("flags a real %s", (name, value) => {
    expect(checkFixture(header + JSON.stringify({ v: value }))).toContain(`looks like a real ${name}`);
  });
});
