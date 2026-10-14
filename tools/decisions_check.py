"""Checks for docs/DECISIONS.md (D30, D69). Pure functions over text, so they are easy to test.

- Every decision has the five fields, a valid status and, once decided, an owner.
- Proposals sit under "Proposed"; decided ones do not.
- A superseded decision names an existing successor.
- An accepted decision in the base text is unchanged and present in the new text; only its lifecycle
  lines (Status, Decided by, Superseded by) may change.

Standard library only.
"""

import re

FIELDS = ["Context", "Decision", "Why", "Alternatives", "Impact"]
STATUSES = ("proposed", "accepted", "superseded", "rejected")
DECIDED = ("accepted", "superseded", "rejected")
PROPOSED_HEADING = "## Proposed"
HEADING = re.compile(r"(?m)^### ([DV]\d+)\. .*$")
BLOCK_END = re.compile(r"(?m)^(### |---$|## )")
LIFECYCLE = re.compile(r"^- \*\*(Status|Decided by|Superseded by):\*\*")


def decision_blocks(text):
    """Maps a decision id (D12, V1) to (block text, is_proposed)."""
    proposed_at = text.find(PROPOSED_HEADING)
    blocks = {}
    for m in HEADING.finditer(text):
        end = BLOCK_END.search(text, m.end())
        block = text[m.start() : end.start() if end else len(text)]
        blocks[m.group(1)] = (block.rstrip() + "\n", proposed_at != -1 and m.start() > proposed_at)
    return blocks


def field(block, name):
    """The value of a `- **Name:** value` line, or None when the line is absent."""
    m = re.search(rf"(?m)^- \*\*{name}:\*\*[ \t]*(.*)$", block)
    return m.group(1).strip() if m else None


def status_of(block):
    value = field(block, "Status")
    return value.split()[0].strip(".,;:").lower() if value else None


def check_decision_text(text):
    """Fields, status, owner, section and supersession for every decision in the text."""
    problems = []
    blocks = decision_blocks(text)
    for did, (block, in_proposed) in blocks.items():
        title = block.splitlines()[0].replace("### ", "").strip()
        for name in FIELDS:
            if f"**{name}:**" not in block:
                problems.append(f"docs/DECISIONS.md: {title} is missing '{name}'")
        status = status_of(block)
        if status not in STATUSES:
            problems.append(
                f"docs/DECISIONS.md: {did} needs '- **Status:**' starting with one of {', '.join(STATUSES)}"
            )
            continue
        if in_proposed and status != "proposed":
            problems.append(f"docs/DECISIONS.md: {did} is under Proposed but its status is {status}")
        if not in_proposed and status == "proposed":
            problems.append(f"docs/DECISIONS.md: {did} is proposed; move it under '{PROPOSED_HEADING}'")
        if status in DECIDED and not field(block, "Decided by"):
            problems.append(f"docs/DECISIONS.md: {did} is {status} but has no '- **Decided by:**'")
        if status == "superseded":
            target = re.match(r"[DV]\d+", field(block, "Superseded by") or "")
            if not target or target.group(0) == did or target.group(0) not in blocks:
                problems.append(
                    f"docs/DECISIONS.md: {did} is superseded but 'Superseded by' does not name another decision"
                )
    return problems


def frozen_form(block):
    """A decision block without lifecycle lines and blank lines, for the freeze comparison."""
    return [ln.rstrip() for ln in block.splitlines() if ln.strip() and not LIFECYCLE.match(ln)]


def check_freeze(base_text, head_text):
    """A decision that was decided in the base text must be unchanged and still present."""
    problems = []
    head = decision_blocks(head_text)
    for did, (block, _) in decision_blocks(base_text).items():
        if status_of(block) not in DECIDED:
            continue
        if did not in head:
            problems.append(f"docs/DECISIONS.md: {did} is decided and was removed; mark it superseded instead")
        elif frozen_form(head[did][0]) != frozen_form(block):
            problems.append(
                f"docs/DECISIONS.md: {did} is decided and its text changed; "
                "add a new decision and mark this one superseded"
            )
    return problems
