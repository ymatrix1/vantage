"""Docs checks for Vantage, run locally and in CI.

Checks:
1. Relative Markdown links point to files that exist.
2. Every decision and proposal in docs/DECISIONS.md has the five required fields (D30), a valid status
   and owner, and an accepted decision is never edited or removed relative to the base branch (D69).
3. No secrets or personal identifiers slipped into tracked text files (privacy boundary).

Exits non-zero with a list of problems. Standard library only.
"""

import os
import pathlib
import re
import subprocess
import sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
import decisions_check  # noqa: E402
LINK = re.compile(r"\]\(([^)\s]+)\)")
PRIVACY = [
    (re.compile(r"\bgh[opsu]_[A-Za-z0-9]{20,}"), "GitHub token"),
    (re.compile(r"\bxox[abpr]-[A-Za-z0-9-]{10,}"), "Slack token"),
    (re.compile(r"\bsk-[A-Za-z0-9_-]{20,}"), "API key"),
    (re.compile(r"[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}"), "email address"),
]
TEXT_SUFFIXES = {".md", ".yml", ".yaml", ".json", ".toml", ".py", ".ts", ".js", ".html", ".css"}


def tracked_files():
    out = subprocess.run(["git", "ls-files"], cwd=ROOT, capture_output=True, text=True, check=True)
    return [ROOT / p for p in out.stdout.splitlines()]


def check_links(files):
    problems = []
    for f in files:
        if f.suffix != ".md" or not f.exists():
            continue
        text = f.read_text(encoding="utf-8")
        text = re.sub(r"```.*?```", "", text, flags=re.S)  # fenced code blocks
        text = re.sub(r"`[^`\n]*`", "", text)  # inline code spans hold examples, not links
        for target in LINK.findall(text):
            if target.startswith(("http://", "https://", "mailto:", "#")):
                continue
            path, _, anchor = target.partition("#")
            dest = (f.parent / path) if path else f
            if path and not dest.exists():
                problems.append(f"{f.relative_to(ROOT)}: broken link -> {target}")
            elif anchor and dest.suffix == ".md" and anchor not in anchors(dest):
                problems.append(f"{f.relative_to(ROOT)}: missing section #{anchor} in {dest.relative_to(ROOT)}")
    return problems


def anchors(md_file):
    """GitHub-style heading slugs for a Markdown file."""
    slugs, seen = set(), {}
    text = re.sub(r"```.*?```", "", md_file.read_text(encoding="utf-8"), flags=re.S)
    for line in text.splitlines():
        m = re.match(r"^#{1,6}\s+(.*)", line)
        if not m:
            continue
        s = re.sub(r"[`*_]", "", m.group(1).strip()).lower()
        s = re.sub(r"[^\w\- ]", "", s).replace(" ", "-")
        n = seen.get(s, 0)
        seen[s] = n + 1
        slugs.add(s if n == 0 else f"{s}-{n}")
    return slugs


def check_tables(files):
    """A table row right after a blank line, with no header separator below it, is a broken table."""
    problems = []
    for f in files:
        if f.suffix != ".md" or not f.exists():
            continue
        lines = f.read_text(encoding="utf-8").splitlines()
        in_code = False
        for i, line in enumerate(lines):
            if line.startswith("```"):
                in_code = not in_code
            if in_code or not line.startswith("|"):
                continue
            prev_blank = i == 0 or not lines[i - 1].strip()
            next_is_sep = i + 1 < len(lines) and re.match(r"^\|[\s:|-]+\|$", lines[i + 1].strip())
            if prev_blank and not next_is_sep:
                problems.append(f"{f.relative_to(ROOT)}:{i + 1}: table row without a header (blank line splits the table?)")
    return problems


def base_decisions_text():
    """DECISIONS.md on the base branch, or None when it cannot be read (for example a shallow clone)."""
    base = os.environ.get("GITHUB_BASE_REF") or "main"
    out = subprocess.run(
        ["git", "show", f"origin/{base}:docs/DECISIONS.md"],
        cwd=ROOT,
        capture_output=True,
        text=True,
        encoding="utf-8",
    )
    return out.stdout if out.returncode == 0 else None


def check_decisions():
    head = (ROOT / "docs" / "DECISIONS.md").read_text(encoding="utf-8")
    problems = decisions_check.check_decision_text(head)
    base = base_decisions_text()
    if base is not None:
        problems += decisions_check.check_freeze(base, head)
    return problems


def check_privacy(files):
    problems = []
    for f in files:
        if f.suffix not in TEXT_SUFFIXES or not f.exists() or f.name == "check_docs.py":
            continue
        for n, line in enumerate(f.read_text(encoding="utf-8", errors="ignore").splitlines(), 1):
            for pattern, label in PRIVACY:
                if pattern.search(line):
                    problems.append(f"{f.relative_to(ROOT)}:{n}: possible {label}")
    return problems


def main():
    files = tracked_files()
    problems = check_links(files) + check_tables(files) + check_decisions() + check_privacy(files)
    for p in problems:
        print(p)
    print(f"{len(problems)} problem(s) in {len(files)} tracked files")
    return 1 if problems else 0


if __name__ == "__main__":
    sys.exit(main())
