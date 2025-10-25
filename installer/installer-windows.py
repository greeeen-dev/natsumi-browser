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
import ctypes
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

def get_admin():
    if sys.platform == 'win32':
        return ctypes.windll.shell32.IsUserAnAdmin() != 0
    else:
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
    BrowserEntry('Librewolf', 'librewolf', 'LibreWolf', 'io.gitlab.librewolf-community', 'librewolf', 'librewolf')
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
        user_input = input(f"{message}\nEnter the full path to the profiles directory or type 'exit' to quit: ").strip()
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
        elif sys.platform == 'win32':
            install_path = f'C:/Program Files/{browser.name_windows_binary}'
            profile_root = _get_windows_path(browser)
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
        install_path = prompt_for_path(f"Could not detect install location for {browser.name}.")
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
        profile_root = prompt_for_path(f"Please enter a valid profile directory for {browser.name}.")
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

    # Get browser install path
    if sys.platform == 'darwin':
        install_path = f'/Applications/{browser.name_macos}.app/Contents/Resources'
    elif sys.platform == 'win32':
        install_path = f'C:/Program Files/{browser.name_windows_binary}'
    elif sys.platform.startswith('linux'):
        if browser.name_flatpak and '.var/app' in profile:
            if needs_sudo:
                install_path = f'/var/lib/flatpak/app/{browser.name_flatpak}'
            else:
                install_path = f'.local/share/flatpak/app/{browser.name_flatpak}.current'
        else:
            install_path = f'/usr/lib/{browser.name_universal}'
    else:
        raise NotImplementedError('Unsupported platform')

    # Create temporary directory
    current_dir = os.getcwd()
    if not os.path.exists(f'{current_dir}/.natsumi-installer'):
        os.mkdir(f'{current_dir}/.natsumi-installer')

    if not os.path.exists(f'{profile}/chrome'):
        os.mkdir(f'{profile}/chrome')

    fx_autoconfig_profile_installed = False
    if os.path.isdir(f'{profile}/chrome/utils'):
        fx_autoconfig_profile_installed = True

    fx_autoconfig_downloaded = False
    sine_support = False

    if sys.platform == 'win32':
        print('Due to permissions issues, fx-autoconfig cannot be installed on Windows through the Natsumi Installer.')
        print('We will install the fx-autoconfig files for your profile, but you will have to install the browser files (program folder) manually.')
        print('More info: https://github.com/MrOtherGuy/fx-autoconfig?tab=readme-ov-file#setting-up-configjs-from-program-folder')

    if not fx_autoconfig_profile_installed:
        if not fx_autoconfig_downloaded:
            print('Installing fx-autoconfig...')

            try:
                download_from_git('MrOtherGuy/fx-autoconfig', 'master', 'fx-autoconfig')
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

    if not sys.platform == 'win32' and get_admin():
        print('Fixing permissions...')
        os.system(f'chown -R {os.environ["SUDO_USER"]} "{profile}/chrome"')

    print('Natsumi installed successfully! ^w^')

if __name__ == '__main__':
    try:
        main()
        if os.path.exists('.natsumi-installer'):
            shutil.rmtree('.natsumi-installer')
    except:
        if os.path.exists('.natsumi-installer'):
            shutil.rmtree('.natsumi-installer')
        traceback.print_exc()

    print('Press enter to exit:')
    input()
