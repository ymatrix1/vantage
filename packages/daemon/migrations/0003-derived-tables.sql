-- Derived tables: rebuilt by replaying events and links (data-schema rules), never the source of truth.
CREATE TABLE work_items (
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
CREATE INDEX stage_changes_item ON stage_changes (work_item_id, at);
