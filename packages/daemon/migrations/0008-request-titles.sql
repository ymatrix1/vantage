-- Request titles (D95): where an item's title came from, and the locally stored first-request titles.
-- `session_titles` is derived from transcripts, never read by anything but the stage pass and
-- `vantage titles`; clearing it loses nothing that the transcripts do not still hold.
ALTER TABLE work_items ADD COLUMN title_source TEXT NOT NULL DEFAULT 'fallback';
CREATE TABLE session_titles (
  session_id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  captured_at TEXT NOT NULL
);
