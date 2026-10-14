"""Checks for the SQLite migration files in packages/daemon/migrations (D91). Pure functions over names
and text, so they are easy to test.

- Every file is named NNNN-slug.sql (four digits, lowercase words joined by dashes).
- Numbers start at 0001, with no gaps and no duplicates.
- A migration that exists on the base branch is unchanged and still present (the same freeze as the
  accepted decisions, D69). Line endings do not count as a change, as in the runner's checksum.

Standard library only.
"""

import re

DIR = "packages/daemon/migrations"
NAME = re.compile(r"^(\d{4})-[a-z0-9]+(?:-[a-z0-9]+)*\.sql$")


def check_names(files):
    """Name, numbering and duplicate problems for a list of file names (no directory part)."""
    problems = []
    numbers = {}
    for f in sorted(files):
        m = NAME.match(f)
        if not m:
            problems.append(f"{DIR}/{f}: name must match NNNN-slug.sql (four digits, lowercase words joined by dashes)")
            continue
        numbers.setdefault(int(m.group(1)), []).append(f)
    for n, names in sorted(numbers.items()):
        if len(names) > 1:
            problems.append(f"{DIR}: number {n:04d} is used by {' and '.join(names)}; renumber the newer one")
    if numbers:
        for n in range(1, max(numbers) + 1):
            if n not in numbers:
                problems.append(f"{DIR}: migration {n:04d} is missing; numbers have no gaps")
    return problems


def normalize(text):
    return text.replace("\r\n", "\n")


def check_freeze(base, head):
    """`base` and `head` map file name to text. A migration on the base branch must be present and identical."""
    problems = []
    for name, text in sorted(base.items()):
        if name not in head:
            problems.append(f"{DIR}/{name}: exists on the base branch but was removed or renamed; applied migrations are frozen")
        elif normalize(head[name]) != normalize(text):
            problems.append(
                f"{DIR}/{name}: changed since the base branch; applied migrations are frozen, add a new migration instead"
            )
    return problems
