-- The branch a transcript line said was checked out when a tool call ran (D92). A side table, not a
-- rewrite of the event: the hook may have stored the call first, and events stay immutable.
CREATE TABLE event_branches (
  source TEXT NOT NULL,
  source_id TEXT NOT NULL,
  branch TEXT NOT NULL,
  PRIMARY KEY (source, source_id)
);
