"""Tests for tools/migrations_check.py. Inputs are synthetic file names and SQL."""

import pathlib
import sys
import unittest

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
import migrations_check as mc  # noqa: E402


class NameTests(unittest.TestCase):
    def test_valid_sequence_passes(self):
        self.assertEqual(mc.check_names(["0001-initial-schema.sql", "0002-links.sql", "0003-x2.sql"]), [])

    def test_gap_is_reported(self):
        problems = mc.check_names(["0001-a.sql", "0003-c.sql"])
        self.assertEqual(len(problems), 1)
        self.assertIn("0002 is missing", problems[0])

    def test_must_start_at_one(self):
        self.assertIn("0001 is missing", mc.check_names(["0002-b.sql"])[0])

    def test_duplicate_number_is_reported(self):
        problems = mc.check_names(["0001-a.sql", "0002-b.sql", "0002-c.sql"])
        self.assertEqual(len(problems), 1)
        self.assertIn("0002 is used by 0002-b.sql and 0002-c.sql", problems[0])

    def test_bad_names_are_reported(self):
        for bad in ["1-a.sql", "0001_a.sql", "0001-A.sql", "0001-a.SQL", "0001.sql", "0001-a-.sql", "README.md", "0001-a.sql.bak"]:
            with self.subTest(name=bad):
                self.assertTrue(any("NNNN-slug.sql" in p for p in mc.check_names([bad])), bad)

    def test_empty_directory_has_no_problems(self):
        self.assertEqual(mc.check_names([]), [])


class FreezeTests(unittest.TestCase):
    BASE = {"0001-a.sql": "CREATE TABLE a (x);\n", "0002-b.sql": "CREATE TABLE b (y);\n"}

    def test_unchanged_and_new_files_pass(self):
        head = dict(self.BASE, **{"0003-c.sql": "CREATE TABLE c (z);\n"})
        self.assertEqual(mc.check_freeze(self.BASE, head), [])

    def test_edit_is_reported(self):
        head = dict(self.BASE, **{"0002-b.sql": "CREATE TABLE b (y, extra);\n"})
        problems = mc.check_freeze(self.BASE, head)
        self.assertEqual(len(problems), 1)
        self.assertIn("0002-b.sql: changed since the base branch", problems[0])

    def test_removal_and_rename_are_reported(self):
        head = {"0001-a.sql": self.BASE["0001-a.sql"], "0002-bee.sql": self.BASE["0002-b.sql"]}
        problems = mc.check_freeze(self.BASE, head)
        self.assertEqual(len(problems), 1)
        self.assertIn("0002-b.sql: exists on the base branch but was removed or renamed", problems[0])

    def test_line_endings_are_not_an_edit(self):
        head = {"0001-a.sql": "CREATE TABLE a (x);\r\n", "0002-b.sql": self.BASE["0002-b.sql"]}
        self.assertEqual(mc.check_freeze(self.BASE, head), [])


if __name__ == "__main__":
    unittest.main()
