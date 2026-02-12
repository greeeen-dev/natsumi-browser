@echo off
setlocal EnableDelayedExpansion

:: ============================================================================
:: Natsumi Browser Installer - Specific File Map
:: ============================================================================

cd /d "%~dp0"

:: --- SAFEGUARD VARIABLES ---
set "PF86=%ProgramFiles(x86)%"
set "PF64=%ProgramFiles%"
set "L_APP=%LOCALAPPDATA%"
set "L_PROGS=%LOCALAPPDATA%\Programs"

:: --- STEP 0: ADMIN CHECK ---
net session >nul 2>&1
if %errorLevel% == 0 (
    echo [INFO] Running with Administrative privileges.
) else (
    echo [WARN] Requesting Administrative privileges...
    powershell -Command "Start-Process cmd -ArgumentList '/c, \"\"%~f0\"\"' -Verb RunAs"
    exit /b
)

:: --- STEP 0.5: GIT CHECK ---
where git >nul 2>&1
if %errorLevel% neq 0 (
    echo [ERROR] Git is not installed.
    pause
    exit /b
)

:: Temp Dir
set "TEMP_DIR=%TEMP%\natsumi-installer-temp"
if exist "%TEMP_DIR%" rd /s /q "%TEMP_DIR%"
mkdir "%TEMP_DIR%"

echo.
echo ==================================================
echo       NATSUMI BROWSER INSTALLER (WINDOWS)
echo ==================================================
echo.

:: --- STEP 1: ADVANCED BROWSER DETECTION ---
echo [STEP 1] Scanning system for installed browsers...
echo.

set "COUNT=0"

:: 1. FIREFOX
call :DetectBrowser "Mozilla Firefox" "firefox.exe" "Mozilla\Firefox" "Mozilla Firefox"
:: 2. FLOORP
call :DetectBrowser "Floorp" "floorp.exe" "Floorp" "Floorp"
:: 3. WATERFOX
call :DetectBrowser "Waterfox" "waterfox.exe" "Waterfox" "Waterfox"
:: 4. LIBREWOLF
call :DetectBrowser "LibreWolf" "librewolf.exe" "LibreWolf" "LibreWolf"

if %COUNT%==0 (
    echo [WARN] No browsers detected via Registry or Standard Paths.
    echo You will need to manually enter paths.
    set "USE_MANUAL=1"
) else (
    for /L %%i in (1,1,%COUNT%) do (
        echo %%i. !NAME_%%i!
    )
    echo.
    set /a MANUAL_OPT=%COUNT%+1
    echo !MANUAL_OPT!. Manual Selection (Custom Path^)
    echo.
    set /p "SELECTION=Select a browser (1-!MANUAL_OPT!): "
)

if "%SELECTION%"=="!MANUAL_OPT!" set "USE_MANUAL=1"

if "%USE_MANUAL%"=="1" (
    echo.
    echo --- Manual Configuration ---
    set /p "FINAL_INSTALL_PATH=Enter full path to browser install folder (containing .exe): "
    set "BROWSER_NAME=Custom"
    set "PROFILE_ROOT_PATH=Mozilla\Firefox"
    set "EXE_NAME=firefox.exe"
) else (
    set "FINAL_INSTALL_PATH=!PATH_%SELECTION%!"
    set "BROWSER_NAME=!NAME_%SELECTION%!"
    set "PROFILE_ROOT_PATH=!PROF_%SELECTION%!"
    set "EXE_NAME=!EXE_%SELECTION%!"
)

:: Check if running
tasklist /FI "IMAGENAME eq %EXE_NAME%" 2>NUL | find /I /N "%EXE_NAME%">NUL
if "!ERRORLEVEL!"=="0" (
    echo.
    echo [WARN] %EXE_NAME% is running.
    echo Please close it to ensure files can be replaced safely.
    echo Press any key once the browser is closed...
    pause >nul
)

:: --- STEP 2: PROFILE LOCATION ---
echo.
echo [STEP 2] Detecting Profiles for %BROWSER_NAME%...

set "FF_APPDATA=%APPDATA%\%PROFILE_ROOT_PATH%\Profiles"
set "P_COUNT=0"

if not exist "%FF_APPDATA%" (
    echo [WARN] Could not find profiles at: %FF_APPDATA%
    set /p "TARGET_PROFILE=Please enter full path to the Profile folder: "
) else (
    echo.
    for /d %%D in ("%FF_APPDATA%\*") do (
        set /a P_COUNT+=1
        set "PROFILE_!P_COUNT!=%%D"
        echo !P_COUNT!. %%~nxD
    )
    echo.
    set /p "PROF_CHOICE=Select your profile (Number): "
    
    for %%I in (!PROF_CHOICE!) do set "TARGET_PROFILE=!PROFILE_%%I!"
)

if not exist "%TARGET_PROFILE%" (
    echo [ERROR] Invalid profile path.
    pause
    exit /b
)

:: --- STEP 3: VERSION SELECTION ---
echo.
echo [STEP 3] Select Natsumi Version
echo.
echo 1. Stable (Main branch, recommended)
echo 2. Alpha/Beta/RC (Dev branch, experimental)
echo.
set /p "VER_CHOICE=Enter choice (1 or 2): "

if "%VER_CHOICE%"=="2" (
    set "NATSUMI_BRANCH=dev"
    echo [INFO] Selected Alpha version (Branch: dev^)
) else (
    set "NATSUMI_BRANCH=main"
    echo [INFO] Selected Beta/Stable version (Branch: main^)
)

:: --- STEP 3.5: RISK ACKNOWLEDGEMENT ---
echo.
echo Natsumi will now be installed. Please read the following before proceeding:
echo.
echo Natsumi is provided "as-is" without any warranties. By installing and using Natsumi, you agree
echo to the GPLv3 software license found in the LICENSE file in the repository. You are responsible for
echo any damages or issues that may arise from using Natsumi and you agree not to hold the developers
echo liable for any such damages or issues.
echo.
echo Additionally, Natsumi uses fx-autoconfig to apply JS scripts to your browser. If your system is
echo infected with malware, installing Natsumi may put your browser data at higher risk of being accessed
echo maliciously. Please ensure your system is secure before proceeding with installation.
echo.
echo If you have read the above and agree to the terms, type 'y' to continue.
echo.
set /p "VER_CHOICE=Confirm (y): "

if "%VER_CHOICE%"=="y" (
    echo [INFO] Proceeding with installation...
) else (
    pause
    exit /b
)

:: --- STEP 4: CLONE ---
echo.
echo [STEP 4] Downloading files...
cd /d "%TEMP_DIR%" || exit /b

echo Cloning Natsumi Browser (%NATSUMI_BRANCH%)...
git clone -b %NATSUMI_BRANCH% --depth 1 --single-branch https://github.com/greeeen-dev/natsumi-browser.git natsumi
if %errorlevel% neq 0 ( 
    echo [ERROR] Git Clone failed. Check if branch '%NATSUMI_BRANCH%' exists and you've installed Git.
    pause 
    exit /b 
)

echo Cloning FX-AutoConfig...
git clone https://github.com/MrOtherGuy/fx-autoconfig.git fx-autoconfig
if %errorlevel% neq 0 ( echo [ERROR] Git Clone failed. & pause & exit /b )

:: --- STEP 5: PROFILE INSTALL ---
echo.
echo [STEP 5] Installing to Profile...
set "CHROME_DIR=%TARGET_PROFILE%\chrome"
echo Target Profile: "%CHROME_DIR%"
echo.

if not exist "%CHROME_DIR%" (
    echo    [CREATE] Creating chrome directory...
    mkdir "%CHROME_DIR%"
)

:: Backup CSS
if exist "%CHROME_DIR%\userChrome.css" (
    echo    [BACKUP] Existing userChrome.css found. Renaming to .bak
    copy /y "%CHROME_DIR%\userChrome.css" "%CHROME_DIR%\userChrome.css.bak" >nul
)
if exist "%CHROME_DIR%\userContent.css" (
    echo    [BACKUP] Existing userContent.css found. Renaming to .bak
    copy /y "%CHROME_DIR%\userContent.css" "%CHROME_DIR%\userContent.css.bak" >nul
)

:: Clean Natsumi Folder
if exist "%CHROME_DIR%\natsumi" (
    echo    [CLEAN] Removing old 'natsumi' system folder...
    rd /s /q "%CHROME_DIR%\natsumi"
)

:: --- NATSUMI FILES ---
echo    [COPY] Installing 'natsumi' folder...
xcopy /E /I /Y /Q "%TEMP_DIR%\natsumi\natsumi" "%CHROME_DIR%\natsumi" >nul

echo    [COPY] Installing 'userChrome.css'...
copy /y "%TEMP_DIR%\natsumi\userChrome.css" "%CHROME_DIR%\" >nul

echo    [COPY] Installing 'userContent.css'...
copy /y "%TEMP_DIR%\natsumi\userContent.css" "%CHROME_DIR%\" >nul

if exist "%TEMP_DIR%\natsumi\natsumi-config.css" (
    echo    [COPY] Installing 'natsumi-config.css'...
    copy /y "%TEMP_DIR%\natsumi\natsumi-config.css" "%CHROME_DIR%\" >nul
) else (
    echo    [WARN] 'natsumi-config.css' not found in download. Skipping.
)

:: --- FX-AUTOCONFIG FILES ---

:: CSS
if exist "%TEMP_DIR%\fx-autoconfig\profile\chrome\CSS" (
    echo    [COPY] Installing 'CSS' folder...
    xcopy /E /I /Y /Q "%TEMP_DIR%\fx-autoconfig\profile\chrome\CSS" "%CHROME_DIR%\CSS" >nul
)

:: JS
if exist "%TEMP_DIR%\fx-autoconfig\profile\chrome\JS" (
    echo    [COPY] Installing 'JS' folder...
    xcopy /E /I /Y /Q "%TEMP_DIR%\fx-autoconfig\profile\chrome\JS" "%CHROME_DIR%\JS" >nul
) else (
    echo    [CREATE] Creating 'JS' folder ^(Empty in repo^)...
    if not exist "%CHROME_DIR%\JS" mkdir "%CHROME_DIR%\JS"
)

:: Resources
if exist "%TEMP_DIR%\fx-autoconfig\profile\chrome\resources" (
    echo    [COPY] Installing 'resources' folder...
    xcopy /E /I /Y /Q "%TEMP_DIR%\fx-autoconfig\profile\chrome\resources" "%CHROME_DIR%\resources" >nul
)

:: Utils
if exist "%TEMP_DIR%\fx-autoconfig\profile\chrome\utils" (
    echo    [COPY] Installing 'utils' folder...
    xcopy /E /I /Y /Q "%TEMP_DIR%\fx-autoconfig\profile\chrome\utils" "%CHROME_DIR%\utils" >nul
)

:: --- STEP 6: PROGRAM INSTALL ---
echo.
echo [STEP 6] Installing Program Files...
echo Target Browser Directory: "%FINAL_INSTALL_PATH%"
echo.

:: config.js
echo    [COPY] Attempting to copy config.js...
copy /y "%TEMP_DIR%\fx-autoconfig\program\config.js" "%FINAL_INSTALL_PATH%\"
if %errorlevel% neq 0 (
    echo.
    echo    [ERROR] Failed to copy config.js!
    echo    REASON: Access Denied.
    echo    SOLUTION: 
    echo    1. Ensure %BROWSER_NAME% is completely closed.
    echo    2. Ensure you ran this script as Administrator.
    echo.
    pause
)

:: defaults folder
echo.
echo    [COPY] Attempting to copy defaults folder...
:: Removed /Q (Quiet), Added /F (Full Path Display) to see what fails
xcopy /E /I /Y /F "%TEMP_DIR%\fx-autoconfig\program\defaults" "%FINAL_INSTALL_PATH%\defaults"
if %errorlevel% neq 0 (
    echo.
    echo    [ERROR] Failed to copy 'defaults' folder contents!
    echo    REASON: Access Denied on specific files above.
    echo    SOLUTION: Ensure the browser is closed. Some files might be locked.
    echo.
    pause
)
:: --- MANIFEST GENERATION ---
echo.
echo [INFO] Generating chrome.manifest in utils...
(
echo content userchromejs ./
echo content userscripts ../natsumi/scripts/
echo skin userstyles classic/1.0 ../CSS/
echo content userchrome ../resources/
echo content natsumi ../natsumi/
echo content natsumi-icons ../natsumi/icons/
) > "%CHROME_DIR%\utils\chrome.manifest"

:: --- FINISH ---
cd /d "%USERPROFILE%"
rd /s /q "%TEMP_DIR%"
echo.
echo ==================================================
echo           INSTALLATION COMPLETE
echo ==================================================
echo Please restart %BROWSER_NAME%.
pause
exit /b

:: ============================================================================
:: FUNCTION: DetectBrowser
:: Args: "PrettyName" "ExeName.exe" "ProfileFolder" "FolderSearchName"
:: ============================================================================
:DetectBrowser
set "d_name=%~1"
set "d_exe=%~2"
set "d_prof=%~3"
set "d_folder=%~4"
set "found_exe_path="

:: METHOD 1: REGISTRY CHECK
for /f "tokens=2*" %%A in ('reg query "HKLM\SOFTWARE\Microsoft\Windows\CurrentVersion\App Paths\%d_exe%" /ve 2^>nul') do (
    if exist "%%B" set "found_exe_path=%%B"
)
if not defined found_exe_path (
    for /f "tokens=2*" %%A in ('reg query "HKCU\Software\Microsoft\Windows\CurrentVersion\App Paths\%d_exe%" /ve 2^>nul') do (
        if exist "%%B" set "found_exe_path=%%B"
    )
)

:: METHOD 2: FILE SYSTEM SCAN
if not defined found_exe_path (
    if exist "%PF64%\%d_folder%\%d_exe%" set "found_exe_path=%PF64%\%d_folder%\%d_exe%"
    if not defined found_exe_path if defined PF86 if exist "!PF86!\%d_folder%\%d_exe%" set "found_exe_path=!PF86!\%d_folder%\%d_exe%"
    if not defined found_exe_path if exist "%L_APP%\%d_folder%\%d_exe%" set "found_exe_path=%L_APP%\%d_folder%\%d_exe%"
    if not defined found_exe_path if exist "%L_PROGS%\%d_folder%\%d_exe%" set "found_exe_path=%L_PROGS%\%d_folder%\%d_exe%"
)

:: REGISTER IF FOUND
if defined found_exe_path (
    set /a COUNT+=1
    set "NAME_!COUNT!=%d_name%"
    for %%F in ("!found_exe_path!") do set "TEMP_PATH=%%~dpF"
    set "TEMP_PATH=!TEMP_PATH:~0,-1!"
    set "PATH_!COUNT!=!TEMP_PATH!"
    set "PROF_!COUNT!=%d_prof%"
    set "EXE_!COUNT!=%d_exe%"
)
exit /b