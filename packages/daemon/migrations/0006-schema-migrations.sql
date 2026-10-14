-- Record of applied migrations (D91). The runner fills it: it adds a row for every migration it applies
-- and, when this migration creates the table, backfills the ones applied before it (the older
-- `schema_meta` version carries no checksums). `schema_meta` stays as a mirror of the latest number.
CREATE TABLE schema_migrations (
  number INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  sha256 TEXT NOT NULL,
  applied_at TEXT NOT NULL
);
