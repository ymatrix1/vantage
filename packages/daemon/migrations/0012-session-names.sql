-- Session names (D191): the title Claude Code wrote into the transcript, either the user's own (`custom`, from a
-- rename) or a generated one (`agent`). Derived from transcripts and read only by the stage pass and the item
-- detail; clearing it loses nothing the transcripts do not still hold.
CREATE TABLE session_names (
  session_id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  source TEXT NOT NULL,
  captured_at TEXT NOT NULL
);
