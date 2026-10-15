-- Track query API: branch and has_edits for filters, and indexes for the sort and filter columns.
-- Existing rows get has_edits = 1 and a null branch until the next stage pass rewrites them.
ALTER TABLE work_items ADD COLUMN branch TEXT;
ALTER TABLE work_items ADD COLUMN has_edits INTEGER NOT NULL DEFAULT 1;
CREATE INDEX work_items_activity ON work_items (last_activity);
CREATE INDEX work_items_repo ON work_items (repo, last_activity);
CREATE INDEX work_items_stage ON work_items (stage, last_activity);
