// The most human name an item has, and the subtitle under it. Never a worktree folder: those are random
// names an agent tool picked (`brave-joliot-995ebc`), so a row falls back to the branch, then to the title.
import type { TrackRow } from "./contract";

const AGENT_PREFIX = /^(?:claude|codex|cursor|copilot)\//i;
const RANDOM_SUFFIX = /-[0-9a-f]{6}$/;
/** `fallbackTitle` output in the daemon (`repo · branch · Oct 14`), or an unnamed `Session abc123`. */
const FALLBACK = /^Session\s|^(?:.+ · )+[A-Z][a-z]{2} \d{1,2}$/;

/** A branch without the agent's `claude/` prefix and without a random six-hex suffix. */
export function cleanBranch(branch: string): string {
  const cleaned = branch.trim().replace(AGENT_PREFIX, "").replace(RANDOM_SUFFIX, "");
  return cleaned === "" ? branch.trim() : cleaned;
}

type Named = Pick<TrackRow, "id" | "title" | "branch">;

/** Ticket title or key, else the cleaned branch name, else the fallback title. */
export function humanTitle(item: Named): string {
  const raw = item.title;
  const branch = item.branch ?? null;
  // Items keyed by a worktree are titled with its folder name: use the branch instead.
  if (item.id.startsWith("worktree:") && branch) return cleanBranch(branch);
  if (FALLBACK.test(raw)) return branch ? cleanBranch(branch) : raw;
  if (AGENT_PREFIX.test(raw) || RANDOM_SUFFIX.test(raw) || (branch !== null && raw === branch)) {
    return cleanBranch(raw);
  }
  return raw;
}
