// SQLite live store (D17). Schema and migrations: docs/specs/data-schema.md. Events are append-only.
import { DatabaseSync } from "node:sqlite";
import type { VantageEvent } from "@vantage/core";
import { loadMigrations, migrate } from "./migrations.ts";

/** Reads a numeric (or numeric-text) column from a row; 0 when the row or column is missing. */
function num(row: Record<string, unknown> | undefined, col: string): number {
  const v = row?.[col];
  return typeof v === "number" || typeof v === "bigint" || typeof v === "string" ? Number(v) : 0;
}

export class Store {
  readonly db: DatabaseSync;

  constructor(path: string) {
    this.db = new DatabaseSync(path);
    try {
      this.db.exec("PRAGMA journal_mode = WAL; PRAGMA busy_timeout = 5000;");
      migrate(this.db, loadMigrations());
    } catch (e) {
      this.db.close();
      throw e;
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

  /** Records the branch for a tool event, whether or not the event is stored yet. First value wins. */
  setEventBranch(source: string, sourceId: string, branch: string): void {
    this.db
      .prepare("INSERT OR IGNORE INTO event_branches (source, source_id, branch) VALUES (?, ?, ?)")
      .run(source, sourceId, branch);
  }

  countEventBranches(): number {
    return num(this.db.prepare("SELECT COUNT(*) AS n FROM event_branches").get(), "n");
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
