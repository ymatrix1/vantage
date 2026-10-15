// Links are built only from the repo's remote, a branch name and a commit sha, each checked and escaped.
// Nothing here takes a URL from an API string that could hold markup: `repoUrl` must itself be
// `https://host/owner/repo` made of safe characters, or there is no link at all.
import { repoUrlOf } from "@vantage/core/track";

/** `https://host/owner/repo` when `url` is exactly that; null otherwise (no scheme tricks, no query, no fragment). */
export function safeRepoUrl(url: string | null | undefined): string | null {
  if (!url?.startsWith("https://")) return null;
  const built = repoUrlOf(url.slice("https://".length));
  return built === url ? built : null;
}

/** The repo link for an item's `repo` (a normalised remote like `github.com/owner/repo`). */
export const repoLink = (repo: string | null | undefined): string | null => safeRepoUrl(repoUrlOf(repo));

const encodePath = (s: string): string => s.split("/").map(encodeURIComponent).join("/");

export function branchLink(repoUrl: string | null, branch: string | null | undefined): string | null {
  const base = safeRepoUrl(repoUrl);
  const b = branch?.trim();
  // Git forbids `..` in a ref; a dot segment would only make the browser walk up the URL.
  if (!base || !b || b.split("/").some((seg) => seg === "." || seg === "..")) return null;
  return `${base}/tree/${encodePath(b)}`;
}

export function commitLink(repoUrl: string | null, sha: string | null | undefined): string | null {
  const base = safeRepoUrl(repoUrl);
  return base && sha && /^[0-9a-f]{7,64}$/i.test(sha) ? `${base}/commit/${sha.toLowerCase()}` : null;
}

/**
 * `cd "<path>"` for a worktree, or null when the path holds a character that would need shell-specific
 * escaping (quotes, `$`, backticks, newlines): better no button than a command that does something else.
 */
export function cdCommand(path: string | null | undefined): string | null {
  const p = path?.trim();
  return p && !/["'`$\r\n]/.test(p) ? `cd "${p}"` : null;
}
