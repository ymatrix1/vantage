import pathlib
import sys
import unittest

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
import glossary_check as g  # noqa: E402

GOOD = "\n".join(
    f"### {s.replace('-', ' ').title()}\n**Plain:** p\n**Example:** e\n**Defined in:** d\n" for s in g.CORE_TERMS
)


class Entries(unittest.TestCase):
    def test_complete_glossary_passes(self):
        self.assertEqual(g.check_entries(GOOD), [])

    def test_entry_missing_example(self):
        text = GOOD.replace("**Example:** e\n", "", 1)
        self.assertTrue(any("Example" in p for p in g.check_entries(text)))

    def test_missing_core_term(self):
        text = GOOD.replace("### Mece", "### Other")
        self.assertTrue(any("'mece'" in p for p in g.check_entries(text)))


class TermLinks(unittest.TestCase):
    def test_unlinked_term_fails(self):
        self.assertEqual(
            g.check_term_links("x.md", "Each flag has one action."),
            ["x.md: uses 'flag' without a link to GLOSSARY.md#flag"],
        )

    def test_linked_term_passes(self):
        self.assertEqual(g.check_term_links("x.md", "Each [flag](GLOSSARY.md#flag) has one action."), [])

    def test_terms_line_counts(self):
        self.assertEqual(g.check_term_links("x.md", "> Terms: [flag](../GLOSSARY.md#flag)\n\nA flag."), [])

    def test_code_is_ignored(self):
        self.assertEqual(g.check_term_links("x.md", "Run `vantage flag` or\n```\nflag\n```"), [])

    def test_case_sensitive_acronyms(self):
        self.assertEqual(g.check_term_links("x.md", "the scr file"), [])

    def test_link_target_is_not_usage(self):
        self.assertEqual(g.check_term_links("x.md", "[doc](flags.md)"), [])


class PtSync(unittest.TestCase):
    def test_entry_count_mismatch(self):
        self.assertTrue(g.check_pt_sync(GOOD, "### Um\n**Plain:** a", "", []))

    def test_unlisted_file(self):
        self.assertTrue(g.check_pt_sync(GOOD, GOOD, "| GUIDE.md | x |", ["GUIDE.md"]))

    def test_listed_file_with_date(self):
        self.assertEqual(g.check_pt_sync(GOOD, GOOD, "| GUIDE.md | 5a070ed 2026-10-14 |", ["GUIDE.md"]), [])


if __name__ == "__main__":
    unittest.main()
