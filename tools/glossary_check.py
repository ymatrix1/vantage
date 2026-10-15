"""Glossary checks for the docs (docs/GLOSSARY.md).

1. Every glossary entry has a Plain, an Example and a Defined in line.
2. The core terms all have an entry.
3. A doc that uses a core term links to its glossary entry (first use or a Terms line), so a newcomer is
   never left alone with jargon.
4. The pt-BR glossary has as many entries as the English one, and docs/pt-BR/README.md lists every pt-BR file
   with its source commit date.

Link targets and anchors are checked by check_docs.check_links; this module only checks what is said.
Standard library only.
"""

import re

# slug of the glossary heading -> pattern that counts as "the doc uses this term"
CORE_TERMS = {
    "a2v": r"\bA2V\b",
    "anchor": r"\banchors?\b",
    "answer-first": r"\banswer[- ]first\b",
    "backfill": r"\bbackfill",
    "daemon": r"\bdaemon\b",
    "derived-session": r"\bderived sessions?\b",
    "flag": r"\bflags?\b",
    "hook": r"\bhooks?\b",
    "issue-tree": r"\bissue trees?\b",
    "landscape": r"\blandscape\b",
    "linker": r"\blinker\b",
    "mece": r"\bMECE\b",
    "needs-you": r"\bNeeds you\b",
    "pyramid-principle": r"\bPyramid Principle\b",
    "scr": r"\bSCR\b",
    "signal": r"\bsignals?\b",
    "spool": r"\bspool\b",
    "stop-gate": r"\bstop gate\b",
    "thrashing": r"\bthrashing\b",
    "unproven-claim": r"\bunproven[ _]claim\b",
    "work-item": r"\bwork items?\b",
    "worktree": r"\bworktrees?\b",
}
ENTRY = re.compile(r"^### (.+)$", re.M)
LABELS = ("**Plain:**", "**Example:**", "**Defined in:**")


def slug(heading):
    s = re.sub(r"[`*_]", "", heading.strip()).lower()
    return re.sub(r"[^\w\- ]", "", s).replace(" ", "-")


def entries(text):
    """Map slug -> entry body for every `### Term` heading."""
    parts = ENTRY.split(text)
    return {slug(parts[i]): parts[i + 1] for i in range(1, len(parts), 2)}


def check_entries(text):
    problems = []
    found = entries(text)
    for s, body in found.items():
        for label in LABELS:
            if label not in body:
                problems.append(f"glossary entry '{s}' is missing {label}")
    for s in CORE_TERMS:
        if s not in found:
            problems.append(f"glossary has no entry for core term '{s}'")
    return problems


def prose(text):
    """Text without fenced code, inline code and the glossary link targets."""
    text = re.sub(r"```.*?```", "", text, flags=re.S)
    text = re.sub(r"`[^`\n]*`", "", text)
    return re.sub(r"\]\([^)]*\)", "]", text)


def check_term_links(name, text):
    """A doc that uses a core term must link to GLOSSARY.md#<slug> at least once."""
    body = prose(text)
    problems = []
    for s, pattern in CORE_TERMS.items():
        if re.search(pattern, body, re.I if s not in ("a2v", "mece", "scr") else 0) and f"GLOSSARY.md#{s})" not in text:
            problems.append(f"{name}: uses '{s}' without a link to GLOSSARY.md#{s}")
    return problems


def check_pt_sync(en_glossary, pt_glossary, pt_index, pt_files):
    problems = []
    if len(entries(pt_glossary)) != len(entries(en_glossary)):
        problems.append(
            f"pt-BR glossary has {len(entries(pt_glossary))} entries, English has {len(entries(en_glossary))}"
        )
    for f in pt_files:
        if f == "README.md":
            continue
        if not re.search(rf"\b{re.escape(f)}\b.*\b\d{{4}}-\d{{2}}-\d{{2}}\b", pt_index):
            problems.append(f"docs/pt-BR/README.md does not list {f} with a source commit date (YYYY-MM-DD)")
    return problems
