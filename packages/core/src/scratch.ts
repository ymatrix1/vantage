// Scratch files: logs, temp output, build leftovers and the like. An edit that touches only scratch
// files is not a code change, so it must not expire proof or raise `unproven_claim` or `thrashing`
// (proposed D102). Pure. The daemon adds what git says (ignored files) through `scratchPaths`; this is
// the lexical part that needs no git and no file system.

/** The form paths take in `StageOptions.scratchPaths`: forward slashes, lower case. */
export const normalizeEditPath = (p: string): string => p.replaceAll("\\", "/").toLowerCase();

/** File name without its folders. */
const fileName = (p: string): string => p.replaceAll("\\", "/").split("/").filter(Boolean).pop() ?? "";

const SCRATCH_EXTENSIONS = new Set([
  "log",
  "tmp",
  "temp",
  "out",
  "bak",
  "swp",
  "swo",
  "orig",
  "rej",
  "pyc",
  "pyo",
  "class",
  "o",
  "obj",
]);
const SCRATCH_NAMES = new Set([".ds_store", "thumbs.db", "desktop.ini", "nohup.out"]);
// A folder with one of these names anywhere in the path holds scratch, caches or installed packages.
const SCRATCH_DIRS = new Set([
  "tmp",
  "temp",
  "__pycache__",
  "node_modules",
  ".cache",
  ".pytest_cache",
  ".mypy_cache",
  ".ruff_cache",
  ".next",
  ".turbo",
]);

/**
 * True for a path that is scratch by name alone: a temp or cache folder, a log, `.tmp`, `.out`, `.bak`,
 * `.swp`, `*~`, `*.pyc` and similar. Never throws; an empty or odd path is not scratch (an unclassified
 * edit keeps counting as code).
 */
export function isScratchPath(path: string): boolean {
  if (typeof path !== "string" || path === "") return false;
  const parts = path.replaceAll("\\", "/").toLowerCase().split("/").filter(Boolean);
  const name = parts.at(-1) ?? "";
  if (name === "") return false;
  if (SCRATCH_NAMES.has(name) || name.endsWith("~")) return true;
  const dot = name.lastIndexOf(".");
  if (dot > 0 && SCRATCH_EXTENSIONS.has(name.slice(dot + 1))) return true;
  // `.log.1`, `.log.2024-01-05` rotations.
  if (/\.log\.[\w-]+$/.test(name)) return true;
  return parts.slice(0, -1).some((d) => SCRATCH_DIRS.has(d));
}

/** Base names of scratch files, for the item record: names only, never folders. */
export const scratchLabel = fileName;
