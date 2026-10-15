-- Fork and resume counts, sub-agent tool counts and the agent's task list per item (D96, D97).
-- fork_count and resume_count come from the SessionStart source only; fork_hint_count counts derived
-- sessions whose parent kept producing events after the child started (a hint, never a rule).
DROP VIEW item_sessions;
CREATE VIEW item_sessions AS
SELECT l.item_key AS item_key,
       COUNT(DISTINCT e.session_id) AS session_count,
       COUNT(DISTINCT CASE WHEN d.id IS NOT NULL THEN e.session_id END) AS derived_count,
       COUNT(DISTINCT CASE WHEN d.id IS NOT NULL AND s.start = 'fork' THEN e.session_id END) AS fork_count,
       COUNT(DISTINCT CASE WHEN d.id IS NOT NULL AND s.start = 'resume' THEN e.session_id END) AS resume_count,
       COUNT(DISTINCT CASE WHEN d.id IS NOT NULL AND EXISTS (
         SELECT 1 FROM events p
         WHERE p.session_id = json_extract(d.payload_json, '$.parentSessionId')
           AND p.occurred_at > d.occurred_at AND p.kind <> 'session.derived'
       ) THEN e.session_id END) AS fork_hint_count,
       COUNT(DISTINCT json_extract(e.payload_json, '$.agentId')) AS subagent_count,
       COALESCE(SUM(CASE WHEN e.kind = 'subagent.run' THEN json_extract(e.payload_json, '$.tools') END), 0) AS subagent_tools
FROM links l
JOIN events e ON e.id = l.event_id
LEFT JOIN events d ON d.kind = 'session.derived' AND d.session_id = e.session_id
LEFT JOIN (SELECT session_id, json_extract(payload_json, '$.start') AS start
           FROM events WHERE kind = 'session.started') s ON s.session_id = e.session_id
WHERE l.undone_at IS NULL AND e.session_id IS NOT NULL
GROUP BY l.item_key;

CREATE VIEW item_tasks AS
WITH latest AS (
  SELECT e.id, e.session_id, e.occurred_at, e.payload_json,
         ROW_NUMBER() OVER (PARTITION BY e.session_id ORDER BY e.occurred_at DESC, e.id DESC) AS rn
  FROM events e WHERE e.kind = 'task.list.updated' AND e.session_id IS NOT NULL
), live AS (
  SELECT l.item_key AS item_key, latest.id AS id, latest.occurred_at AS occurred_at, latest.payload_json AS payload_json
  FROM latest JOIN links l ON l.event_id = latest.id AND l.undone_at IS NULL
  WHERE latest.rn = 1
)
SELECT item_key,
       SUM(json_extract(payload_json, '$.total')) AS tasks_total,
       SUM(json_extract(payload_json, '$.completed')) AS tasks_done,
       (SELECT json_extract(x.payload_json, '$.current') FROM live x
        WHERE x.item_key = live.item_key AND json_extract(x.payload_json, '$.current') IS NOT NULL
        ORDER BY x.occurred_at DESC, x.id DESC LIMIT 1) AS current_task
FROM live GROUP BY item_key;
