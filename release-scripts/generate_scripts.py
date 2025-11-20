import os
import re
import json
from pathlib import Path

# -------------------------
# Configuration
# -------------------------
scripts = ["natsumi/scripts/*"]
json_path = Path("theme.json")  # relative to current working directory
allowed_extensions = (".uc.js", ".uc.mjs", ".sys.mjs")

# -------------------------
# Expand script paths
# -------------------------
script_paths = []
for script in scripts:
    if script.endswith("/*"):
        parent_dir = script[:-2]

        if not os.path.isdir(parent_dir):
            print(f"[WARN] Directory not found: {parent_dir}")
            continue

        for entry in os.listdir(parent_dir):
            entry_path = os.path.join(parent_dir, entry)
            if os.path.isfile(entry_path) and entry.endswith(allowed_extensions):
                script_paths.append(entry_path)
    else:
        if os.path.isfile(script) and script.endswith(allowed_extensions):
            script_paths.append(script)
        else:
            print(f"[WARN] Script not found or invalid extension: {script}")

# -------------------------
# Helper: parse UserScript header
# -------------------------
def parse_userscript_header(path):
    with open(path, "r", encoding="utf-8") as f:
        lines = f.readlines()

    header_start = header_end = None
    for i, line in enumerate(lines):
        if line.strip() == "// ==UserScript==":
            header_start = i
        elif line.strip() == "// ==/UserScript==":
            header_end = i
            break

    metadata = {}

    if header_start is None or header_end is None:
        return metadata

    header_lines = lines[header_start + 1 : header_end]
    pattern = re.compile(r"//\s*@(\w+)\s+(.+)")

    include_list = []
    exclude_list = []

    for line in header_lines:
        match = pattern.match(line.strip())
        if not match:
            continue

        key, value = match.group(1), match.group(2)
        key_lower = key.lower()
        val = value.strip()

        if key_lower == "include":
            if val == "main":
                include_list.append("chrome://browser/content/browser.xhtml")
            elif val == "*":
                include_list = []
            else:
                include_list.append(val)

        elif key_lower == "exclude":
            exclude_list.append(val)

        elif key_lower == "loadorder":
            try:
                metadata["loadOrder"] = int(val)
            except ValueError:
                pass  # ignore invalid number

        elif key_lower in ("name", "description"):
            metadata[key_lower] = val

    if include_list:
        metadata["include"] = include_list
    if exclude_list:
        metadata["exclude"] = exclude_list

    return metadata

# -------------------------
# Load existing JSON or create new
# -------------------------
if json_path.exists():
    with open(json_path, "r", encoding="utf-8") as f:
        data = json.load(f)
    print(f"[INFO] Loaded existing JSON: {json_path}")
else:
    data = {}
    print(f"[INFO] Creating new JSON file: {json_path}")

data["scripts"] = {}

# -------------------------
# Process scripts
# -------------------------
for script_path in script_paths:
    p = Path(script_path)
    parent = p.parent.as_posix() + "/"
    name = p.name

    metadata = parse_userscript_header(script_path)
    if not metadata:
        metadata = {}

    if parent not in data["scripts"]:
        data["scripts"][parent] = {}

    data["scripts"][parent][name] = metadata
    print(f"[INFO] Added script: {script_path}")

# -------------------------
# Save JSON
# -------------------------
with open(json_path, "w", encoding="utf-8") as f:
    json.dump(data, f, indent=2)
print(f"[INFO] Updated JSON saved to {json_path}")
