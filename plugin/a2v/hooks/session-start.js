// A2V SessionStart hook: adds the communication rule to every session's context.
// Claude Code plugins can't ship "rules" files, so this hook is how the rule reaches every project.
// It must never break a session: on any error it exits 0 with no output.
const fs = require("fs");
const path = require("path");

try {
  const root = process.env.CLAUDE_PLUGIN_ROOT || path.join(__dirname, "..");
  const rule = fs.readFileSync(path.join(root, "rules", "communication.md"), "utf8");
  process.stdout.write(
    JSON.stringify({
      hookSpecificOutput: {
        hookEventName: "SessionStart",
        additionalContext: "A2V plugin: follow this communication rule in every reply.\n\n" + rule,
      },
    })
  );
} catch {
  // Silent by design: a missing file must not block the session.
}
process.exit(0);
