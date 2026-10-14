"""Tests for tools/releasing_check.py. Synthetic text, plus one pass over the real RELEASING.md."""

import pathlib
import sys
import unittest

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
import releasing_check as rc  # noqa: E402

ROOT = pathlib.Path(__file__).resolve().parent.parent

GOOD = """# Releasing

## How a release happens
x

## One-time setup (owner checklist)
- [ ] **Package names.** confirm them
- [ ] Create the `npm-publish` environment
- [ ] Add `NPM_TOKEN`
- [ ] Set `NPM_PUBLISH_ENABLED`
- [ ] tick "Allow GitHub Actions to create and approve pull requests"

## Rolling back
y
"""


class ReleasingCheck(unittest.TestCase):
    def test_complete_document_passes(self):
        self.assertEqual(rc.check_releasing(GOOD), [])

    def test_missing_file_is_a_problem(self):
        self.assertEqual(rc.check_releasing(None), ["RELEASING.md is missing"])

    def test_missing_step_is_named(self):
        text = GOOD.replace("- [ ] Add `NPM_TOKEN`\n", "")
        problems = rc.check_releasing(text)
        self.assertEqual(len(problems), 1)
        self.assertIn("NPM_TOKEN", problems[0])

    def test_step_outside_a_checklist_item_does_not_count(self):
        text = GOOD.replace("- [ ] Set `NPM_PUBLISH_ENABLED`", "Set `NPM_PUBLISH_ENABLED`")
        self.assertTrue(any("NPM_PUBLISH_ENABLED" in p for p in rc.check_releasing(text)))

    def test_missing_section_is_named(self):
        text = GOOD.replace("## Rolling back", "## Elsewhere")
        self.assertTrue(any("Rolling back" in p for p in rc.check_releasing(text)))

    def test_token_shape_is_rejected(self):
        fake = "npm_" + "a" * 24
        self.assertTrue(any("token" in p for p in rc.check_releasing(GOOD + fake)))

    def test_the_real_releasing_md_is_complete(self):
        path = ROOT / "RELEASING.md"
        text = path.read_text(encoding="utf-8") if path.exists() else None
        self.assertEqual(rc.check_releasing(text), [])


if __name__ == "__main__":
    unittest.main()
