"""
Natsumi Browser - Welcome to your personal internet.

Copyright (c) 2024-present Green (@greeeen-dev)

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
"""

# Yes, this file is copied from https://github.com/UnifierHQ/unifier
# It's my own code though so no worries

import json
import sys

branch = sys.argv[-1]

print("Detected branch:", branch)

with open('natsumi/version.json', 'r') as file:
    package_version = json.load(file)['version']
with open('installer/installer.json', 'r') as file:
    installer_data = json.load(file)["package"]
    installer_versions = [installer_data["version"], installer_data["version_rc"], installer_data["version_beta"], installer_data["version_alpha"]]
with open('theme.json', 'r') as file:
    sine_version = json.load(file)['version']

if branch != "main":
    print("Branch is not main, assuming prerelease. Sine version will not be checked.")

# Sanitize installer versions
installer_versions = [version for version in installer_versions if version]

installer_match = package_version in installer_versions
sine_match = package_version == sine_version or branch != "main"
can_proceed = installer_match and sine_match

if can_proceed:
    print("Version matches!")
else:
    print("Version mismatch, cannot build!")

# Print version info
print(f"- Package version (natsumi/version.json): {package_version}")
print(f"- Installer versions (installer/installer.json): {'/'.join(installer_versions)}")
print(f"- Sine version (theme.json): {sine_version}")

if not can_proceed:
    sys.exit(1)
