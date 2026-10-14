// Turns a session's first request into a short item title (proposed D93). Pure. Privacy first: the
// result is one line of at most 80 characters, and anything that could carry a secret, a location or
// a contact is removed before the sentence is cut. The rest of the prompt is never kept.

export const REQUEST_TITLE_MAX = 80;

const FENCE = /```[\s\S]*?(?:```|$)/g;
const INLINE_CODE = /`[^`\n]*`?/g;
const TAG = /<\/?[A-Za-z][^>]*>?/g;
const MD_LINK = /!?\[([^\]]*)\]\([^)]*\)/g;
const LEAD_MARKER = /^\s*(?:#{1,6}\s+|>\s*|[-*+]\s+|\d+[.)]\s+)+/;
const URL = /\b(?:https?|ftp|ssh|file|wss?):\/\/\S*|\bwww\.\S+/gi;
const EMAIL = /\S+@\S+\.\S+/g;
const WIN_PATH = /\b[A-Za-z]:[\\/]\S*/g;
const CREDENTIAL_PAIR =
  /\b(?:pass(?:word|wd)?|secret|token|api[-_]?key|access[-_]?key|private[-_]?key|auth(?:orization)?|credential)s?\s*[:=]\s*\S+/gi;
const BEARER = /\b(?:authorization\s*[:=]\s*)?bearer\s+\S+/gi;
const KNOWN_PREFIX =
  /^(?:sk|pk|rk|ghp|gho|ghu|ghs|ghr|github_pat|glpat|xox[abprs]|AKIA|ASIA|AIza|ya29|eyJ|npm_|dop_v1|shpat)[-_A-Za-z0-9.=]{6,}/;
const UUID = /\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi;

/** A word that looks like a key, token, hash or id, or names a location. Kept words are plain prose. */
function sensitiveWord(word: string): boolean {
  const w = word.replace(/^[("'[{]+|[)"'\]},;:.!?]+$/g, "");
  if (w === "") return false;
  if (/[\\/]/.test(w)) return true; // any path, even a relative one; "and/or" is lost, which is fine
  if (w.startsWith("~") || w.startsWith("$") || w.startsWith("%")) return true; // home, env vars
  if (KNOWN_PREFIX.test(w)) return true;
  if (/[0-9a-f]{16,}/i.test(w)) return true; // long hex: hashes, keys
  if (/[A-Za-z0-9+_=-]{24,}/.test(w)) return true; // long base64-like runs
  if (w.length >= 20 && /[A-Za-z0-9+_=.-]{20,}/.test(w) && /\d/.test(w)) return true;
  if (w.length >= 12 && /[A-Za-z]/.test(w) && (w.match(/\d/g)?.length ?? 0) >= 4) return true; // mixed ids
  return false;
}

/**
 * The first sentence of `text` as a title, or null when nothing usable is left. Never throws.
 * Fenced code, inline code, tags, links, URLs, emails, paths, key=value credentials and token-like
 * words are removed; the first non-empty line is cut at its first sentence end and capped at
 * REQUEST_TITLE_MAX characters.
 */
export function requestTitle(text: string): string | null {
  let t = text.replace(FENCE, " ").replace(INLINE_CODE, " ").replace(TAG, " ").replace(MD_LINK, "$1");
  // Work line by line so a long pasted body is never scanned past its first usable line.
  let line = "";
  for (const raw of t.split(/\r?\n/)) {
    const l = raw
      .replace(LEAD_MARKER, "")
      .replace(/\*+|~~/g, "")
      .trim();
    if (l !== "") {
      line = l;
      break;
    }
  }
  t = line
    .replace(URL, " ")
    .replace(WIN_PATH, " ")
    .replace(EMAIL, " ")
    .replace(UUID, " ")
    .replace(BEARER, " ")
    .replace(CREDENTIAL_PAIR, " ");
  t = t
    .split(/\s+/)
    .filter((w) => w !== "" && !sensitiveWord(w))
    .join(" ");
  // First sentence: a full stop, question or exclamation mark followed by a space and a new sentence.
  const cut = /[.!?](?=\s+["'([]?[\p{Lu}\d])/u.exec(t);
  if (cut) t = t.slice(0, cut.index + (t[cut.index] === "?" ? 1 : 0));
  t = t
    .replace(/^["'([{\s]+|["')\]}\s,;:.!]+$/g, "")
    .replace(/\s+/g, " ")
    .trim();
  if ((t.match(/\p{L}/gu)?.length ?? 0) < 3) return null;
  const chars = Array.from(t);
  if (chars.length <= REQUEST_TITLE_MAX) return t;
  const head = chars.slice(0, REQUEST_TITLE_MAX - 1).join("");
  const space = head.lastIndexOf(" ");
  return `${(space >= 40 ? head.slice(0, space) : head).replace(/[\s,;:.-]+$/, "")}…`;
}
