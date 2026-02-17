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

home = str(Path.home())
data_path = str(Path(__file__).parent)

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

def get_admin():
    return os.geteuid() == 0

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
    def __init__(self, name, name_universal, name_macos, name_flatpak, name_windows, name_windows_binary):
        self.name = name
        self.name_universal = name_universal
        self.name_macos = name_macos
        self.name_flatpak = name_flatpak
        self.name_windows = name_windows
        self.name_windows_binary = name_windows_binary

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
    print(path)

    if not os.path.exists(path):
        raise NotADirectoryError('Browser is not installed')

    return path

def _get_linux_path(browser: BrowserEntry):
    browser_path = home + f'/.{browser.name_universal}'
    path = home + browser_path + '/Profiles'

    if os.path.exists(browser_path):
        if os.path.exists(path):
            return path

        else:
            if os.path.exists(browser_path):
                return browser_path

    raise NotADirectoryError('Browser is not installed')

def _get_flatpak_path(browser: BrowserEntry):
    if not browser.name_flatpak:
        raise NotADirectoryError('Browser does not support Flatpak')

    path = home + f'/.var/app/{browser.name_flatpak}/.{browser.name_universal}'

    if not os.path.exists(path):
        raise NotADirectoryError('Browser is not installed')

    return path

browsers = [
    BrowserEntry('Firefox', 'mozilla', 'Firefox', 'org.mozilla.firefox', 'Mozilla/Firefox', 'Mozilla Firefox'),
    BrowserEntry('Floorp', 'floorp', 'Floorp', None, 'Floorp', 'Floorp'),
    BrowserEntry('Waterfox', 'waterfox', 'Waterfox', None, 'Waterfox/Waterfox', 'Waterfox'),
    BrowserEntry('Librewolf', 'librewolf', 'LibreWolf', 'io.gitlab.librewolf-community', 'librewolf', 'librewolf'),
    BrowserEntry('Glide', 'glide-browser', 'Glide', None, None, None)
]

def get_profiles(path):
    profiles = []
    for entry in os.listdir(path):
        if not os.path.isdir(f'{path}/{entry}'):
            continue

        if '.' in entry:
            profiles.append(f'{path}/{entry}')

    return profiles

def prompt_for_path(message):
    while True:
        user_input = input(f"{message}\nFile path (type 'exit' to quit): ").strip()
        if user_input.lower() == 'exit':
            sys.exit(0)
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
    # Detect install path
    install_path = None
    profile_paths = []
    try:
        if sys.platform == 'darwin':
            install_path = f'/Applications/{browser.name_macos}.app/Contents/Resources'
            profile_root = _get_macos_path(browser)
        elif sys.platform.startswith('linux'):
            install_path = f'/usr/lib/{browser.name_universal}'
            try:
                profile_root = _get_linux_path(browser)
            except NotADirectoryError:
                if browser.name_flatpak:
                    try:
                        profile_root = _get_flatpak_path(browser)
                    except NotADirectoryError:
                        profile_root = None
                else:
                    profile_root = None
        else:
            raise NotImplementedError('Unsupported platform')
    except NotADirectoryError:
        profile_root = None

    print(f"[DEBUG] Detected install_path: {install_path}")
    print(f"[DEBUG] os.path.isdir(install_path): {os.path.isdir(install_path) if install_path else 'N/A'}")
    print(f"[DEBUG] Detected profile_root: {profile_root}")
    print(f"[DEBUG] os.path.isdir(profile_root): {os.path.isdir(profile_root) if profile_root else 'N/A'}")

    if not install_path or not os.path.isdir(install_path):
        if sys.platform == 'darwin':
            os_specific_instructions = "On macOS, this would be /path/to/Browser.app/Contents/Resources."
        else:
            os_specific_instructions = "On Linux, this would be the folder the browser's binary is located in."

        install_path = prompt_for_path(
            f"Could not detect install location for {browser.name}. Please enter the browser's install location.\n{os_specific_instructions}"
        )
        print(f"[DEBUG] User provided install_path: {install_path}")
        print(f"[DEBUG] os.path.isdir(install_path): {os.path.isdir(install_path)}")

    if not profile_root or not os.path.isdir(profile_root):
        profile_root = prompt_for_path(f"Could not detect profiles directory for {browser.name}.")
        print(f"[DEBUG] User provided profile_root: {profile_root}")
        print(f"[DEBUG] os.path.isdir(profile_root): {os.path.isdir(profile_root)}")

    # Get profiles
    profile_paths = get_profiles(profile_root)
    if not profile_paths:
        print(f"No profiles found in {profile_root}.")

        if sys.platform == 'darwin':
            os_specific_instructions = "On macOS, this would usually be /Users/user/Library/Application Support/Browser/Profiles."
        else:
            os_specific_instructions = "On Linux, this would be the parent folder to your profile folders (e.g. /home/user/.browser)."

        profile_root = prompt_for_path(
            f"Please enter a valid profile directory for {browser.name}.\n{os_specific_instructions}"
        )
        print(f"[DEBUG] User provided profile_root (no profiles): {profile_root}")
        print(f"[DEBUG] os.path.isdir(profile_root): {os.path.isdir(profile_root)}")
        profile_paths = get_profiles(profile_root)

    return install_path, profile_paths

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

    # For Flatpak, we may need to check if the user is running as root
    needs_sudo = False
    if browser.name_flatpak and '.var/app' in profile:
        # Check install location
        if os.path.isdir(f'/var/lib/flatpak/app/{browser.name_flatpak}'):
            needs_sudo = True
    elif sys.platform.startswith('linux'):
        # Check install location
        needs_sudo = True

    # Create temporary directory
    current_dir = os.getcwd()
    if not os.path.exists(f'{current_dir}/.natsumi-installer'):
        os.mkdir(f'{current_dir}/.natsumi-installer')

    # Get fx-autoconfig install status
    fx_autoconfig_installed = False
    if os.path.isfile(f'{install_path}/config.js') and os.path.isdir(f'{install_path}/defaults'):
        fx_autoconfig_installed = True

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
        if needs_sudo and not get_admin():
            print('Sudo/administrator is required to install Natsumi to this browser.')
            sys.exit(1)

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
                home_directory = os.getenv("HOME")
                os.makedirs(f'{home_directory}/.librewolf', exist_ok=True)
                profile_root = f'{home_directory}/.librewolf'

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
        print('Fixing permissions...')
        os.system(f'chown -R {os.environ["SUDO_USER"]} "{profile}/chrome"')

    print('Natsumi installed successfully! ^w^')

if __name__ == '__main__':
    should_prompt_exit = True
    if sys.platform == 'win32':
        print('This installer only works for macOS and Linux. Please use the Windows installer instead.')
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
