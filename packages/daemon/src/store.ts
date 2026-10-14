// SQLite live store (D17). Schema: docs/specs/data-schema.md. Events are append-only.
import { DatabaseSync } from "node:sqlite";
import type { VantageEvent } from "@vantage/core";

const MIGRATIONS: readonly string[] = [
  `CREATE TABLE schema_meta (version INTEGER NOT NULL);
   CREATE TABLE events (
     id INTEGER PRIMARY KEY AUTOINCREMENT,
     source TEXT NOT NULL,
     source_id TEXT NOT NULL,
     kind TEXT NOT NULL,
     occurred_at TEXT NOT NULL,
     ingested_at TEXT NOT NULL,
     session_id TEXT,
     repo TEXT,
     payload_json TEXT NOT NULL,
     payload_version INTEGER NOT NULL DEFAULT 1,
     UNIQUE (source, source_id)
   );
   CREATE INDEX events_session ON events (session_id, occurred_at);
   CREATE TABLE cursors (
     source TEXT PRIMARY KEY,
     cursor TEXT NOT NULL,
     updated_at TEXT NOT NULL
   );`,
  `CREATE TABLE links (
     event_id INTEGER NOT NULL REFERENCES events (id),
     item_key TEXT NOT NULL,
     method TEXT NOT NULL,
     anchor_kind TEXT NOT NULL,
     anchor_value TEXT NOT NULL,
     rule TEXT NOT NULL,
     confidence REAL NOT NULL,
     created_at TEXT NOT NULL,
     undone_at TEXT,
     PRIMARY KEY (event_id, item_key)
   );
   CREATE INDEX links_item ON links (item_key);`,
];

/** Reads a numeric (or numeric-text) column from a row; 0 when the row or column is missing. */
function num(row: Record<string, unknown> | undefined, col: string): number {
  const v = row?.[col];
  return typeof v === "number" || typeof v === "bigint" || typeof v === "string" ? Number(v) : 0;
}

export class Store {
  readonly db: DatabaseSync;

  constructor(path: string) {
    this.db = new DatabaseSync(path);
    this.db.exec("PRAGMA journal_mode = WAL; PRAGMA busy_timeout = 5000;");
    this.migrate();
  }

  private migrate(): void {
    const has = this.db
      .prepare("SELECT 1 AS x FROM sqlite_master WHERE type='table' AND name='schema_meta'")
      .get();
    const current = has ? num(this.db.prepare("SELECT version FROM schema_meta").get(), "version") : 0;
    for (const [v, sql] of MIGRATIONS.entries()) {
      if (v < current) continue;
      this.transaction(() => {
        this.db.exec(sql);
        this.db.exec(`DELETE FROM schema_meta; INSERT INTO schema_meta (version) VALUES (${v + 1})`);
      });
    }
  }

  transaction<T>(fn: () => T): T {
    this.db.exec("BEGIN IMMEDIATE");
    try {
      const out = fn();
      this.db.exec("COMMIT");
      return out;
    } catch (e) {
      this.db.exec("ROLLBACK");
      throw e;
    }
  }

  /** Inserts the event unless (source, source_id) exists. Returns true when a row was added. */
  insertEvent(e: VantageEvent, ingestedAt: string): boolean {
    const r = this.db
      .prepare(
        `INSERT OR IGNORE INTO events (source, source_id, kind, occurred_at, ingested_at, session_id, payload_json)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        e.source,
        e.sourceId,
        e.kind,
        e.timestamp,
        ingestedAt,
        e.sessionId ?? null,
        JSON.stringify(e.payload),
      );
    return Number(r.changes) > 0;
  }

  getCursor(source: string): number {
    return num(this.db.prepare("SELECT cursor FROM cursors WHERE source = ?").get(source), "cursor");
  }

  setCursor(source: string, offset: number, now: string): void {
    this.db
      .prepare(
        `INSERT INTO cursors (source, cursor, updated_at) VALUES (?, ?, ?)
         ON CONFLICT (source) DO UPDATE SET cursor = excluded.cursor, updated_at = excluded.updated_at`,
      )
      .run(source, String(offset), now);
  }

  /** Text cursor for sources whose position is not a byte offset (git scan state). */
  getCursorText(source: string): string | null {
    const v = this.db.prepare("SELECT cursor FROM cursors WHERE source = ?").get(source)?.["cursor"];
    return typeof v === "string" ? v : null;
  }

  setCursorText(source: string, cursor: string, now: string): void {
    this.db
      .prepare(
        `INSERT INTO cursors (source, cursor, updated_at) VALUES (?, ?, ?)
         ON CONFLICT (source) DO UPDATE SET cursor = excluded.cursor, updated_at = excluded.updated_at`,
      )
      .run(source, cursor, now);
  }

  countEvents(): number {
    return num(this.db.prepare("SELECT COUNT(*) AS n FROM events").get(), "n");
  }

  close(): void {
    this.db.close();
  }
}
