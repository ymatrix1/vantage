"""Tests for tools/plugin_check.py. Synthetic inputs, plus one pass over the real plugin files."""

import json
import pathlib
import sys
import unittest

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
import plugin_check as pc  # noqa: E402

ROOT = pathlib.Path(__file__).resolve().parent.parent
NAMES = ["open", "start", "doctor", "status", "add"]


def command(tools="Bash(vantage open*)", desc="Open it"):
    fm = ["---"]
    if desc is not None:
        fm.append(f"description: {desc}")
    if tools is not None:
        fm.append(f"allowed-tools: {tools}")
    fm.append("---")
    return "\n".join(fm) + "\n\nbody\n"


def plugin(name="vantage"):
    return json.dumps({"name": name, "description": "d"})


def market(name="vantage", source="./plugin/vantage"):
    return json.dumps({"name": "vantage", "plugins": [{"name": name, "source": source}]})


class CommandTests(unittest.TestCase):
    def test_valid_command_passes(self):
        self.assertEqual(pc.check_command("open", command("Bash(vantage open*), Read(~/.vantage/status.json)")), [])

    def test_missing_frontmatter(self):
        self.assertEqual(pc.check_command("open", "no frontmatter"), ["open: missing frontmatter"])

    def test_missing_description_and_tools(self):
        problems = pc.check_command("open", command(tools=None, desc=None))
        self.assertIn("open: missing description", problems)
        self.assertIn("open: missing allowed-tools", problems)

    def test_unrestricted_bash_fails(self):
        for tools in ("Bash", "Bash(*)", "Bash(*:*)", "Bash()", "Read, Bash"):
            with self.subTest(tools=tools):
                self.assertTrue(any("unrestricted Bash" in p for p in pc.check_command("open", command(tools))))

    def test_forbidden_verbs_fail(self):
        for tools in ("Bash(vantage uninstall*)", "Bash(vantage remove:*)", "Bash(node *main.js remove *)"):
            with self.subTest(tools=tools):
                self.assertTrue(any("forbidden verb" in p for p in pc.check_command("open", command(tools))))

    def test_other_tools_fail(self):
        self.assertTrue(any("not allowed" in p for p in pc.check_command("open", command("Write, Edit"))))

    def test_unquoted_yaml_hazards_fail(self):
        for desc in ("Show item: stage", "[--git-hooks]"):
            with self.subTest(desc=desc):
                self.assertTrue(any("needs quotes" in p for p in pc.check_command("open", command(desc=desc))))
        self.assertEqual(pc.check_command("open", command(desc='"Show item: stage"')), [])

    def test_commas_inside_parentheses_stay(self):
        self.assertEqual(pc.split_tools("Bash(a, b), Read(x)"), ["Bash(a, b)", "Read(x)"])


class PluginTests(unittest.TestCase):
    def test_agreeing_files_pass(self):
        self.assertEqual(pc.check_plugin(plugin(), market(), "vantage", NAMES), [])

    def test_name_mismatch_fails(self):
        self.assertTrue(pc.check_plugin(plugin("other"), market(), "vantage", NAMES))

    def test_path_mismatch_fails(self):
        self.assertTrue(any("source" in p for p in pc.check_plugin(plugin(), market(source="./plugin/x"), "vantage", NAMES)))

    def test_missing_marketplace_entry_fails(self):
        self.assertTrue(any("expected one entry" in p for p in pc.check_plugin(plugin(), market("a2v"), "vantage", NAMES)))

    def test_missing_and_extra_commands_fail(self):
        self.assertTrue(any("missing commands" in p for p in pc.check_plugin(plugin(), market(), "vantage", ["open"])))
        self.assertTrue(any("unexpected" in p for p in pc.check_plugin(plugin(), market(), "vantage", NAMES + ["uninstall"])))


class RealFilesTests(unittest.TestCase):
    def test_vantage_plugin_in_the_repo_is_valid(self):
        base = ROOT / "plugin" / "vantage"
        files = sorted((base / "commands").glob("*.md"))
        problems = []
        for f in files:
            problems += pc.check_command(f.stem, f.read_text(encoding="utf-8"))
        problems += pc.check_plugin(
            (base / ".claude-plugin" / "plugin.json").read_text(encoding="utf-8"),
            (ROOT / ".claude-plugin" / "marketplace.json").read_text(encoding="utf-8"),
            "vantage",
            [f.stem for f in files],
        )
        self.assertEqual(problems, [])

    def test_add_never_preapproves_yes(self):
        text = (ROOT / "plugin" / "vantage" / "commands" / "add.md").read_text(encoding="utf-8")
        tools = pc.parse_frontmatter(text)["allowed-tools"]
        self.assertNotIn("--yes", tools)
        self.assertIn("add --dry-run", tools)


if __name__ == "__main__":
    unittest.main()
