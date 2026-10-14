"""Tests for tools/decisions_check.py. Inputs are synthetic DECISIONS.md fragments."""

import pathlib
import sys
import unittest

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
import decisions_check as dc  # noqa: E402

FIELDS = (
    "- **Context:** c\n- **Decision:** d\n- **Why:** w\n- **Alternatives:** a\n- **Impact:** i\n"
)


def decision(did, status, decided_by="user", extra="", body=FIELDS):
    lines = [f"### {did}. Title {did}", "", f"- **Status:** {status}"]
    if decided_by:
        lines.append(f"- **Decided by:** {decided_by}")
    if extra:
        lines.append(extra)
    return "\n".join(lines) + "\n\n" + body + "\n"


def doc(decided="", proposed=""):
    return f"# Decisions\n\n{decided}\n---\n\n## Proposed (pending confirmation)\n\n{proposed or 'None right now.'}\n"


class DecisionTextTests(unittest.TestCase):
    def test_valid_decisions_pass(self):
        text = doc(decision("D1", "accepted 2026-10-14"), decision("D2", "proposed", decided_by=""))
        self.assertEqual(dc.check_decision_text(text), [])

    def test_missing_status_is_reported(self):
        text = doc("### D1. T\n\n" + FIELDS)
        self.assertTrue(any("D1 needs '- **Status:**'" in p for p in dc.check_decision_text(text)))

    def test_unknown_status_is_reported(self):
        text = doc(decision("D1", "approved"))
        self.assertTrue(any("D1 needs" in p for p in dc.check_decision_text(text)))

    def test_missing_field_is_reported(self):
        body = FIELDS.replace("- **Why:** w\n", "")
        text = doc(decision("D1", "accepted", body=body))
        self.assertTrue(any("missing 'Why'" in p for p in dc.check_decision_text(text)))

    def test_proposed_outside_proposed_section_is_reported(self):
        text = doc(decision("D1", "proposed", decided_by=""))
        self.assertTrue(any("move it under" in p for p in dc.check_decision_text(text)))

    def test_accepted_inside_proposed_section_is_reported(self):
        text = doc(proposed=decision("D1", "accepted"))
        self.assertTrue(any("under Proposed" in p for p in dc.check_decision_text(text)))

    def test_decided_without_owner_is_reported(self):
        text = doc(decision("D1", "accepted", decided_by=""))
        self.assertTrue(any("no '- **Decided by:**'" in p for p in dc.check_decision_text(text)))

    def test_superseded_needs_an_existing_other_successor(self):
        ok = doc(decision("D1", "superseded", extra="- **Superseded by:** D2") + decision("D2", "accepted"))
        self.assertEqual(dc.check_decision_text(ok), [])
        missing = doc(decision("D1", "superseded"))
        self.assertTrue(any("does not name another decision" in p for p in dc.check_decision_text(missing)))
        unknown = doc(decision("D1", "superseded", extra="- **Superseded by:** D9"))
        self.assertTrue(any("does not name another decision" in p for p in dc.check_decision_text(unknown)))
        itself = doc(decision("D1", "superseded", extra="- **Superseded by:** D1"))
        self.assertTrue(any("does not name another decision" in p for p in dc.check_decision_text(itself)))

    def test_last_decision_before_proposed_heading_ends_at_the_rule(self):
        text = doc(decision("D1", "accepted"), decision("D2", "proposed", decided_by=""))
        blocks = dc.decision_blocks(text)
        self.assertNotIn("Proposed", blocks["D1"][0])
        self.assertTrue(blocks["D2"][1])
        self.assertFalse(blocks["D1"][1])


class FreezeTests(unittest.TestCase):
    base = doc(decision("D1", "accepted 2026-10-14"))

    def test_unchanged_passes(self):
        self.assertEqual(dc.check_freeze(self.base, self.base), [])

    def test_new_decision_passes(self):
        head = doc(decision("D1", "accepted 2026-10-14") + decision("D2", "accepted"))
        self.assertEqual(dc.check_freeze(self.base, head), [])

    def test_text_change_is_reported(self):
        head = self.base.replace("- **Why:** w", "- **Why:** changed my mind")
        self.assertTrue(any("text changed" in p for p in dc.check_freeze(self.base, head)))

    def test_removal_is_reported(self):
        head = doc("")
        self.assertTrue(any("was removed" in p for p in dc.check_freeze(self.base, head)))

    def test_lifecycle_lines_may_change(self):
        head = doc(decision("D1", "superseded 2026-10-15", extra="- **Superseded by:** D2") + decision("D2", "accepted"))
        self.assertEqual(dc.check_freeze(self.base, head), [])

    def test_undecided_base_decision_may_change(self):
        base = doc(proposed=decision("D1", "proposed", decided_by=""))
        head = doc(proposed=decision("D1", "proposed", decided_by="", body=FIELDS.replace("c\n", "new context\n")))
        self.assertEqual(dc.check_freeze(base, head), [])

    def test_base_without_status_is_not_frozen(self):
        base = doc("### D1. T\n\n" + FIELDS)
        head = doc(decision("D1", "accepted", body=FIELDS.replace("c\n", "edited\n")))
        self.assertEqual(dc.check_freeze(base, head), [])


if __name__ == "__main__":
    unittest.main()
