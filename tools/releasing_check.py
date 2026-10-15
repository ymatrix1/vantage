"""Checks that RELEASING.md exists and lists the manual steps only the repository owner can do (bean vantage-a6hi).

Pure functions over text. Standard library only.
"""

import re

# Each owner step must be named in a `- [ ]` checklist item, so the owner can tick them off.
REQUIRED_STEPS = {
    "npm-publish": "create the `npm-publish` environment with required reviewers",
    "trusted publisher": "add the npm trusted publisher (workflow `release.yml`)",
    "release.yml": "name the exact workflow file in the trusted publisher step",
    "2FA": "enable 2FA and disallow tokens",
    "NPM_PUBLISH_ENABLED": "set the `NPM_PUBLISH_ENABLED` repository variable",
    "create and approve pull requests": "allow GitHub Actions to create pull requests",
    "Package names": "confirm the npm package names and scope",
}
REQUIRED_SECTIONS = ("How a release happens", "One-time setup", "Rolling back")
TOKEN_SHAPES = re.compile(r"npm_[A-Za-z0-9]{20,}|ghp_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{20,}")


def check_releasing(text):
    """Returns a list of problems; empty when RELEASING.md is complete."""
    if text is None:
        return ["RELEASING.md is missing"]
    problems = []
    for section in REQUIRED_SECTIONS:
        if not re.search(rf"^##+ .*{re.escape(section)}", text, re.M):
            problems.append(f"missing section: {section}")
    items = [line for line in text.splitlines() if line.startswith("- [ ]")]
    for needle, what in REQUIRED_STEPS.items():
        if not any(needle in item for item in items):
            problems.append(f"owner checklist lacks a `- [ ]` item to {what}")
    if TOKEN_SHAPES.search(text):
        problems.append("contains something shaped like a token")
    return problems
