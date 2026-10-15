-- Session counts per item, read straight from live links and events so they are never stale (D86).
-- session_count: sessions with a live link; derived_count: those with a parent (session.derived);
-- subagent_count: distinct sub-agent runs (events carrying an agentId).
CREATE VIEW item_sessions AS
SELECT l.item_key AS item_key,
       COUNT(DISTINCT e.session_id) AS session_count,
       COUNT(DISTINCT CASE WHEN d.id IS NOT NULL THEN e.session_id END) AS derived_count,
       COUNT(DISTINCT json_extract(e.payload_json, '$.agentId')) AS subagent_count
FROM links l
JOIN events e ON e.id = l.event_id
LEFT JOIN events d ON d.kind = 'session.derived' AND d.session_id = e.session_id
WHERE l.undone_at IS NULL AND e.session_id IS NOT NULL
GROUP BY l.item_key;
