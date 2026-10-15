// fixture: synthetic
// Synthetic stand-in for `claude -p` (tests never run the real one). Behaviour comes from FAKE_MODE:
// ok | fail | hang | invalid | is_error. It logs its arguments, working folder, VANTAGE_SKIP and stdin to FAKE_LOG,
// and, like a real Claude Code session, fires the Vantage hook and writes a transcript when asked to.
import { appendFileSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { join } from "node:path";

const input = readFileSync(0, "utf8");
const mode = process.env.FAKE_MODE ?? "ok";
appendFileSync(
  process.env.FAKE_LOG,
  JSON.stringify({
    args: process.argv.slice(2),
    cwd: process.cwd(),
    skip: process.env.VANTAGE_SKIP ?? null,
    input,
  }) + "\n",
);
if (process.env.FAKE_HOOK) {
  spawnSync(process.execPath, [process.env.FAKE_HOOK], {
    input: JSON.stringify({
      hook_event_name: "PostToolUse",
      session_id: "fake-classifier",
      cwd: process.cwd(),
      tool_name: "Edit",
      tool_input: { file_path: join(process.cwd(), "x.ts") },
    }),
    env: process.env,
  });
}
if (process.env.FAKE_PROJECTS) {
  const d = join(process.env.FAKE_PROJECTS, process.cwd().replace(/[^A-Za-z0-9]/g, "-"));
  mkdirSync(d, { recursive: true });
  writeFileSync(
    join(d, "fake-classifier.jsonl"),
    JSON.stringify({
      type: "user",
      sessionId: "fake-classifier",
      uuid: "u1",
      timestamp: "2026-01-05T09:00:00Z",
      cwd: process.cwd(),
      message: { content: "classify these" },
    }) + "\n",
  );
}
if (mode === "fail") process.exit(1);
if (mode === "hang") setInterval(() => undefined, 1000);
else if (mode === "invalid") process.stdout.write("this is not json");
else if (mode === "is_error")
  process.stdout.write(JSON.stringify({ is_error: true, result: "Not logged in" }));
else {
  const items = JSON.parse(input.slice(input.indexOf("\n") + 1));
  const out = items.map((it, i) => ({
    id: it.id,
    title: `Do ${it.request.slice(0, 30) || it.id}`,
    topic: "demo",
    kind: i % 2 === 0 ? "feature" : "bugfix",
    // item 2 says it is the same work as item 1
    same_as: i === 1 ? [{ id: items[0].id, confidence: 0.9 }] : [],
    confidence: i % 2 === 0 ? 0.9 : 0.6,
    reason: "synthetic",
    status: "done",
    stage: "shipped",
  }));
  process.stdout.write(
    JSON.stringify({ type: "result", is_error: false, result: "", structured_output: { items: out } }),
  );
}
