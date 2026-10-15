-- Every repo a work item touches (D190). `work_items.repo` stays the item's primary repo (grouping, sorting, titles);
-- this table holds the whole set, primary included, so the Track page can show, filter and count by any of them.
-- Derived like work_items: the stage pass rewrites it, so it can be rebuilt at any time.
CREATE TABLE item_repos (
  item_key TEXT NOT NULL,
  repo TEXT NOT NULL,
  position INTEGER NOT NULL,
  PRIMARY KEY (item_key, repo)
);
CREATE INDEX item_repos_repo ON item_repos (repo, item_key);
-- The first stage pass after this migration fills the table; until then an item shows its primary repo only.
