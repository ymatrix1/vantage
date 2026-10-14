// Fixture scrub check (docs/specs/ci.md). Fails on fixtures that look unscrubbed or lack a header.
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const HEADER = /"_fixture"\s*:\s*"(synthetic|scrubbed)"|^\s*(\/\/|#)\s*fixture:\s*(synthetic|scrubbed)/m;

export const PATTERNS = [
  ["email", /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/],
  ["url", /https?:\/\/(?!(?:[a-z0-9-]+\.)*example\.(?:com|org|test)\b)[^\s"']+/i],
  [
    "token",
    /\b(?:gh[pousr]_[A-Za-z0-9]{20,}|xox[abpr]-[A-Za-z0-9-]{10,}|sk-[A-Za-z0-9_-]{20,}|AKIA[0-9A-Z]{16})\b/,
  ],
  ["uuid", /\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/i],
  ["home path", /(?:[A-Za-z]:\\?Users\\?|\/Users\/|\/home\/)[A-Za-z0-9._-]+/],
];

export function checkFixture(text) {
  const problems = [];
  if (!HEADER.test(text)) problems.push("missing synthetic/scrubbed header");
  for (const [name, re] of PATTERNS) if (re.test(text)) problems.push(`looks like a real ${name}`);
  return problems;
}

function* fixtureFiles(dir) {
  for (const name of readdirSync(dir)) {
    if (name === "node_modules" || name.startsWith(".")) continue;
    const path = join(dir, name);
    if (statSync(path).isDirectory()) {
      if (name === "fixtures") yield* allFiles(path);
      else yield* fixtureFiles(path);
    }
  }
}

function* allFiles(dir) {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) yield* allFiles(path);
    else yield path;
  }
}

if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.endsWith("check-fixtures.mjs")) {
  let failed = 0;
  let count = 0;
  for (const file of fixtureFiles("packages")) {
    count++;
    for (const p of checkFixture(readFileSync(file, "utf8"))) {
      failed++;
      console.error(`${relative(".", file)}: ${p}`);
    }
  }
  console.log(`${failed} problem(s) in ${count} fixture file(s)`);
  process.exit(failed ? 1 : 0);
}
