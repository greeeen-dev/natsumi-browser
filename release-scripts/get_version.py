"""
Natsumi Browser - A userchrome for Firefox and more that makes things flow.

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
import os

with open('theme.json', 'r') as file:
    data = json.load(file)

env_file = os.getenv('GITHUB_ENV')

if data['version'].startswith('v'):
    raw_version = data['version'][1:]
    version = data['version']
else:
    raw_version = data['version']
    version = 'v' + data['version']

with open(env_file, "a") as myfile:
    myfile.write(f"RAW_VERSION={raw_version}\nVERSION={version}")