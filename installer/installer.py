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

import os
import sys
import shutil
import json
import traceback
import requests
import urllib.request, urllib.error
import certifi
import zipfile
from pathlib import Path

DEBUG = bool(os.environ.get('NATSUMI_DEBUG'))

def debug(message):
    if DEBUG:
        print(f'[DEBUG] {message}')

def get_admin():
    return hasattr(os, 'geteuid') and os.geteuid() == 0

def _resolve_home():
    """
    Returns the home directory of the *real* user. When running through sudo/doas,
    Path.home() may point to /root (or /root-ish), which would hide the user's profiles.
    """
    if get_admin():
        user = os.environ.get('SUDO_USER') or os.environ.get('DOAS_USER')
        if user and user != 'root':
            try:
                import pwd
                return pwd.getpwnam(user).pw_dir
            except (ImportError, KeyError):
                pass
    return str(Path.home())

home = _resolve_home()
data_path = str(Path(__file__).parent)

# They all roughly share the same layout
IS_POSIX = os.name == "posix"

with open(f"{data_path}/installer.json") as file:
    installer_data = json.load(file)

chrome_manifest = [
    'content userchromejs ./',
    'content userscripts ../natsumi/scripts/',
    'skin userstyles classic/1.0 ../CSS/',
    'content userchrome ../resources/',
    'content natsumi ../natsumi/',
    'content natsumi-icons ../natsumi/icons/'
]

risk_string = "Natsumi is provided \"as-is\" without any warranties. By installing and using Natsumi, you agree\n\
to the GPLv3 software license found in the LICENSE file in the repository. You are responsible for\n\
any damages or issues that may arise from using Natsumi and you agree not to hold the developers\n\
liable for any such damages or issues.\n\n\
Additionally, Natsumi uses fx-autoconfig to apply JS scripts to your browser. If your system is\n\
infected with malware, installing Natsumi may put your browser data at higher risk of being accessed\n\
maliciously. Please ensure your system is secure before proceeding with installation."

def download_from_git(repository, branch, destination, is_tag=False):
    heads_string = 'heads'
    if is_tag:
        heads_string = 'tags'

    try:
        urllib.request.urlretrieve(f'https://github.com/{repository}/archive/refs/{heads_string}/{branch}.zip', f'.natsumi-installer/{destination}.zip')
    except urllib.error.URLError:
        try:
            r = requests.get(f'https://github.com/{repository}/archive/refs/{heads_string}/{branch}.zip')
        except:
            # retry with certifi.where()
            r = requests.get(f'https://github.com/{repository}/archive/refs/{heads_string}/{branch}.zip', verify=certifi.where())

        with open(f'.natsumi-installer/{destination}.zip', 'wb') as file:
            file.write(r.content)

    with zipfile.ZipFile(f'.natsumi-installer/{destination}.zip', 'r') as file:
        file.extractall('.natsumi-installer')

        if is_tag and branch.startswith('v'):
            branch = branch[1:]

        os.rename(f".natsumi-installer/{repository.split('/')[1]}-{branch}", f".natsumi-installer/{destination}")

class BrowserEntry:
    def __init__(self, name, name_universal, name_macos, name_flatpak, name_windows, name_windows_binary,
                 install_names=None):
        self.name = name
        self.name_universal = name_universal
        self.name_macos = name_macos
        self.name_flatpak = name_flatpak
        self.name_windows = name_windows
        self.name_windows_binary = name_windows_binary

        # Directory names the browser may be installed under on Linux/BSD
        # (e.g. /usr/lib/<name>, /usr/local/lib/<name>, /opt/<name>)
        self.install_names = install_names or [name_universal]

def _get_macos_path(browser: BrowserEntry):
    path = home + f'/Library/Application Support/{browser.name_macos}/Profiles'

    if not os.path.exists(path):
        raise NotADirectoryError('Browser is not installed')

    return path

def _get_windows_path(browser: BrowserEntry):
    if browser.name_universal == 'mozilla':
        win_name = 'Mozilla\\Firefox'
    else:
        win_name = browser.name_universal
    path = home + f'\\AppData\\Roaming\\{win_name}\\Profiles'
    debug(path)

    if not os.path.exists(path):
        raise NotADirectoryError('Browser is not installed')

    return path

def _xdg_config_home():
    return os.environ.get('XDG_CONFIG_HOME') or f'{home}/.config'

def _unix_profile_roots(browser: BrowserEntry):
    """
    Every location a profile root (the folder containing profiles.ini and the profile
    folders) may live in on Linux/BSD, including the newer XDG-compliant locations.
    """
    xdg = _xdg_config_home()
    u = browser.name_universal
    roots = []

    if u == 'mozilla':
        roots += [
            f'{xdg}/mozilla/firefox',               # XDG (new)
            f'{home}/.config/mozilla/firefox',      # XDG (default, in case XDG_CONFIG_HOME is custom)
            f'{home}/.mozilla/firefox',             # legacy
            f'{home}/snap/firefox/common/.mozilla/firefox',  # Snap
        ]
    else:
        roots += [
            f'{home}/.{u}',                         # legacy
            f'{xdg}/{u}',                           # XDG
            f'{xdg}/{u}/{u}',                       # XDG (e.g. LibreWolf)
        ]

    if browser.name_flatpak:
        fp = f'{home}/.var/app/{browser.name_flatpak}'
        if u == 'mozilla':
            roots += [f'{fp}/.mozilla/firefox', f'{fp}/config/mozilla/firefox']
        else:
            roots += [f'{fp}/.{u}', f'{fp}/config/{u}', f'{fp}/config/{u}/{u}']

    return roots

def _unix_install_candidates(browser: BrowserEntry):
    # FreeBSD & co. install third party software under /usr/local
    prefixes = ['/usr/local/lib', '/usr/lib', '/usr/lib64', '/usr/lib32', '/opt']
    candidates = []
    for prefix in prefixes:
        for name in browser.install_names:
            candidates.append(f'{prefix}/{name}')

    if browser.name_flatpak:
        for base in ('/var/lib/flatpak', f'{home}/.local/share/flatpak'):
            for name in browser.install_names:
                candidates.append(f'{base}/app/{browser.name_flatpak}/current/active/files/lib/{name}')

    return candidates

def _looks_like_install(path, browser: BrowserEntry):
    """Checks that a directory really is a Mozilla-style application directory."""
    if not os.path.isdir(path):
        return False

    markers = ['application.ini', 'omni.ja', 'browser/omni.ja']
    markers += list(browser.install_names)
    return any(os.path.exists(f'{path}/{marker}') for marker in markers)

def _find_unix_install(browser: BrowserEntry):
    for candidate in _unix_install_candidates(browser):
        if _looks_like_install(candidate, browser):
            return candidate
    return None

browsers = [
    BrowserEntry('Firefox', 'mozilla', 'Firefox', 'org.mozilla.firefox', 'Mozilla/Firefox', 'Mozilla Firefox',
                 install_names=['firefox', 'firefox-esr', 'firefox-developer-edition']),
    BrowserEntry('Floorp', 'floorp', 'Floorp', None, 'Floorp', 'Floorp'),
    BrowserEntry('Waterfox', 'waterfox', 'Waterfox', None, 'Waterfox/Waterfox', 'Waterfox'),
    BrowserEntry('Librewolf', 'librewolf', 'LibreWolf', 'io.gitlab.librewolf-community', 'librewolf', 'librewolf'),
    BrowserEntry('Glide', 'glide-browser', 'Glide', None, None, None,
                 install_names=['glide-browser', 'glide'])
]

def get_profiles(path):
    profiles = []
    for entry in sorted(os.listdir(path)):
        if not os.path.isdir(f'{path}/{entry}'):
            continue

        if '.' in entry:
            profiles.append(f'{path}/{entry}')

    return profiles

def _collect_unix_profiles(browser: BrowserEntry):
    """Gathers profiles from every existing root. Returns (profile_paths, roots_used)."""
    profiles = []
    roots_used = []
    seen = set()

    for root in _unix_profile_roots(browser):
        for candidate in (root, f'{root}/Profiles'):
            if not os.path.isdir(candidate):
                continue

            found = get_profiles(candidate)
            if not found:
                continue

            roots_used.append(candidate)
            for profile in found:
                real = os.path.realpath(profile)
                if real in seen:
                    continue
                seen.add(real)
                profiles.append(profile)

    return profiles, roots_used

def prompt_for_path(message):
    while True:
        user_input = input(f"{message}\nFile path (type 'exit' to quit): ").strip()
        if user_input.lower() == 'exit':
            sys.exit(0)
        user_input = os.path.expanduser(user_input)
        if os.path.exists(user_input):
            return user_input
        print("Path does not exist. Please try again.")

def select_browser():
    print('Select the browser to install Natsumi to:')
    for idx, browser in enumerate(browsers):
        print(f"{idx+1}. {browser.name}")
    while True:
        try:
            choice = int(input()) - 1
            if choice < 0 or choice >= len(browsers):
                raise ValueError()
            return browsers[choice]
        except ValueError:
            print(f'Invalid input. Please choose a number between 1 and {len(browsers)}.')
        except KeyboardInterrupt:
            sys.exit(0)

def detect_install_and_profiles(browser):
    install_path = None
    profile_paths = []
    roots_used = []

    if sys.platform == 'darwin':
        install_path = f'/Applications/{browser.name_macos}.app/Contents/Resources'
        try:
            roots_used = [_get_macos_path(browser)]
            profile_paths = get_profiles(roots_used[0])
        except NotADirectoryError:
            pass
    elif IS_POSIX:
        install_path = _find_unix_install(browser)
        profile_paths, roots_used = _collect_unix_profiles(browser)
    else:
        raise NotImplementedError('Unsupported platform')

    debug(f"Detected install_path: {install_path}")
    debug(f"Detected profile roots: {roots_used}")
    debug(f"Detected profiles: {profile_paths}")

    if not install_path or not os.path.isdir(install_path):
        if sys.platform == 'darwin':
            os_specific_instructions = "On macOS, this would be /path/to/Browser.app/Contents/Resources."
        else:
            os_specific_instructions = f"On {sys.platform.rstrip('0123456789').capitalize()}, this would be the folder the browser's binary is located in."

        install_path = prompt_for_path(
            f"Could not detect install location for {browser.name}. Please enter the browser's install location.\n{os_specific_instructions}"
        )
        debug(f"User provided install_path: {install_path}")

    if not profile_paths:
        print(f"No profiles found for {browser.name}.")

        if sys.platform == 'darwin':
            os_specific_instructions = "On macOS, this would usually be /Users/user/Library/Application Support/Browser/Profiles."
        else:
            os_specific_instructions = (
                "This is the folder containing your profile folders and profiles.ini,\n"
                "e.g. ~/.config/mozilla/firefox or ~/.mozilla/firefox."
            )

        while not profile_paths:
            profile_root = prompt_for_path(
                f"Please enter a valid profile directory for {browser.name}.\n{os_specific_instructions}"
            )
            debug(f"User provided profile_root: {profile_root}")
            if os.path.isdir(profile_root):
                profile_paths = get_profiles(profile_root)
            if not profile_paths:
                print(f"No profiles found in {profile_root}.")

    return install_path, profile_paths

def _chown_tree(path, uid, gid):
    os.chown(path, uid, gid)
    for root, dirs, files in os.walk(path):
        for name in dirs + files:
            try:
                os.chown(os.path.join(root, name), uid, gid, follow_symlinks=False)
            except OSError:
                pass

def main():
    print('Welcome to the Natsumi installer! >w<')

    browser = select_browser()
    install_path, profile_paths = detect_install_and_profiles(browser)

    print('Select the profile to install Natsumi to:')
    for idx, profile in enumerate(profile_paths):
        print(f"{idx+1}. {profile}")
    while True:
        try:
            choice = int(input()) - 1
            if choice < 0 or choice >= len(profile_paths):
                raise ValueError()
            profile = profile_paths[choice]
            break
        except ValueError:
            print(f'Invalid input. Please choose a number between 1 and {len(profile_paths)}.')
        except KeyboardInterrupt:
            sys.exit(0)

    print('Select the version to install:')

    version_keys = ['version', 'version_rc', 'version_beta', 'version_alpha']
    version_keys_text = {
        'version': 'Stable',
        'version_rc': 'Release Candidate',
        'version_beta': 'Beta',
        'version_alpha': 'Alpha'
    }
    installable_versions = []
    for version_key in version_keys:
        version = installer_data["package"].get(version_key)
        if version:
            installable_versions.append(version)
        else:
            continue
        print(f'{len(installable_versions)}. {version} ({version_keys_text[version_key]})')

    while True:
        try:
            choice = int(input()) - 1

            if choice < 0 or choice >= len(installable_versions):
                raise ValueError()

            break
        except ValueError:
            print(f'Invalid input. Please choose a number between 1 and {len(installable_versions)}.')
        except KeyboardInterrupt:
            sys.exit(0)

    version_to_install = installable_versions[choice]

    # Create temporary directory
    current_dir = os.getcwd()
    if not os.path.exists(f'{current_dir}/.natsumi-installer'):
        os.mkdir(f'{current_dir}/.natsumi-installer')

    # Get fx-autoconfig install status
    fx_autoconfig_installed = False
    if os.path.isfile(f'{install_path}/config.js') and os.path.isdir(f'{install_path}/defaults'):
        fx_autoconfig_installed = True

    # Writing into the browser's install directory needs elevated permissions only if we can't write there.
    # (Works the same on Linux, FreeBSD, macOS and for user-owned installs like Flatpak.)
    if not fx_autoconfig_installed and not os.access(install_path, os.W_OK) and not get_admin():
        print(f'Administrator privileges are required to install fx-autoconfig to {install_path}.')
        print('Please run the installer again using sudo/doas.')
        sys.exit(1)

    if not os.path.exists(f'{profile}/chrome'):
        os.mkdir(f'{profile}/chrome')

    fx_autoconfig_profile_installed = False
    if os.path.isdir(f'{profile}/chrome/utils'):
        fx_autoconfig_profile_installed = True

    fx_autoconfig_downloaded = False
    sine_support = False

    print("Natsumi will now be installed. Please read the following before proceeding:")
    print(risk_string)
    print("If you have read the above and agree to the terms, type 'y' to continue.")
    confirm = input().lower() == "y"

    if not confirm:
        sys.exit(1)

    if not fx_autoconfig_installed:
        print('Installing fx-autoconfig...')
        try:
            download_from_git('greeeen-dev/fx-autoconfig', 'master', 'fx-autoconfig')
        except:
            print('Failed to clone fx-autoconfig repository.')
            raise

        fx_autoconfig_downloaded = True

        print('Copying fx-autoconfig browser files...')

        # Copy config.js
        shutil.copyfile('.natsumi-installer/fx-autoconfig/program/config.js', f'{install_path}/config.js')

        # Create default prefs directories if it doesn't exist
        os.makedirs(f'{install_path}/defaults', exist_ok=True)
        os.makedirs(f'{install_path}/defaults/pref', exist_ok=True)

        # Copy fx-autoconfig files
        if "librewolf.cfg" in os.listdir(install_path):
            # Assume we're on LibreWolf
            profile_root = f'{profile}/..'
            if sys.platform == 'darwin':
                # We need to copy this to ~/.librewolf for some odd reason?
                os.makedirs(f'{home}/.librewolf', exist_ok=True)
                profile_root = f'{home}/.librewolf'

            shutil.copyfile('.natsumi-installer/fx-autoconfig/program/config.js', f'{profile_root}/librewolf.overrides.cfg')
            shutil.copy('.natsumi-installer/fx-autoconfig/program/defaults/pref/config-prefs-librewolf.js', f'{install_path}/defaults/pref/config-prefs.js')
        else:
            shutil.copy('.natsumi-installer/fx-autoconfig/program/defaults/pref/config-prefs.js', f'{install_path}/defaults/pref/config-prefs.js')
    if not fx_autoconfig_profile_installed:
        if not fx_autoconfig_downloaded:
            print('Installing fx-autoconfig...')

            try:
                download_from_git('greeeen-dev/fx-autoconfig', 'master', 'fx-autoconfig')
            except:
                print('Failed to clone fx-autoconfig repository.')
                raise

        print('Copying fx-autoconfig profile files...')
        shutil.copytree('.natsumi-installer/fx-autoconfig/profile/chrome/CSS', f'{profile}/chrome/CSS', dirs_exist_ok=True)
        shutil.copytree('.natsumi-installer/fx-autoconfig/profile/chrome/utils', f'{profile}/chrome/utils', dirs_exist_ok=True)
        shutil.copytree('.natsumi-installer/fx-autoconfig/profile/chrome/resources', f'{profile}/chrome/resources', dirs_exist_ok=True)

        if os.path.isdir(f'{profile}/chrome/JS'):
            print('A JS folder already exists in your profile. The installer will copy Natsumi Append files to there.')
            sine_support = True

    print('Installing Natsumi...')
    try:
        download_from_git('greeeen-dev/natsumi-browser', f'v{version_to_install}', 'natsumi', is_tag=True)
    except:
        print('Failed to clone Natsumi repository.')
        raise

    if os.path.exists(f'{profile}/chrome/natsumi'):
        print('Removing existing Natsumi installation...')
        shutil.rmtree(f'{profile}/chrome/natsumi')

    shutil.copytree('.natsumi-installer/natsumi/natsumi', f'{profile}/chrome/natsumi', dirs_exist_ok=True)

    # Back up original userChrome files
    try:
        shutil.copy(f'{profile}/chrome/userChrome.css', f'{profile}/chrome/userChrome.css.bak')
    except FileNotFoundError:
        pass
    try:
        shutil.copy(f'{profile}/chrome/userContent.css', f'{profile}/chrome/userContent.css.bak')
    except FileNotFoundError:
        pass

    shutil.copy('.natsumi-installer/natsumi/userChrome.css', f'{profile}/chrome/userChrome.css')
    shutil.copy('.natsumi-installer/natsumi/userContent.css', f'{profile}/chrome/userContent.css')

    if sine_support:
        for file in os.listdir('.natsumi-installer/natsumi/natsumi/scripts'):
            if file.endswith('.js') or file.endswith('.mjs'):
                shutil.copy(f'.natsumi-installer/natsumi/natsumi/scripts/{file}', f'{profile}/chrome/JS/{file}')
    else:
        with open(f'{profile}/chrome/utils/chrome.manifest', 'w+') as file:
            file.write('\n'.join(chrome_manifest))

    if get_admin():
        # Hand the chrome folder back to whoever owns the profile (works with sudo, doas, su...)
        print('Fixing permissions...')
        profile_stat = os.stat(profile)
        _chown_tree(f'{profile}/chrome', profile_stat.st_uid, profile_stat.st_gid)

    print('Natsumi installed successfully! ^w^')

if __name__ == '__main__':
    should_prompt_exit = True
    if sys.platform == 'win32':
        print('This installer only works for Unix and Unix-like operating systems. Please use the Windows installer instead.')
    elif not (sys.platform == 'darwin' or IS_POSIX):
        print(f'Unsupported platform: {sys.platform}')
    else:
        try:
            main()
            if os.path.exists('.natsumi-installer'):
                shutil.rmtree('.natsumi-installer')
        except KeyboardInterrupt:
            if os.path.exists('.natsumi-installer'):
                shutil.rmtree('.natsumi-installer')
            should_prompt_exit = False
        except SystemExit:
            if os.path.exists('.natsumi-installer'):
                shutil.rmtree('.natsumi-installer')
            should_prompt_exit = False
        except:
            if os.path.exists('.natsumi-installer'):
                shutil.rmtree('.natsumi-installer')
            traceback.print_exc()

    if should_prompt_exit:
        print('Press enter to exit:')
        input()
