// Migration runner (D91): files, checksums, historical versions. All data is synthetic.
import { DatabaseSync } from "node:sqlite";
import {
  copyFileSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  MIGRATIONS_DIR,
  MigrationError,
  Store,
  buildMigrations,
  checksum,
  loadMigrations,
  migrate,
} from "../src/index.ts";

let dir = "";
beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "vantage-migrate-"));
});
afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

const ALL = loadMigrations();
/** Releases before the ledger (migration 6) kept only `schema_meta`. */
const LEGACY_LAST = 5;

/** Rows to add after migration N has run, so every older release's data shape is present. */
const SEED: Record<number, string> = {
  1: `INSERT INTO events (source, source_id, kind, occurred_at, ingested_at, session_id, payload_json)
        VALUES ('claude_code', 'e1', 'file.edited', '2026-01-05T09:00:00Z', '2026-01-05T09:00:00Z', 's-1', '{}');`,
  2: `INSERT INTO links VALUES (1, 'issue:FTK-9', 'anchor', 'issue_key', 'FTK-9', 'issue-key-branch', 1, '2026-01-05T09:00:00Z', NULL);`,
  3: `INSERT INTO work_items (item_key, title, stage, proof_status, first_activity, last_activity, created_at, updated_at)
        VALUES ('issue:FTK-9', 'Demo', 'built', 'none', '2026-01-05T09:00:00Z', '2026-01-05T09:00:00Z', '2026-01-05T09:00:00Z', '2026-01-05T09:00:00Z');`,
};

/** A database exactly as release N left it: migrations 1..N applied, `schema_meta` holding N, no ledger. */
function buildAt(path: string, version: number): void {
  const db = new DatabaseSync(path);
  for (const m of ALL.filter((x) => x.number <= version)) {
    db.exec(m.sql);
    db.exec(`DELETE FROM schema_meta; INSERT INTO schema_meta (version) VALUES (${m.number});`);
    const seed = SEED[m.number];
    if (seed) db.exec(seed);
  }
  db.close();
}

const count = (db: DatabaseSync, from: string): number =>
  Number(db.prepare(`SELECT COUNT(*) AS n FROM ${from}`).get()?.["n"]);
const ledger = (db: DatabaseSync) =>
  db.prepare("SELECT number, name, sha256, applied_at FROM schema_migrations ORDER BY number").all();
const metaVersion = (db: DatabaseSync): number =>
  Number(db.prepare("SELECT version FROM schema_meta").get()?.["version"]);
const nextFile = (slug: string): string => `${String(ALL.length + 1).padStart(4, "0")}-${slug}.sql`;
const e = (file: string) => ({ file, sql: "SELECT 1;" });
const files = (extra: { file: string; sql: string }[] = []) => [
  ...ALL.map((m) => ({ file: m.file, sql: m.sql })),
  ...extra,
];

const copyDir = (): string => {
  const d = join(dir, "copy");
  mkdirSync(d);
  for (const f of readdirSync(MIGRATIONS_DIR)) copyFileSync(join(MIGRATIONS_DIR, f), join(d, f));
  return d;
};

describe("migration files", () => {
  it("are numbered 0001.. with no gaps and ship in the daemon package files list", () => {
    expect(ALL.map((m) => m.number)).toEqual(ALL.map((_, i) => i + 1));
    const pkg: unknown = JSON.parse(readFileSync(join(MIGRATIONS_DIR, "..", "package.json"), "utf8"));
    expect(typeof pkg === "object" && pkg !== null ? Reflect.get(pkg, "files") : null).toContain(
      "migrations",
    );
    expect(readdirSync(MIGRATIONS_DIR)).toHaveLength(ALL.length);
  });

  it("hash the same with CRLF or LF line endings", () => {
    expect(checksum("a\r\nb\r\n")).toBe(checksum("a\nb\n"));
    expect(checksum("a\nb\n")).not.toBe(checksum("a\nc\n"));
  });

  it("reject a duplicate number, a gap and a badly named file", () => {
    expect(() => buildMigrations([e("0001-a.sql"), e("0002-b.sql"), e("0002-c.sql")])).toThrow(
      expect.objectContaining({ code: "duplicate" }),
    );
    expect(() => buildMigrations([e("0001-a.sql"), e("0003-c.sql")])).toThrow(
      expect.objectContaining({ code: "gap" }),
    );
    expect(() => buildMigrations([e("0002-a.sql")])).toThrow(expect.objectContaining({ code: "gap" }));
    for (const bad of [
      "1-a.sql",
      "0001_a.sql",
      "0001-A.sql",
      "0001-a.SQL",
      "0001.sql",
      "0001-a-.sql",
      "README.md",
    ]) {
      expect(() => buildMigrations([e(bad)])).toThrow(expect.objectContaining({ code: "bad-name" }));
    }
    expect(() => buildMigrations([])).toThrow(expect.objectContaining({ code: "empty" }));
  });

  it("fail to load when a stray file sits in the directory", () => {
    const d = join(dir, "m");
    mkdirSync(d);
    copyFileSync(join(MIGRATIONS_DIR, "0001-initial-schema.sql"), join(d, "0001-initial-schema.sql"));
    writeFileSync(join(d, "notes.txt"), "x");
    expect(() => loadMigrations(d)).toThrow(MigrationError);
  });
});

describe("upgrading", () => {
  it.each(Array.from({ length: LEGACY_LAST }, (_, i) => i + 1))(
    "a version %i database reaches the latest and keeps its rows",
    (version) => {
      const path = join(dir, `v${version}.db`);
      buildAt(path, version);
      const store = new Store(path);
      try {
        expect(metaVersion(store.db)).toBe(ALL.length);
        const rows = ledger(store.db);
        expect(rows.map((r) => r["number"])).toEqual(ALL.map((m) => m.number));
        for (const [i, r] of rows.entries()) {
          expect(r["name"]).toBe(ALL[i]?.name);
          expect(r["sha256"]).toBe(ALL[i]?.sha256);
        }
        expect(count(store.db, "events")).toBe(1);
        expect(count(store.db, "links")).toBe(version >= 2 ? 1 : 0);
        expect(count(store.db, "work_items")).toBe(version >= 3 ? 1 : 0);
        expect(count(store.db, "sqlite_master WHERE name = 'item_sessions'")).toBe(1);
      } finally {
        store.close();
      }
    },
  );

  it("a fresh database applies every migration and records each", () => {
    const store = new Store(join(dir, "fresh.db"));
    try {
      expect(ledger(store.db)).toHaveLength(ALL.length);
      expect(metaVersion(store.db)).toBe(ALL.length);
    } finally {
      store.close();
    }
  });

  it("a second run changes nothing", () => {
    const path = join(dir, "twice.db");
    buildAt(path, 2);
    const first = new Store(path);
    const before = ledger(first.db);
    first.close();
    const second = new Store(path);
    try {
      expect(ledger(second.db)).toEqual(before);
    } finally {
      second.close();
    }
  });

  it("applies a migration added later and mirrors it in schema_meta", () => {
    const path = join(dir, "later.db");
    new Store(path).close();
    const extra = buildMigrations(
      files([{ file: nextFile("extra-index"), sql: "CREATE INDEX events_kind ON events (kind);" }]),
    );
    const db = new DatabaseSync(path);
    migrate(db, extra);
    expect(ledger(db)).toHaveLength(ALL.length + 1);
    expect(metaVersion(db)).toBe(ALL.length + 1);
    db.close();
  });

  it("rolls a failing migration back completely and leaves the previous version", () => {
    const path = join(dir, "fail.db");
    new Store(path).close();
    const bad = buildMigrations(
      files([
        {
          file: nextFile("broken"),
          sql: "CREATE TABLE half (id INTEGER); INSERT INTO nonexistent VALUES (1);",
        },
      ]),
    );
    const db = new DatabaseSync(path);
    expect(() => migrate(db, bad)).toThrow(/nonexistent/);
    expect(ledger(db)).toHaveLength(ALL.length);
    expect(count(db, "sqlite_master WHERE name = 'half'")).toBe(0);
    db.close();
  });
});

describe("refusing to start", () => {
  it("fails with a clear error when an applied migration file was edited", () => {
    const path = join(dir, "edit.db");
    new Store(path).close();
    const d = copyDir();
    writeFileSync(
      join(d, "0002-links.sql"),
      readFileSync(join(d, "0002-links.sql"), "utf8") + "\n-- edited\n",
    );
    const db = new DatabaseSync(path);
    try {
      const edited = loadMigrations(d);
      expect(() => migrate(db, edited)).toThrow(MigrationError);
      expect(() => migrate(db, edited)).toThrow(/0002-links\.sql was changed after it was applied/);
      expect(() => migrate(db, edited)).toThrow(expect.objectContaining({ code: "checksum-mismatch" }));
    } finally {
      db.close();
    }
  });

  it("applies nothing when the check fails", () => {
    const path = join(dir, "noop.db");
    buildAt(path, 3);
    const seed = new DatabaseSync(path);
    // A legacy database cannot mismatch, so give it a ledger with a wrong checksum for migration 1.
    seed.exec(ALL.find((m) => m.name === "schema-migrations")?.sql ?? "");
    seed.exec("INSERT INTO schema_migrations VALUES (1, 'initial-schema', 'bad', 'x')");
    seed.close();
    const db = new DatabaseSync(path);
    expect(() => migrate(db, ALL)).toThrow(expect.objectContaining({ code: "checksum-mismatch" }));
    expect(count(db, "sqlite_master WHERE name = 'item_sessions'")).toBe(0);
    db.close();
  });

  it("fails when the Store opens a database whose recorded checksum differs from the file", () => {
    const path = join(dir, "tampered.db");
    new Store(path).close();
    const db = new DatabaseSync(path);
    db.exec("UPDATE schema_migrations SET sha256 = 'deadbeef' WHERE number = 3");
    db.close();
    expect(() => new Store(path)).toThrow(/0003-derived-tables\.sql was changed/);
  });

  it("fails when the database is newer than the code", () => {
    const path = join(dir, "newer.db");
    new Store(path).close();
    const db = new DatabaseSync(path);
    db.exec(`INSERT INTO schema_migrations VALUES (${ALL.length + 1}, 'from-the-future', 'abc', 'x')`);
    db.close();
    expect(() => new Store(path)).toThrow(expect.objectContaining({ code: "database-newer" }));
    expect(() => new Store(path)).toThrow(/only knows up to/);
  });

  it("fails when a database from before the ledger claims a version the code lacks", () => {
    const path = join(dir, "legacy-newer.db");
    buildAt(path, 2);
    const db = new DatabaseSync(path);
    db.exec("UPDATE schema_meta SET version = 99");
    db.close();
    expect(() => new Store(path)).toThrow(expect.objectContaining({ code: "database-newer" }));
  });

  it("fails when an applied migration was renamed", () => {
    const path = join(dir, "renamed.db");
    new Store(path).close();
    const d = copyDir();
    copyFileSync(join(d, "0002-links.sql"), join(d, "0002-linkz.sql"));
    rmSync(join(d, "0002-links.sql"));
    const db = new DatabaseSync(path);
    try {
      expect(() => migrate(db, loadMigrations(d))).toThrow(
        expect.objectContaining({ code: "name-mismatch" }),
      );
    } finally {
      db.close();
    }
  });

  it("closes the database file when startup fails, so it can be removed", () => {
    const path = join(dir, "locked.db");
    new Store(path).close();
    const db = new DatabaseSync(path);
    db.exec("UPDATE schema_migrations SET sha256 = 'x' WHERE number = 1");
    db.close();
    expect(() => new Store(path)).toThrow(MigrationError);
    expect(() => rmSync(path)).not.toThrow(); // fails on Windows if a handle stayed open
  });
});
