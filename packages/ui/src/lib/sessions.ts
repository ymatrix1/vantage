// Sessions of one item as a tree: a session that continues another nests under it.
import type { ItemSession } from "@vantage/core/track";

export interface SessionNode {
  session: ItemSession;
  children: SessionNode[];
}

/** Roots are sessions whose parent is not among the item's sessions; a cycle never loops. */
export function nestSessions(list: readonly ItemSession[]): SessionNode[] {
  const nodes = new Map(list.map((s) => [s.id, { session: s, children: [] as SessionNode[] }]));
  const roots: SessionNode[] = [];
  for (const node of nodes.values()) {
    const p = node.session.parentId;
    const parent = p ? nodes.get(p) : undefined;
    if (parent && !reaches(nodes, p, node.session.id)) parent.children.push(node);
    else roots.push(node);
  }
  return roots;
}

/** True when walking up from `from` meets `target` (so adding the edge would make a cycle). */
function reaches(nodes: ReadonlyMap<string, SessionNode>, from: string | null, target: string): boolean {
  const seen = new Set<string>();
  let cur = from;
  while (cur && !seen.has(cur)) {
    if (cur === target) return true;
    seen.add(cur);
    cur = nodes.get(cur)?.session.parentId ?? null;
  }
  return false;
}
