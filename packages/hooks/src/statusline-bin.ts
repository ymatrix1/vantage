// Entry point registered as the Claude Code `statusLine` command. Always exits 0.
import { readFileSync } from "node:fs";
import { statusLine } from "./statusline.ts";

let stdin = "";
try {
  stdin = readFileSync(0, "utf8");
} catch {
  // No stdin: render without a session.
}
process.stdout.write(statusLine(stdin) + "\n");
process.exit(0);
