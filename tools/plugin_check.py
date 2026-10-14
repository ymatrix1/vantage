"""Checks for the `vantage` Claude Code plugin (bean vantage-u902). Pure functions over text.

- Every command file has frontmatter with a description and an `allowed-tools` list.
- `allowed-tools` never grants unrestricted Bash: each Bash entry names a command, and none runs
  `uninstall` or `remove`.
- plugin.json and the marketplace entry agree on name and path.

Standard library only.
"""

import json
import re

FRONTMATTER = re.compile(r"\A---\r?\n(.*?)(?:\r?\n)?---\r?\n", re.S)
FORBIDDEN_VERBS = ("uninstall", "remove")


def parse_frontmatter(text):
    """Returns the frontmatter as {key: value-string}, or None when absent. Values stay strings."""
    m = FRONTMATTER.match(text)
    if not m:
        return None
    out = {}
    for line in m.group(1).splitlines():
        if ":" in line and not line.startswith((" ", "\t")):
            key, value = line.split(":", 1)
            out[key.strip()] = value.strip().strip("\"'")
    return out


def split_tools(value):
    """`Bash(a b:*), Read(x)` -> ['Bash(a b:*)', 'Read(x)'] (commas inside parentheses stay)."""
    tools, depth, cur = [], 0, ""
    for ch in value:
        if ch == "(":
            depth += 1
        elif ch == ")":
            depth -= 1
        if ch == "," and depth == 0:
            tools.append(cur.strip())
            cur = ""
        else:
            cur += ch
    if cur.strip():
        tools.append(cur.strip())
    return tools


def check_command(name, text):
    """Problems in one command file, each prefixed with the file name."""
    fm = parse_frontmatter(text)
    if fm is None:
        return [f"{name}: missing frontmatter"]
    problems = []
    for line in FRONTMATTER.match(text).group(1).splitlines():
        value = line.split(":", 1)[1].strip() if ":" in line else ""
        if value and value[0] not in "\"'" and (value[0] in "[{&*!|>%@`" or ": " in value or " #" in value):
            problems.append(f"{name}: frontmatter value needs quotes (YAML would not parse): {line.strip()}")
    if not fm.get("description"):
        problems.append(f"{name}: missing description")
    allowed = fm.get("allowed-tools", "")
    tools = split_tools(allowed)
    if not tools:
        problems.append(f"{name}: missing allowed-tools")
    for tool in tools:
        if tool == "Bash" or tool == "Bash()" or tool in ("*", "Bash(*)", "Bash(*:*)"):
            problems.append(f"{name}: unrestricted Bash in allowed-tools")
        m = re.fullmatch(r"Bash\((.*)\)", tool)
        if m:
            words = re.split(r"[\s:*]+", m.group(1))
            if any(v in words for v in FORBIDDEN_VERBS):
                problems.append(f"{name}: allowed-tools grants a forbidden verb: {tool}")
        elif not re.fullmatch(r"(Read|Glob|Grep)(\(.*\))?", tool):
            problems.append(f"{name}: tool not allowed in a Vantage command: {tool}")
    return problems


def check_plugin(plugin_json_text, marketplace_text, plugin_dir_name, command_names):
    """Problems in plugin.json, its marketplace entry and the command set."""
    problems = []
    try:
        plugin = json.loads(plugin_json_text)
        market = json.loads(marketplace_text)
    except ValueError as e:
        return [f"invalid JSON: {e}"]
    name = plugin.get("name")
    if not name:
        problems.append("plugin.json: missing name")
    if not plugin.get("description"):
        problems.append("plugin.json: missing description")
    entries = [p for p in market.get("plugins", []) if p.get("name") == name]
    if len(entries) != 1:
        problems.append(f"marketplace: expected one entry named {name!r}, found {len(entries)}")
    elif entries[0].get("source") != f"./plugin/{plugin_dir_name}":
        problems.append(f"marketplace: source {entries[0].get('source')!r} is not './plugin/{plugin_dir_name}'")
    if name != plugin_dir_name:
        problems.append(f"plugin.json name {name!r} differs from folder {plugin_dir_name!r}")
    missing = sorted({"open", "start", "doctor", "status", "add"} - set(command_names))
    if missing:
        problems.append(f"missing commands: {', '.join(missing)}")
    extra = sorted(set(command_names) - {"open", "start", "doctor", "status", "add"})
    if extra:
        problems.append(f"unexpected commands (no uninstall or remove): {', '.join(extra)}")
    return problems
