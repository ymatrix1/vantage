// Synthetic runner output written for these tests; no real transcripts.
import { describe, expect, it } from "vitest";
import { parseTestSummary } from "../src/index.ts";

const counts = (s: string) => parseTestSummary(s);

describe("parseTestSummary", () => {
  it("vitest: pass, fail, skipped, zero", () => {
    expect(counts(" Test Files  1 passed (1)\n      Tests  5 passed (5)\n")).toEqual({
      run: 5,
      passed: 5,
      failed: 0,
      skipped: 0,
    });
    expect(counts("      Tests  1 failed | 3 passed | 2 skipped (6)")).toEqual({
      run: 6,
      passed: 3,
      failed: 1,
      skipped: 2,
    });
    expect(counts("\u001b[2m      Tests \u001b[22m 4 skipped (4)")).toMatchObject({ run: 4, skipped: 4 });
    expect(counts("No test files found, exiting with code 1")).toMatchObject({ run: 0 });
  });

  it("jest: pass, fail, skipped, zero", () => {
    expect(counts("Tests:       2 passed, 2 total\nTime: 1s")).toEqual({
      run: 2,
      passed: 2,
      failed: 0,
      skipped: 0,
    });
    expect(counts("Tests:       1 failed, 1 skipped, 3 passed, 5 total")).toMatchObject({
      run: 5,
      failed: 1,
      skipped: 1,
      passed: 3,
    });
    expect(counts("No tests found, exiting with code 1")).toMatchObject({ run: 0 });
  });

  it("pytest: pass, fail, skipped, zero, quiet", () => {
    expect(counts("===== 3 passed in 0.10s =====")).toMatchObject({ run: 3, passed: 3 });
    expect(counts("== 1 failed, 2 passed, 1 skipped, 1 error in 1.2s ==")).toMatchObject({
      run: 5,
      passed: 2,
      failed: 2,
      skipped: 1,
    });
    expect(counts("2 skipped in 0.01s")).toMatchObject({ run: 2, skipped: 2 });
    expect(counts("============ no tests ran in 0.01s ============")).toMatchObject({ run: 0 });
  });

  it("go test: verbose counts, no-test packages, ambiguous passes", () => {
    expect(
      counts("--- PASS: TestA (0.00s)\n--- FAIL: TestB (0.00s)\n--- SKIP: TestC (0.00s)\nFAIL\n"),
    ).toEqual({
      run: 3,
      passed: 1,
      failed: 1,
      skipped: 1,
    });
    expect(
      counts("?   \texample.test/a\t[no test files]\nok  \texample.test/b\t0.01s [no tests to run]"),
    ).toMatchObject({ run: 0 });
    expect(counts("ok  \texample.test/a\t0.01s\n")).toBeNull(); // ran something, count unknown
    expect(counts("ok  \texample.test/a\t0.01s\n?   \texample.test/b\t[no test files]")).toBeNull();
  });

  it("dotnet test: pass, fail, skipped, zero", () => {
    expect(
      counts("Passed!  - Failed:     0, Passed:     5, Skipped:     0, Total:     5, Duration: 1 s"),
    ).toEqual({
      run: 5,
      passed: 5,
      failed: 0,
      skipped: 0,
    });
    expect(counts("Failed!  - Failed:     1, Passed:     2, Skipped:     1, Total:     4")).toMatchObject({
      run: 4,
      failed: 1,
      skipped: 1,
    });
    expect(counts("Passed!  - Failed:     0, Passed:     0, Skipped:     3, Total:     3")).toMatchObject({
      run: 3,
      skipped: 3,
    });
    expect(counts("No test is available in C:\\w\\x.dll.")).toMatchObject({ run: 0 });
  });

  it("returns null for unrecognised or empty output", () => {
    expect(counts("")).toBeNull();
    expect(counts("build ok, 12 files written")).toBeNull();
  });
});
