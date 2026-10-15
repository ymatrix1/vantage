-- Events, cursors and the version table (D17, D33).
CREATE TABLE schema_meta (version INTEGER NOT NULL);
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
);
