// Forward-only SQLite migrations (D17, D93). One file per migration, `migrations/NNNN-slug.sql`, applied in
// numeric order, one transaction each. Applied migrations are recorded with the sha256 of their text in
// `schema_migrations`; a changed, missing or newer migration stops startup with a MigrationError.
// How to add one, and the rules: docs/specs/data-schema.md.
import { createHash } from "node:crypto";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import type { DatabaseSync } from "node:sqlite";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

export interface Migration {
  number: number;
  name: string;
  /** File name, `NNNN-slug.sql`. */
  file: string;
  sql: string;
  sha256: string;
}

export type MigrationErrorCode =
  | "bad-name"
  | "empty"
  | "duplicate"
  | "gap"
  | "checksum-mismatch"
  | "name-mismatch"
  | "database-newer";

export class MigrationError extends Error {
  readonly code: MigrationErrorCode;
  constructor(code: MigrationErrorCode, message: string) {
    super(message);
    this.name = "MigrationError";
    this.code = code;
  }
}

const FILE_NAME = /^(\d{4})-([a-z0-9]+(?:-[a-z0-9]+)*)\.sql$/;

/** sha256 of the file text with line endings normalised, so a CRLF checkout hashes like an LF one. */
export function checksum(text: string): string {
  return createHash("sha256").update(text.replace(/\r\n/g, "\n"), "utf8").digest("hex");
}

/** Validates names, numbering and order, and builds the list. Throws MigrationError on the first problem. */
export function buildMigrations(entries: readonly { file: string; sql: string }[]): Migration[] {
  const out: Migration[] = [];
  for (const { file, sql } of entries) {
    const m = FILE_NAME.exec(file);
    if (!m) {
      throw new MigrationError(
        "bad-name",
        `Migration file "${file}" does not match NNNN-slug.sql (four digits, lowercase words joined by dashes).`,
      );
    }
    out.push({ number: Number(m[1]), name: m[2] ?? "", file, sql, sha256: checksum(sql) });
  }
  out.sort((a, b) => a.number - b.number);
  if (out.length === 0) throw new MigrationError("empty", "No migration files found.");
  let expected = 1;
  for (const m of out) {
    if (m.number < expected) {
      const first = out.find((o) => o.number === m.number);
      throw new MigrationError(
        "duplicate",
        `Migration number ${pad(m.number)} is used by both ${first?.file ?? "?"} and ${m.file}. Renumber the newer one.`,
      );
    }
    if (m.number > expected) {
      throw new MigrationError(
        "gap",
        `Migration ${pad(expected)} is missing: the next file is ${m.file}. Numbers start at 0001 with no gaps.`,
      );
    }
    expected += 1;
  }
  return out;
}

const pad = (n: number): string => String(n).padStart(4, "0");

/** The package root is the nearest parent holding package.json; this works from `src/` and from `dist/src/`. */
function packageRoot(): string {
  let dir = dirname(fileURLToPath(import.meta.url));
  while (!existsSync(join(dir, "package.json"))) {
    const up = dirname(dir);
    if (up === dir) throw new Error("Cannot find the @vantage/daemon package root.");
    dir = up;
  }
  return dir;
}

export const MIGRATIONS_DIR = join(packageRoot(), "migrations");

/** Reads every file in the directory. Anything not named NNNN-slug.sql is an error, not skipped. */
export function loadMigrations(dir: string = MIGRATIONS_DIR): Migration[] {
  const files = readdirSync(dir).toSorted();
  return buildMigrations(files.map((file) => ({ file, sql: readFileSync(join(dir, file), "utf8") })));
}

const tableExists = (db: DatabaseSync, name: string): boolean =>
  db.prepare("SELECT 1 AS x FROM sqlite_master WHERE type='table' AND name=?").get(name) !== undefined;

const toNumber = (v: unknown): number =>
  typeof v === "number" || typeof v === "bigint" || typeof v === "string" ? Number(v) : 0;

/** Applied migrations as recorded: the ledger when it exists, else the `schema_meta` version of older releases. */
function appliedState(db: DatabaseSync): {
  ledger: Map<number, { name: string; sha256: string }> | null;
  legacy: number;
} {
  if (tableExists(db, "schema_migrations")) {
    const ledger = new Map<number, { name: string; sha256: string }>();
    for (const r of db.prepare("SELECT number, name, sha256 FROM schema_migrations").all()) {
      ledger.set(toNumber(r["number"]), { name: String(r["name"]), sha256: String(r["sha256"]) });
    }
    return { ledger, legacy: 0 };
  }
  const legacy = tableExists(db, "schema_meta")
    ? toNumber(db.prepare("SELECT version FROM schema_meta").get()?.["version"])
    : 0;
  return { ledger: null, legacy };
}

function verify(migrations: readonly Migration[], state: ReturnType<typeof appliedState>): void {
  const latest = migrations.length;
  const newest = state.ledger ? Math.max(0, ...state.ledger.keys()) : state.legacy;
  if (newest > latest) {
    throw new MigrationError(
      "database-newer",
      `The database is at migration ${pad(newest)} but this build only knows up to ${pad(latest)}. ` +
        "Update Vantage, or restore a backup of vantage.db made before the newer release.",
    );
  }
  if (!state.ledger) return;
  for (const m of migrations) {
    const row = state.ledger.get(m.number);
    if (!row) continue;
    if (row.sha256 !== m.sha256) {
      throw new MigrationError(
        "checksum-mismatch",
        `Migration ${m.file} was changed after it was applied (recorded sha256 ${row.sha256.slice(0, 12)}, file ${m.sha256.slice(0, 12)}). ` +
          "Applied migrations are frozen: restore the file from git and put the change in a new migration.",
      );
    }
    if (row.name !== m.name) {
      throw new MigrationError(
        "name-mismatch",
        `Migration ${pad(m.number)} was applied as "${row.name}" but the file is now ${m.file}. Applied migrations must not be renamed.`,
      );
    }
  }
}

function isApplied(db: DatabaseSync, number: number): boolean {
  if (tableExists(db, "schema_migrations")) {
    return db.prepare("SELECT 1 AS x FROM schema_migrations WHERE number = ?").get(number) !== undefined;
  }
  return (
    tableExists(db, "schema_meta") &&
    toNumber(db.prepare("SELECT version FROM schema_meta").get()?.["version"]) >= number
  );
}

/**
 * Checks the recorded state against the files, then applies every pending migration in order, each in its
 * own transaction. Safe to call twice and from two processes at once: each migration re-checks inside its
 * transaction. A later migration may rely on everything before it, never on a later one.
 */
export function migrate(db: DatabaseSync, migrations: readonly Migration[], now: Date = new Date()): void {
  const state = appliedState(db);
  verify(migrations, state);
  for (const m of migrations) {
    if (state.ledger ? state.ledger.has(m.number) : m.number <= state.legacy) continue;
    db.exec("BEGIN IMMEDIATE");
    try {
      if (!isApplied(db, m.number)) apply(db, m, migrations, now);
      db.exec("COMMIT");
    } catch (e) {
      db.exec("ROLLBACK");
      throw e;
    }
  }
}

function apply(db: DatabaseSync, m: Migration, all: readonly Migration[], now: Date): void {
  const hadLedger = tableExists(db, "schema_migrations");
  db.exec(m.sql);
  const at = now.toISOString();
  if (tableExists(db, "schema_migrations")) {
    const insert = db.prepare(
      "INSERT OR IGNORE INTO schema_migrations (number, name, sha256, applied_at) VALUES (?, ?, ?, ?)",
    );
    // The migration that creates the ledger backfills the ones applied before it, with the checksum of
    // the file as it is now (older releases kept no checksums); their applied_at is this upgrade.
    if (!hadLedger)
      for (const earlier of all.filter((e) => e.number < m.number))
        insert.run(earlier.number, earlier.name, earlier.sha256, at);
    insert.run(m.number, m.name, m.sha256, at);
  }
  // schema_meta mirrors the latest number so a database still reads correctly through the old table.
  if (tableExists(db, "schema_meta"))
    db.exec(`DELETE FROM schema_meta; INSERT INTO schema_meta (version) VALUES (${m.number})`);
}
