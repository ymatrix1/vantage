-- Classifier suggestions (docs/specs/classify.md, proposed D99): model text about titles, topics and groupings,
-- never status. `batch_id` is the bulk action that decided the row (one undo per batch); `run_id` is the
-- classify run that produced it. `classify_calls` is the daily cap's ledger.
CREATE TABLE suggestions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  item_key TEXT NOT NULL,
  kind TEXT NOT NULL,
  payload_json TEXT NOT NULL,
  model TEXT NOT NULL,
  prompt_hash TEXT NOT NULL,
  content_hash TEXT NOT NULL,
  confidence REAL NOT NULL,
  status TEXT NOT NULL DEFAULT 'suggested',
  run_id TEXT NOT NULL,
  batch_id TEXT,
  created_at TEXT NOT NULL,
  decided_at TEXT,
  undone_at TEXT
);
CREATE INDEX suggestions_item ON suggestions (item_key, kind);
CREATE INDEX suggestions_status ON suggestions (status, kind);
CREATE INDEX suggestions_hash ON suggestions (content_hash, model);
CREATE TABLE suggestion_batches (
  id TEXT PRIMARY KEY,
  action TEXT NOT NULL,
  filter_json TEXT NOT NULL,
  counts_json TEXT NOT NULL,
  created_at TEXT NOT NULL,
  undone_at TEXT
);
CREATE TABLE classify_calls (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  at TEXT NOT NULL,
  run_id TEXT NOT NULL,
  ok INTEGER NOT NULL,
  items INTEGER NOT NULL,
  ms INTEGER NOT NULL
);
