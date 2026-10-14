// Reads a test runner's own summary line into counts (D71 zero-test proof detection). Numbers only:
// the output text is never kept. Unrecognised output yields null, so nothing is claimed about it.

export interface TestSummary {
  /** Tests executed or skipped: passed + failed + skipped. 0 means the run proved nothing. */
  run: number;
  passed: number;
  failed: number;
  skipped: number;
}

/** Only the tail matters (summaries print last); bounds the cost of the regexes. */
const MAX_SCAN_CHARS = 20_000;

// oxlint-disable-next-line no-control-regex -- the escape character is the point
const ANSI = /\u001b\[[0-9;]*[A-Za-z]/g;

const summary = (passed: number, failed: number, skipped: number): TestSummary => ({
  run: passed + failed + skipped,
  passed,
  failed,
  skipped,
});

const count = (text: string, word: string): number => {
  const m = new RegExp(String.raw`(\d+)\s+${word}\b`, "i").exec(text);
  return m ? Number(m[1]) : 0;
};

const lastLine = (text: string, re: RegExp): string | undefined =>
  text.split("\n").findLast((l) => re.test(l));

function vitest(text: string): TestSummary | null {
  if (/No test files found/i.test(text)) return summary(0, 0, 0);
  const line = lastLine(text, /^\s*Tests\s+\d+\s+\w+/);
  if (!line) return null;
  return summary(count(line, "passed"), count(line, "failed"), count(line, "skipped") + count(line, "todo"));
}

function jest(text: string): TestSummary | null {
  if (/No tests found, exiting/i.test(text)) return summary(0, 0, 0);
  const line = lastLine(text, /^\s*Tests:\s+.*\d+\s+total/);
  if (!line) return null;
  return summary(count(line, "passed"), count(line, "failed"), count(line, "skipped") + count(line, "todo"));
}

function pytest(text: string): TestSummary | null {
  if (/^\W*no tests ran\b/im.test(text)) return summary(0, 0, 0);
  const line = lastLine(text, /\b\d+\s+(?:passed|failed|skipped|errors?)\b.*\bin\s+[\d.]+\s*s/i);
  if (!line) return null;
  return summary(
    count(line, "passed") + count(line, "xpassed"),
    count(line, "failed") + count(line, "errors?") + count(line, "xfailed"),
    count(line, "skipped"),
  );
}

function dotnet(text: string): TestSummary | null {
  if (/No test is available in/i.test(text)) return summary(0, 0, 0);
  const line = lastLine(text, /\b(?:Passed|Failed)!\s+-\s+Failed:\s*\d+/);
  if (!line) return null;
  const n = (k: string): number => Number(new RegExp(String.raw`${k}:\s*(\d+)`).exec(line)?.[1] ?? 0);
  return summary(n("Passed"), n("Failed"), n("Skipped"));
}

const GO_NO_TESTS = /^(?:\?\s+\S+\s+\[no test files\]|ok\s+\S+\s+\S+\s+\[no tests to run\])/;

function goTest(text: string): TestSummary | null {
  const lines = text.split("\n");
  const verbose = lines.filter((l) => /^\s*--- (?:PASS|FAIL|SKIP):/.test(l));
  if (verbose.length > 0) {
    const n = (k: string): number => verbose.filter((l) => l.includes(`--- ${k}:`)).length;
    return summary(n("PASS"), n("FAIL"), n("SKIP"));
  }
  const pkgs = lines.filter((l) => /^(?:ok|\?)\s+\S+/.test(l));
  // Without -v `go test` prints no per-test counts, so only "nothing ran anywhere" is certain.
  return pkgs.length > 0 && pkgs.every((l) => GO_NO_TESTS.test(l)) ? summary(0, 0, 0) : null;
}

/** Counts from the first runner whose summary the output contains, or null when none is recognised. */
export function parseTestSummary(output: string): TestSummary | null {
  const text = output.slice(-MAX_SCAN_CHARS).replace(ANSI, "").replaceAll("\r", "");
  for (const parse of [vitest, jest, dotnet, pytest, goTest]) {
    const r = parse(text);
    if (r) return r;
  }
  return null;
}
