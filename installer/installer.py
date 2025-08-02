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

import os
import ctypes
import sys
import shutil
from pathlib import Path

home = str(Path.home())

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

def main():
    print('Welcome to the Natsumi installer! >w<')
    print('Detecting browsers and profiles...')

    profiles = {}

    for browser in browsers:
        try:
            found_profiles = []

            if sys.platform == 'darwin':
                found_profiles.extend(get_profiles(_get_macos_path(browser)))
            elif sys.platform == 'win32':
                found_profiles.extend(get_profiles(_get_windows_path(browser)))
            elif sys.platform.startswith('linux'):
                try:
                    found_profiles.extend(get_profiles(_get_linux_path(browser)))
                except NotADirectoryError:
                    pass

                try:
                    found_profiles.extend(get_profiles(_get_flatpak_path(browser)))
                except NotADirectoryError:
                    pass
            else:
                raise NotImplementedError('Unsupported platform')

            if found_profiles:
                profiles[browser.name] = found_profiles
        except NotADirectoryError as e:
            pass

    if not profiles:
        print('No supported browsers found.')
        return

    print('Select the browser to install Natsumi to:')

    for index in range(len(profiles.keys())):
        print(f'{index+1}. {list(profiles.keys())[index]}')

    while True:
        try:
            choice = int(input()) - 1

            if choice < 0 or choice >= len(profiles):
                raise ValueError()

            break
        except ValueError:
            print(f'Invalid input. Please choose a number between 1 and {len(profiles)}.')
        except KeyboardInterrupt:
            sys.exit(0)

    browser_name = list(profiles.keys())[choice]
    browser = next(b for b in browsers if b.name == browser_name)

    print('Select the profile to install Natsumi to:')

    for index, profile in enumerate(profiles[browser_name]):
        print(f'{index+1}. {profile}')

    while True:
        try:
            choice = int(input()) - 1

            if choice < 0 or choice >= len(profiles[browser_name]):
                raise ValueError()

            break
        except ValueError:
            print(f'Invalid input. Please choose a number between 1 and {len(profiles[browser_name])}.')
        except KeyboardInterrupt:
            sys.exit(0)

    profile = profiles[browser_name][choice]

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

    if sys.platform == 'win32':
        print('Due to permissions issues, fx-autoconfig cannot be installed on Windows through the Natsumi Installer.')
        print('We will install the fx-autoconfig files for your profile, but you will have to install the browser files (program folder) manually.')
        print('More info: https://github.com/MrOtherGuy/fx-autoconfig?tab=readme-ov-file#setting-up-configjs-from-program-folder')

    if not fx_autoconfig_installed and not sys.platform == 'win32':
        if needs_sudo and not get_admin():
            print('Sudo/administrator is required to install Natsumi to this browser.')
            sys.exit(1)

        print('Installing fx-autoconfig...')
        code = os.system('git clone --depth 1 https://github.com/MrOtherGuy/fx-autoconfig.git .natsumi-installer/fx-autoconfig')
        if code != 0:
            print('Failed to clone fx-autoconfig repository.')
            sys.exit(1)

        fx_autoconfig_downloaded = True

        print('Copying fx-autoconfig browser files...')
        shutil.copyfile('.natsumi-installer/fx-autoconfig/program/config.js', f'{install_path}/config.js')
        shutil.copytree('.natsumi-installer/fx-autoconfig/program/defaults', f'{install_path}/defaults', dirs_exist_ok=True)
    if not fx_autoconfig_profile_installed:
        if not fx_autoconfig_downloaded:
            print('Installing fx-autoconfig...')

            code = os.system('git clone --depth 1 https://github.com/MrOtherGuy/fx-autoconfig.git .natsumi-installer/fx-autoconfig')
            if code != 0:
                print('Failed to clone fx-autoconfig repository.')
                sys.exit(1)

        print('Copying fx-autoconfig profile files...')
        shutil.copytree('.natsumi-installer/fx-autoconfig/profile/chrome/CSS', f'{profile}/chrome/CSS', dirs_exist_ok=True)
        shutil.copytree('.natsumi-installer/fx-autoconfig/profile/chrome/utils', f'{profile}/chrome/utils', dirs_exist_ok=True)
        shutil.copytree('.natsumi-installer/fx-autoconfig/profile/chrome/resources', f'{profile}/chrome/resources', dirs_exist_ok=True)

        if os.path.isdir(f'{profile}/chrome/JS'):
            print('A JS folder already exists in your profile. The installer will copy Natsumi Append files to there.')
            sine_support = True

    print('Installing Natsumi...')
    os.system('git clone --depth 1 https://github.com/greeeen-dev/natsumi-browser.git .natsumi-installer/natsumi')
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

    print('Natsumi installed successfully! ^w^')

if __name__ == '__main__':
    try:
        main()
        if os.path.exists('.natsumi-installer'):
            shutil.rmtree('.natsumi-installer')
    except:
        if os.path.exists('.natsumi-installer'):
            shutil.rmtree('.natsumi-installer')
        raise
