-- Links from events to work items, with undo tombstones.
CREATE TABLE links (
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
CREATE INDEX links_item ON links (item_key);
