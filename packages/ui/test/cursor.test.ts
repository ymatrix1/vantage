import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const css = readFileSync(join(import.meta.dirname, "..", "src", "app.css"), "utf8");

describe("clickable controls", () => {
  it("show the pointer cursor, because Tailwind v4 preflight resets buttons to default", () => {
    const rule = /button:not\(:disabled\)[^{]*\{[^}]*cursor:\s*pointer/s;
    expect(css).toMatch(rule);
    expect(css).toMatch(/a\[href\]/);
  });

  it("shows not-allowed on disabled buttons", () => {
    expect(css).toMatch(/button:disabled[^{]*\{[^}]*cursor:\s*not-allowed/s);
  });
});
