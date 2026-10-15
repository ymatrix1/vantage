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
  // Derived tables: rebuilt by replaying events and links (data-schema rules), never the source of truth.
  `CREATE TABLE work_items (
     id INTEGER PRIMARY KEY AUTOINCREMENT,
     item_key TEXT NOT NULL UNIQUE,
     kind TEXT NOT NULL DEFAULT 'own_work',
     title TEXT NOT NULL,
     project_id INTEGER,
     repo TEXT,
     stage TEXT NOT NULL,
     sub_state TEXT,
     proof_status TEXT NOT NULL,
     proof_level INTEGER NOT NULL DEFAULT 0,
     docs_only INTEGER NOT NULL DEFAULT 0,
     parked INTEGER NOT NULL DEFAULT 0,
     parent_id INTEGER,
     first_activity TEXT NOT NULL,
     last_activity TEXT NOT NULL,
     created_at TEXT NOT NULL,
     updated_at TEXT NOT NULL
   );
   CREATE TABLE proofs (
     id INTEGER PRIMARY KEY AUTOINCREMENT,
     work_item_id INTEGER NOT NULL REFERENCES work_items (id),
     event_id INTEGER NOT NULL REFERENCES events (id),
     type TEXT NOT NULL,
     level INTEGER NOT NULL,
     source TEXT NOT NULL,
     command TEXT NOT NULL,
     cwd TEXT,
     started_at TEXT NOT NULL,
     state TEXT NOT NULL,
     weak_reason TEXT,
     expired_by_event_id INTEGER REFERENCES events (id),
     fingerprint TEXT NOT NULL
   );
   CREATE INDEX proofs_item ON proofs (work_item_id);
   CREATE TABLE flags (
     id INTEGER PRIMARY KEY AUTOINCREMENT,
     work_item_id INTEGER NOT NULL REFERENCES work_items (id),
     kind TEXT NOT NULL,
     severity TEXT NOT NULL,
     raised_at TEXT NOT NULL,
     cleared_at TEXT,
     dismissed INTEGER NOT NULL DEFAULT 0,
     reason TEXT NOT NULL,
     UNIQUE (work_item_id, kind)
   );
   CREATE TABLE stage_changes (
     id INTEGER PRIMARY KEY AUTOINCREMENT,
     work_item_id INTEGER NOT NULL REFERENCES work_items (id),
     from_stage TEXT,
     to_stage TEXT NOT NULL,
     at TEXT NOT NULL,
     event_id INTEGER NOT NULL REFERENCES events (id),
     reason TEXT NOT NULL
   );
   CREATE INDEX stage_changes_item ON stage_changes (work_item_id, at);`,
  // Session counts per item, read straight from live links and events so they are never stale (D86).
  // session_count: sessions with a live link; derived_count: those with a parent (session.derived);
  // subagent_count: distinct sub-agent runs (events carrying an agentId).
  `CREATE VIEW item_sessions AS
   SELECT l.item_key AS item_key,
          COUNT(DISTINCT e.session_id) AS session_count,
          COUNT(DISTINCT CASE WHEN d.id IS NOT NULL THEN e.session_id END) AS derived_count,
          COUNT(DISTINCT json_extract(e.payload_json, '$.agentId')) AS subagent_count
   FROM links l
   JOIN events e ON e.id = l.event_id
   LEFT JOIN events d ON d.kind = 'session.derived' AND d.session_id = e.session_id
   WHERE l.undone_at IS NULL AND e.session_id IS NOT NULL
   GROUP BY l.item_key;`,
  // Track query API: branch and has_edits for filters, and indexes for the sort and filter columns.
  // Existing rows get has_edits = 1 and a null branch until the next stage pass rewrites them.
  `ALTER TABLE work_items ADD COLUMN branch TEXT;
   ALTER TABLE work_items ADD COLUMN has_edits INTEGER NOT NULL DEFAULT 1;
   CREATE INDEX work_items_activity ON work_items (last_activity);
   CREATE INDEX work_items_repo ON work_items (repo, last_activity);
   CREATE INDEX work_items_stage ON work_items (stage, last_activity);`,
  // The branch a transcript line said was checked out when a tool call ran (D92). A side table, not a
  // rewrite of the event: the hook may have stored the call first, and events stay immutable.
  `CREATE TABLE event_branches (
     source TEXT NOT NULL,
     source_id TEXT NOT NULL,
     branch TEXT NOT NULL,
     PRIMARY KEY (source, source_id)
   );`,
  // Fork and resume counts, sub-agent tool counts and the agent's task list per item (D94, D95).
  // fork_count and resume_count come from the SessionStart source only; fork_hint_count counts derived
  // sessions whose parent kept producing events after the child started (a hint, never a rule).
  `DROP VIEW item_sessions;
   CREATE VIEW item_sessions AS
   SELECT l.item_key AS item_key,
          COUNT(DISTINCT e.session_id) AS session_count,
          COUNT(DISTINCT CASE WHEN d.id IS NOT NULL THEN e.session_id END) AS derived_count,
          COUNT(DISTINCT CASE WHEN d.id IS NOT NULL AND s.start = 'fork' THEN e.session_id END) AS fork_count,
          COUNT(DISTINCT CASE WHEN d.id IS NOT NULL AND s.start = 'resume' THEN e.session_id END) AS resume_count,
          COUNT(DISTINCT CASE WHEN d.id IS NOT NULL AND EXISTS (
            SELECT 1 FROM events p
            WHERE p.session_id = json_extract(d.payload_json, '$.parentSessionId')
              AND p.occurred_at > d.occurred_at AND p.kind <> 'session.derived'
          ) THEN e.session_id END) AS fork_hint_count,
          COUNT(DISTINCT json_extract(e.payload_json, '$.agentId')) AS subagent_count,
          COALESCE(SUM(CASE WHEN e.kind = 'subagent.run' THEN json_extract(e.payload_json, '$.tools') END), 0) AS subagent_tools
   FROM links l
   JOIN events e ON e.id = l.event_id
   LEFT JOIN events d ON d.kind = 'session.derived' AND d.session_id = e.session_id
   LEFT JOIN (SELECT session_id, json_extract(payload_json, '$.start') AS start
              FROM events WHERE kind = 'session.started') s ON s.session_id = e.session_id
   WHERE l.undone_at IS NULL AND e.session_id IS NOT NULL
   GROUP BY l.item_key;
   CREATE VIEW item_tasks AS
   WITH latest AS (
     SELECT e.id, e.session_id, e.occurred_at, e.payload_json,
            ROW_NUMBER() OVER (PARTITION BY e.session_id ORDER BY e.occurred_at DESC, e.id DESC) AS rn
     FROM events e WHERE e.kind = 'task.list.updated' AND e.session_id IS NOT NULL
   ), live AS (
     SELECT l.item_key AS item_key, latest.id AS id, latest.occurred_at AS occurred_at, latest.payload_json AS payload_json
     FROM latest JOIN links l ON l.event_id = latest.id AND l.undone_at IS NULL
     WHERE latest.rn = 1
   )
   SELECT item_key,
          SUM(json_extract(payload_json, '$.total')) AS tasks_total,
          SUM(json_extract(payload_json, '$.completed')) AS tasks_done,
          (SELECT json_extract(x.payload_json, '$.current') FROM live x
           WHERE x.item_key = live.item_key AND json_extract(x.payload_json, '$.current') IS NOT NULL
           ORDER BY x.occurred_at DESC, x.id DESC LIMIT 1) AS current_task
   FROM live GROUP BY item_key;`,
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

  /** Records the branch for a tool event, whether or not the event is stored yet. First value wins. */
  setEventBranch(source: string, sourceId: string, branch: string): void {
    this.db
      .prepare("INSERT OR IGNORE INTO event_branches (source, source_id, branch) VALUES (?, ?, ?)")
      .run(source, sourceId, branch);
  }

  /** Keep the cleaned text of the current task (D94). Set from the same switch as request titles. */
  captureTaskText = true;

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
