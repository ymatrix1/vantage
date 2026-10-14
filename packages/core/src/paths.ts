// Lexical path membership: is a path inside a root? No filesystem access, so symlinks and
// junctions are not resolved (a link inside the repo that points out still counts as inside).

export type Membership = "inside" | "outside" | "unknown";

interface Norm {
  win: boolean;
  parts: string[];
}

const DRIVE = /^[A-Za-z]:(?:[\\/]|$)/;

/** Collapses `.` and `..` and separators. `null` when the text isn't an absolute path. */
function normalizeAbs(raw: string, winContext: boolean): Norm | null {
  let s = raw.replace(/\\/g, "/");
  // Git Bash writes C:\x as /c/x. Only read it that way next to a Windows path.
  const msys = /^\/([A-Za-z])(?:\/|$)/.exec(s);
  if (msys && winContext) s = `${msys[1]}:${s.slice(2)}`;
  const win = DRIVE.test(s) || s.startsWith("//");
  if (!win && !s.startsWith("/")) return null;
  const out: string[] = [];
  const floor = DRIVE.test(s) ? 1 : 0; // keep the drive part
  for (const seg of s.split("/")) {
    if (seg === "" || seg === ".") continue;
    if (seg === "..") {
      if (out.length > floor) out.pop();
    } else out.push(seg);
  }
  return { win, parts: win ? out.map((p) => p.toLowerCase()) : out };
}

/** Text the shell would expand (`~`, `$VAR`, `%VAR%`, command substitution) can't be resolved by reading it. */
const UNRESOLVABLE = /^~|[$`%]/;

export function pathMembership(target: string, cwd: string, root: string = cwd): Membership {
  if (UNRESOLVABLE.test(target) || !cwd) return "unknown";
  const winContext = DRIVE.test(cwd) || DRIVE.test(root);
  const rootN = normalizeAbs(root, winContext);
  const abs = normalizeAbs(target, winContext) ?? normalizeAbs(`${cwd}/${target}`, winContext);
  if (!rootN || !abs || !normalizeAbs(cwd, winContext)) return "unknown";
  if (rootN.win !== abs.win) return "outside";
  const inside = rootN.parts.every((p, i) => abs.parts[i] === p);
  return inside ? "inside" : "outside";
}
