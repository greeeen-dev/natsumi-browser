// ==UserScript==
// @include   about:preferences*
// @include   about:settings*
// @ignorecache
// @loadOrder 11
// ==/UserScript==

/*

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

*/

import * as ucApi from "chrome://userchromejs/content/uc_api.sys.mjs";
import {NatsumiNotification} from "./notifications.sys.mjs";

let shortcutsMap = {
    "compactMode": {
        "name": "Compact Mode",
        "shortcuts": {
            "toggleCompactMode": {
                "name": "Toggle Compact Mode"
            },
            "toggleCompactSidebar": {
                "name": "Toggle Compact Sidebar"
            },
            "toggleCompactNavbar": {
                "name": "Toggle Compact Navbar"
            }
        }
    },
    "glimpse": {
        "name": "Glimpse",
        "shortcuts": {
            "closeGlimpse": {
                "name": "Close Glimpse Tab"
            },
            "graduateGlimpse": {
                "name": "Expand Glimpse Tab"
            },
            "cycleGlimpse": {
                "name": "Next Glimpse Tab"
            },
            "cycleGlimpseReverse": {
                "name": "Previous Glimpse Tab"
            },
            "toggleGlimpseChain": {
                "name": "Toggle Glimpse Chaining"
            },
            "initiateGlimpseChain": {
                "name": "Initiate Glimpse Chain"
            },
            "openGlimpseLauncher": {
                "name": "Open Glimpse Launcher"
            }
        }
    },
    "splitView": {
        "name": "Split View",
        "shortcuts": {
            "natsumiSplitTabs": {
                "name": "Split Tabs"
            },
            "natsumiUnsplitTabs": {
                "name": "Unsplit Tabs"
            }
        }
    },
    "navigation": {
        "name": "Navigation",
        "shortcuts": {
            "goBackKb": {
                "name": "Back"
            },
            "goBackKb2": {
                "name": "Back (alt)"
            },
            "goForwardKb": {
                "name": "Forward"
            },
            "goForwardKb2": {
                "name": "Forward (alt)"
            },
            "goHome": {
                "name": "Home"
            },
            "openFileKb": {
                "name": "Open File"
            },
            "key_reload": {
                "name": "Reload"
            },
            "key_reload_skip_cache": {
                "name": "Reload (override cache)"
            },
            "key_stop": {
                "name": "Stop"
            },
            "key_stop_mac": {
                "name": "Stop (macOS)"
            }
        }
    },
    "page": {
        "name": "Page Options",
        "shortcuts": {
            "copyCurrentUrl": {
                "name": "Copy Current URL"
            },
            "printKb": {
                "name": "Print"
            },
            "key_savePage": {
                "name": "Save Page As"
            },
            "key_fullZoomEnlarge": {
                "name": "Zoom In"
            },
            "key_fullZoomReduce": {
                "name": "Zoom Out"
            },
            "key_fullZoomReset": {
                "name": "Zoom Reset"
            }
        }
    },
    "editing": {
        "name": "Edit Controls",
        "shortcuts": {
            "key_copy": {
                "name": "Copy"
            },
            "key_cut": {
                "name": "Cut"
            },
            "key_paste": {
                "name": "Paste"
            },
            "key_selectAll": {
                "name": "Select All"
            },
            "key_undo": {
                "name": "Undo"
            },
            "key_redo": {
                "name": "Redo"
            }
        }
    },
    "search": {
        "name": "Search & Find",
        "shortcuts": {
            "key_search": {
                "name": "Focus Search"
            },
            "key_search2": {
                "name": "Focus Search (alt)"
            },
            "focusURLBar": {
                "name": "Focus Address Bar"
            },
            "key_find": {
                "name": "Find in This Page"
            },
            "key_findAgain": {
                "name": "Find Again"
            },
            "key_findPrevious": {
                "name": "Find Previous"
            }
        }
    },
    "windowsTabs": {
        "name": "Windows & Tabs",
        "shortcuts": {
            "key_close": {
                "name": "Close Tab"
            },
            "natsumiClearUnpinnedTabs": {
                "name": "Close Unpinned Tabs"
            },
            "key_closeWindow": {
                "name": "Close Window"
            },
            "key_selectTab1": {
                "name": "Select Tab 1"
            },
            "key_selectTab2": {
                "name": "Select Tab 2"
            },
            "key_selectTab3": {
                "name": "Select Tab 3"
            },
            "key_selectTab4": {
                "name": "Select Tab 4"
            },
            "key_selectTab5": {
                "name": "Select Tab 5"
            },
            "key_selectTab6": {
                "name": "Select Tab 6"
            },
            "key_selectTab7": {
                "name": "Select Tab 7"
            },
            "key_selectTab8": {
                "name": "Select Tab 8"
            },
            "key_selectLastTab": {
                "name": "Select Last Tab"
            },
            "key_toggleMute": {
                "name": "Mute/Unmute Tab"
            },
            "key_newNavigatorTab": {
                "name": "New Tab"
            },
            "key_newNavigator": {
                "name": "New Window"
            },
            "key_privatebrowsing": {
                "name": "New Private Window"
            },
            "toggleSidebarKb": {
                "name": "Toggle Sidebar"
            },
            "key_restoreLastClosedTabOrWindowOrSession": {
                "name": "Reopen last closed tab or window"
            },
            "key_undoCloseWindow": {
                "name": "Reopen last closed window"
            }
        }
    },
    "history": {
        "name": "History",
        "shortcuts": {
            "key_gotoHistory": {
                "name": "Show History Sidebar"
            },
            "key_sanitize": {
                "name": "Clear Recent History"
            },
            "key_sanitize_mac": {
                "name": "Clear Recent History (macOS)"
            }
        }
    },
    "bookmarks": {
        "name": "Bookmarks",
        "shortcuts": {
            "bookmarkAllTabsKb": {
                "name": "Bookmark All Tabs"
            },
            "addBookmarkAsKb": {
                "name": "Bookmark This Page"
            },
            "viewBookmarksSidebarKb": {
                "name": "Show Bookmarks Sidebar"
            },
            "viewBookmarksToolbarKb": {
                "name": "Toggle Bookmarks Toolbar"
            },
            "manBookmarkKb": {
                "name": "Show All Bookmarks in Library"
            }
        }
    },
    "tools": {
        "name": "Tools",
        "shortcuts": {
            "toggleNatsumiToolkit": {
                "name": "Toggle Toolkit"
            },
            "key_openDownloads": {
                "name": "Open Downloads"
            },
            "key_openAddons": {
                "name": "Open Add-ons Manager"
            },
            "key_screenshot": {
                "name": "Take a Screenshot"
            }
        }
    },
    "workspaces": {
        "name": "Workspaces",
        "browser": "floorp",
        "shortcuts": {
            "cycleWorkspaces": {
                "name": "Next Workspace"
            },
            "cycleWorkspacesReverse": {
                "name": "Previous Workspace"
            }
        }
    },
    "devtools": {
        "name": "Developer Tools",
        "shortcuts": {
            "key_toggleToolbox": {
                "name": "Toggle Developer Tools"
            },
            "key_webconsole": {
                "name": "Web Console"
            },
            "key_inspector": {
                "name": "Inspector"
            },
            "key_inspectorMac": {
                "name": "Inspector (macOS)"
            },
            "key_jsdebugger": {
                "name": "Debugger"
            },
            "key_netmonitor": {
                "name": "Network Monitor"
            },
            "key_styleeditor": {
                "name": "Style Editor"
            },
            "key_performance": {
                "name": "Performance"
            },
            "key_storage": {
                "name": "Storage"
            },
            "key_dom": {
                "name": "DOM Inspector"
            },
            "key_accessibility": {
                "name": "Accessibility"
            },
            "key_responsiveDesignMode": {
                "name": "Responsive Design View"
            }
        }
    },
    "other": {
        "name": "Other",
        "shortcuts": {
            "toggleBrowserLayout": {
                "name": "Toggle Browser Layout"
            },
            "toggleVerticalTabs": {
                "name": "Toggle Vertical Tabs"
            },
            "key_enterFullScreen": {
                "name": "Enter Full Screen"
            },
            "key_exitFullScreen": {
                "name": "Exit Full Screen"
            },
            "key_toggleReaderMode": {
                "name": "Toggle Reader Mode"
            }
        }
    }
}

// Respect browser-specific shortcuts
let browserType = "firefox";
if (ucApi.Prefs.get("natsumi.browser.type").exists) {
    browserType = ucApi.Prefs.get("natsumi.browser.type").value;
}

for (let categoryKey in shortcutsMap) {
    if (!shortcutsMap[categoryKey]["browser"]) {
        continue;
    }

    if (shortcutsMap[categoryKey]["browser"] !== browserType) {
        delete shortcutsMap[categoryKey];
    }
}

const shortcutXULString = `
    <div class="natsumi-shortcut-row">
        <div class="natsumi-shortcut-info">
            <div class="natsumi-shortcut-name"></div>
            <div class="natsumi-shortcut-keybind"></div>
        </div>
        <div class="natsumi-shortcut-conflict">
            <div class="natsumi-shortcut-conflict-label">
                When shortcuts conflict, Natsumi should:
            </div>
            <div class="natsumi-shortcut-conflict-selection">
                <div class="natsumi-shortcut-conflict-item" value="0">
                    <div class="natsumi-shortcut-conflict-item-icon"></div>
                    <div class="natsumi-shortcut-conflict-item-title">
                        Prefer browser
                    </div>
                    <div class="natsumi-shortcut-conflict-item-description">
                        When shortcuts conflict, the browser (or Natsumi) wins.
                    </div>
                </div>
                <div class="natsumi-shortcut-conflict-item" value="3" selected="">
                    <div class="natsumi-shortcut-conflict-item-icon"></div>
                    <div class="natsumi-shortcut-conflict-item-title">
                        Prefer website
                    </div>
                    <div class="natsumi-shortcut-conflict-item-description">
                        When shortcuts conflict, the website wins.
                    </div>
                </div>
                <div class="natsumi-shortcut-conflict-item" value="2">
                    <div class="natsumi-shortcut-conflict-item-icon"></div>
                    <div class="natsumi-shortcut-conflict-item-title">
                        Use both
                    </div>
                    <div class="natsumi-shortcut-conflict-item-description">
                        When shortcuts conflict, both the browser's and website's shortcuts are used.
                    </div>
                </div>
                <div class="natsumi-shortcut-conflict-item" value="1">
                    <div class="natsumi-shortcut-conflict-item-icon"></div>
                    <div class="natsumi-shortcut-conflict-item-title">
                        Use double tap
                    </div>
                    <div class="natsumi-shortcut-conflict-item-description">
                        Press once for the website's shortcut, twice for the browser's shortcut.
                    </div>
                </div>
            </div>
        </div>
    </div>
`

// Get window object
let browserWindow;
let preliminaryBrowserWindow;
for (let win of ucApi.Windows.getAll(true)) {
    // Assuming keyboard shortcuts are synced among all browser windows, we only need to look for one
    // window with the shortcuts manager
    if (win.document.body.natsumiKBSManager) {
        if (!preliminaryBrowserWindow) {
            preliminaryBrowserWindow = win;
        }

        if (win.document.hasFocus()) {
            browserWindow = win;
            break;
        }
    }
}

if (!browserWindow) {
    browserWindow = preliminaryBrowserWindow;
}

let availableShortcuts = Object.keys(browserWindow.gBrowser.ownerDocument.body.natsumiKBSManager.shortcuts);

class NatsumiShortcutsPrefPane {
    constructor() {
        this.initialized = false;
        this.selected = null;
        this.editing = false;
        this.editInterval = null;
        this.resetTimeout = null;
    }

    init() {
        if (this.initialized) {
            return;
        }

        let prefsPane = document.getElementById("mainPrefPane");

        // Create heading
        let shortcutsNode = convertToXUL(`
            <hbox id="natsumiShortcutsCategory" class="subcategory" data-category="paneNatsumiShortcuts" hidden="true">
                <html:h1>Customize Keyboard Shortcuts</html:h1>
                <div id="natsumi-shortcut-reset">Reset</div>
                <div id="natsumi-shortcut-import">Import</div>
                <div id="natsumi-shortcut-export">Export</div>
            </hbox>
        `);
        prefsPane.appendChild(shortcutsNode);

        // Set event handlers for import/export buttons
        let resetButton = document.getElementById("natsumi-shortcut-reset");
        let importButton = document.getElementById("natsumi-shortcut-import");
        let exportButton = document.getElementById("natsumi-shortcut-export");
        resetButton.addEventListener("click", () => {
            let currentResetButton = document.getElementById("natsumi-shortcut-reset");
            if (currentResetButton.hasAttribute("natsumi-confirm-reset")) {
                this.resetAllShortcuts();
                currentResetButton.removeAttribute("natsumi-confirm-reset");
                currentResetButton.textContent = "Reset";

                if (this.resetTimeout) {
                    clearTimeout(this.resetTimeout);
                    this.resetTimeout = null;
                }
            } else {
                currentResetButton.setAttribute("natsumi-confirm-reset", "");
                currentResetButton.textContent = "Confirm";

                this.resetTimeout = setTimeout(() => {
                    currentResetButton.removeAttribute("natsumi-confirm-reset");
                    currentResetButton.textContent = "Reset";
                }, 30000);
            }
        });
        importButton.addEventListener("click", () => {
            this.importShortcuts();
        })
        exportButton.addEventListener("click", () => {
            this.exportShortcuts();
        });

        // Create note for Floorp users
        let warningNodeString = `
            <groupbox id="natsumiKBSFloorpWarning" data-category="paneNatsumiShortcuts" hidden="true">
                <div class="natsumi-settings-info warning">
                    <div class="natsumi-settings-info-icon"></div>
                    <div class="natsumi-settings-info-text">
                        To customize native shortcuts, you can either customize them in
                        <html:a href="about:hub#/features/shortcuts">Floorp Hub</html:a> or disable Floorp's keyboard
                        shortcuts feature.
                    </div>
                </div>
            </groupbox>
        `
        if (ucApi.Prefs.get("natsumi.browser.type").exists()) {
            if (ucApi.Prefs.get("natsumi.browser.type").value === "floorp") {
                let warningFragment = convertToXUL(warningNodeString);
                prefsPane.appendChild(warningFragment);
            }
        }

        // Create container for each category
        for (let categoryKey in shortcutsMap) {
            const categoryName = shortcutsMap[categoryKey].name;
            const categoryShortcuts = shortcutsMap[categoryKey].shortcuts;
            const categoryId = categoryKey.charAt(0).toUpperCase() + categoryKey.slice(1);

            // Create groupbox
            let nodeString = `
                <groupbox id="natsumiKBS${categoryId}Group" data-category="paneNatsumiShortcuts" hidden="true">
                    <html:h2>$</html:h2>
                    <div class="natsumi-categorized-shortcuts-container"></div>
                </groupbox>
            `
            let categoryFragment = convertToXUL(nodeString);
            categoryFragment.querySelector("h2").textContent = categoryName;
            prefsPane.appendChild(categoryFragment);

            // Use actual element instead of document fragment
            let categoryNode = document.getElementById(`natsumiKBS${categoryId}Group`);
            let categoryShortcutsContainer = categoryNode.querySelector(".natsumi-categorized-shortcuts-container");

            // Add shortcuts to groupbox
            for (let shortcutKey in categoryShortcuts) {
                // Skip uncustomizable shortcuts
                if (!availableShortcuts.includes(shortcutKey)) {
                    continue;
                }

                // Get shortcuts object
                let shortcutObject = browserWindow.gBrowser.ownerDocument.body.natsumiKBSManager.shortcuts[shortcutKey];

                if (!shortcutObject) {
                    continue;
                }

                // Create document fragment for shortcut
                let shortcutFragment = convertToXUL(shortcutXULString);
                categoryShortcutsContainer.appendChild(shortcutFragment);

                // Use actual element instead of document fragment
                let shortcutNode = categoryShortcutsContainer.lastElementChild;

                // Set shortcuts info
                let shortcutNameNode = shortcutNode.querySelector(".natsumi-shortcut-name");

                shortcutNode.id = shortcutKey;
                shortcutNameNode.textContent = categoryShortcuts[shortcutKey].name;
                this.updateShortcutKeybindsDisplay(shortcutNode);
                this.updateShortcutConflictDisplay(shortcutNode);

                // Set native shortcut class
                if (shortcutObject.isNativeShortcut) {
                    shortcutNode.classList.add("native-shortcut");
                }
            }
        }

        // Add event listener for every shortcut
        let allShortcuts = prefsPane.querySelectorAll(".natsumi-shortcut-row");
        allShortcuts.forEach((shortcut) => {
            // Click to select
            shortcut.addEventListener("click", (event) => {
                const shouldNotTrigger = [
                    "natsumi-shortcut-conflict",
                    "natsumi-shortcut-conflict-selection",
                    "natsumi-shortcut-conflict-item"
                ]

                if (shouldNotTrigger.includes(event.target.className)) {
                    return;
                }

                this.selectShortcut(shortcut, event.target.className !== "natsumi-shortcut-keybind");
            });

            // Edit shortcut
            let keybindNode = shortcut.querySelector(".natsumi-shortcut-keybind");
            keybindNode.addEventListener("click", (event) => {
                this.toggleShortcutEdit(shortcut);
                event.stopPropagation();
            });

            // Change conflict mode
            let conflictItems = shortcut.querySelectorAll(".natsumi-shortcut-conflict-item");
            conflictItems.forEach((item) => {
                item.addEventListener("click", (event) => {
                    if (!this.selected || this.selected.id !== shortcut.id) {
                        return;
                    }

                    // Get shortcut object
                    let shortcutObject = browserWindow.gBrowser.ownerDocument.body.natsumiKBSManager.shortcuts[shortcut.id];
                    if (!shortcutObject) {
                        return;
                    }

                    // Create customization data
                    const customizationData = {
                        "customKeybinds": false,
                        "shortcutMode": parseInt(item.getAttribute("value"))
                    }

                    // Update shortcut mode
                    browserWindow.gBrowser.ownerDocument.body.natsumiKBSManager.updateShortcut(shortcut.id, customizationData);

                    // Update display
                    this.updateShortcutConflictDisplay(shortcut);

                    event.stopPropagation();
                });
            });
        });

        // Add listener for keypress events
        document.addEventListener("keydown", this.onKeyDown.bind(this));

        this.initialized = true;
    }

    async resetAllShortcuts() {
        await browserWindow.gBrowser.ownerDocument.body.natsumiKBSManager.resetAllShortcuts();
        this.reloadAllShortcuts();
    }

    async importShortcuts() {
        let uploadNode = document.createElement("input");
        uploadNode.type = "file";
        uploadNode.accept = ".json";
        uploadNode.style.display = "none";
        uploadNode.setAttribute("moz-accept", ".json");
        uploadNode.setAttribute("accept", ".json");
        uploadNode.click();

        let uploadTimeout;

        const filePromise = new Promise((resolve, reject) => {
            uploadNode.onchange = () => {
                if (uploadTimeout) {
                    clearTimeout(uploadTimeout);
                }

                const file = uploadNode.files[0];
                if (!file) {
                    reject("No file selected.");
                    return;
                }

                resolve(file);
            };

            uploadNode.onabort = () => {
                if (uploadTimeout) {
                    clearTimeout(uploadTimeout);
                }
                reject("User aborted import.");
            }

            uploadTimeout = setTimeout(() => {
                reject("Import timed out.");
            }, 120000);
        });

        let toLoad;

        try {
            const content = await filePromise;
            uploadNode.remove();
            const text = await content.text();
            toLoad = JSON.parse(text);
        } catch(e) {
            console.error("Could not retrieve shortcuts file:", e);
            return;
        }

        try {
            const importSuccess = await browserWindow.gBrowser.ownerDocument.body.natsumiKBSManager.replaceShortcuts(toLoad);

            if (!importSuccess) {
                console.error("Import failed: Shortcuts handler rejected data.");
                let notification = new NatsumiNotification(
                    "Could not import shortcuts.",
                    "The shortcuts handler rejected the imported data. Your old shortcuts are unchanged.",
                    "chrome://natsumi/content/icons/lucide/caution.svg",
                    10000,
                    "caution"
                );
                notification.addToContainer();
                return;
            }
        } catch(e) {
            console.error("Import failed:", e);
            let notification = new NatsumiNotification(
                "Something went wrong.",
                "Your shortcuts could not be imported due to an unexpected error.",
                "chrome://natsumi/content/icons/lucide/caution.svg",
                10000,
                "caution"
            );
            notification.addToContainer();
            return;
        }

        this.reloadAllShortcuts();

        let notification = new NatsumiNotification("Shortcuts imported successfully!", null, "chrome://natsumi/content/icons/lucide/download.svg");
        notification.addToContainer();
    }

    exportShortcuts() {
        const dataString = JSON.stringify(browserWindow.gBrowser.ownerDocument.body.natsumiKBSManager.shortcutCustomizationData, null, 4);
        const blob = new Blob([dataString], { type: "application/json" });
        const exportUrl = URL.createObjectURL(blob);
        let downloadNode = document.createElement("a");
        downloadNode.href = exportUrl;
        downloadNode.download = "natsumi-shortcuts.json";

        try {
            document.body.appendChild(downloadNode);
            downloadNode.click();
            let notification = new NatsumiNotification("Shortcuts exported successfully!", null, "chrome://natsumi/content/icons/lucide/upload.svg");
            notification.addToContainer();
        } catch(e) {
            console.error("Failed to export shortcuts data:", e);
        }

        downloadNode.remove();
        URL.revokeObjectURL(exportUrl);
    }

    reloadAllShortcuts() {
        for (let categoryKey in shortcutsMap) {
            const categoryShortcuts = shortcutsMap[categoryKey].shortcuts;

            for (let shortcutKey in categoryShortcuts) {
                // Skip uncustomizable shortcuts
                if (!availableShortcuts.includes(shortcutKey)) {
                    continue;
                }

                // Get shortcuts node
                let shortcutNode = document.getElementById(shortcutKey);
                this.updateShortcutKeybindsDisplay(shortcutNode);
                this.updateShortcutConflictDisplay(shortcutNode);
            }
        }
    }

    selectShortcut(shortcutElement, removeIfSelected = true) {
        if (this.selected === shortcutElement && !removeIfSelected) {
            return;
        }

        // Stop editing shortcut if another shortcut is selected
        if (this.editing) {
            this.toggleShortcutEdit(this.selected);
        }

        if (this.selected) {
            this.selected.removeAttribute("selected");
        }

        if (this.selected === shortcutElement) {
            this.selected = null;
            return;
        }

        this.selected = shortcutElement;
        this.selected.setAttribute("selected", "");
    }

    toggleShortcutEdit(shortcutElement) {
        if (this.editing) {
            this.editing = false;
            shortcutElement.removeAttribute("editing");
            clearInterval(this.editInterval);
            this.editInterval = null;
            browserWindow.gBrowser.ownerDocument.body.natsumiKBSManager.ignoreShortcutHandling(100);
            this.updateShortcutKeybindsDisplay(this.selected);
        } else {
            if (shortcutElement !== this.selected) {
                this.selectShortcut(shortcutElement, false);
            }

            this.editing = true;
            shortcutElement.setAttribute("editing", "");
            this.editInterval = setInterval(() => {
                browserWindow.gBrowser.ownerDocument.body.natsumiKBSManager.ignoreShortcutHandling(1100);
            }, 1000);
            this.updateShortcutKeybindsDisplay(this.selected, false, false, false, false, "");
        }
    }

    onKeyDown(event) {
        // Only handle events when editing a shortcut
        if (!this.editing) {
            return;
        }

        // Get key combo through shortcut manager
        const keyCombi = browserWindow.gBrowser.ownerDocument.body.natsumiKBSManager.getKeyCombination(event);

        const forbiddenKeys = [
            "meta",
            "control",
            "alt",
            "shift"
        ]

        // Assign if key is not forbidden
        let canAssign = !(forbiddenKeys.includes(keyCombi.key));

        // Check if modifier keys have been pressed
        const modifierPressed = keyCombi.meta || keyCombi.ctrl || keyCombi.alt || keyCombi.shift;

        // For all shortcuts, a modifier has to be pressed (unless a function key is used)
        if (!modifierPressed && keyCombi.key.startsWith("f")) {
            canAssign = !isNaN(parseInt(keyCombi.key.replace("f", "")))
        } else if (!modifierPressed) {
            canAssign = keyCombi.key === "backspace";
        }

        if (keyCombi.key === "escape" && !canAssign) {
            this.toggleShortcutEdit(this.selected);
        }

        if (this.selected && this.editing && canAssign) {
            // Check if conflicts exist
            let conflictShortcut = browserWindow.gBrowser.ownerDocument.body.natsumiKBSManager.checkConflicts(this.selected.id, keyCombi);

            if (conflictShortcut) {
                let conflictName = conflictShortcut;

                for (let categoryKey in shortcutsMap) {
                    const categoryShortcuts = shortcutsMap[categoryKey].shortcuts;

                    if (categoryShortcuts[conflictShortcut]) {
                        conflictName = categoryShortcuts[conflictShortcut].name;
                        break;
                    }
                }

                let notificationObject = new NatsumiNotification(
                    "This keybind cannot be used!",
                    `Conflicts with: ${conflictName}`,
                    "chrome://natsumi/content/icons/lucide/warning.svg",
                    10000,
                    "warning"
                )
                notificationObject.addToContainer();
                this.toggleShortcutEdit(this.selected);
                return;
            }

            let shortcutObject = browserWindow.gBrowser.ownerDocument.body.natsumiKBSManager.shortcuts[this.selected.id];
            let customizationData = {
                "customKeybinds": true,
                "meta": keyCombi.meta,
                "ctrl": keyCombi.ctrl,
                "alt": keyCombi.alt,
                "shift": keyCombi.shift,
                "key": keyCombi.key,
                "unregistered": false,
                "shortcutMode": shortcutObject.shortcutMode
            }

            // Unregister shortcut if backspace is pressed without modifiers
            if (keyCombi.key === "backspace" && !modifierPressed) {
                customizationData = {
                    "customKeybinds": false,
                    "unregistered": true,
                    "shortcutMode": shortcutObject.shortcutMode
                }
            }

            // Update shortcut
            let neverSaved = true;
            ucApi.Windows.forEach((browserDocument, browserWindow) => {
                if (browserDocument.body.natsumiKBSManager) {
                    browserDocument.body.natsumiKBSManager.updateShortcut(this.selected.id, customizationData, true, neverSaved);
                }
                neverSaved = false;
            });

            // Disable editing mode
            this.toggleShortcutEdit(this.selected);
        } else if (this.selected && this.editing) {
            this.updateShortcutKeybindsDisplay(this.selected, keyCombi.meta, keyCombi.ctrl, keyCombi.alt, keyCombi.shift, keyCombi.key);
        }
    }

    setShortcutKeybind(shortcutElement, event) {
        if (!this.selected || this.selected.id !== shortcutName) {
            return;
        }

        // Prevent propagation of event
        event.preventDefault();
        event.stopPropagation();
    }

    updateShortcutKeybindsDisplay(shortcutElement, metaOverride = null, ctrlOverride = null, altOverride = null,
                                  shiftOverride = null, keyOverride = null) {
        // Get shortcut object
        let shortcutObject = browserWindow.gBrowser.ownerDocument.body.natsumiKBSManager.shortcuts[shortcutElement.id];
        if (!shortcutObject) {
            return;
        }

        // String for key representation
        const keyString = `
            <div class="natsumi-shortcut-key" value="key"></div>
        `

        // Get keybinds display
        let keybindDisplay = shortcutElement.querySelector(".natsumi-shortcut-keybind");

        // Clear existing keybinds
        keybindDisplay.textContent = "";

        // If the shortcut is unassigned, display that instead (unless there's an override)
        let hasOverride = (
            (metaOverride !== null) ||
            (ctrlOverride !== null) ||
            (altOverride !== null) ||
            (shiftOverride !== null) ||
            (keyOverride !== null && keyOverride !== "")
        )

        if (shortcutObject.unregistered && !hasOverride) {
            let unassignedDisplay = document.createElement("div");
            unassignedDisplay.classList.add("natsumi-shortcut-unassigned");
            unassignedDisplay.textContent = "Not assigned";
            keybindDisplay.appendChild(unassignedDisplay);
            return;
        }

        // Display modifier keys
        if (ctrlOverride ?? shortcutObject.ctrl) {
            let ctrlKey = convertToXUL(keyString);
            keybindDisplay.appendChild(ctrlKey);

            // Get node instead of fragment
            let ctrlKeyNode = keybindDisplay.lastElementChild;
            ctrlKeyNode.setAttribute("value", "ctrl");
        }
        if (altOverride ?? shortcutObject.alt) {
            let altKey = convertToXUL(keyString);
            keybindDisplay.appendChild(altKey);

            // Get node instead of fragment
            let altKeyNode = keybindDisplay.lastElementChild;
            altKeyNode.setAttribute("value", "alt");
        }
        if (shiftOverride ?? shortcutObject.shift) {
            let shiftKey = convertToXUL(keyString);
            keybindDisplay.appendChild(shiftKey);

            // Get node instead of fragment
            let shiftKeyNode = keybindDisplay.lastElementChild;
            shiftKeyNode.setAttribute("value", "shift");
        }
        if (metaOverride ?? shortcutObject.meta) {
            let metaKey = convertToXUL(keyString);
            keybindDisplay.appendChild(metaKey);

            // Get node instead of fragment
            let metaKeyNode = keybindDisplay.lastElementChild;
            metaKeyNode.setAttribute("value", "meta");
        }

        const forbiddenKeys = [
            "meta",
            "control",
            "alt",
            "shift"
        ]

        if (keyOverride !== "") {
            if (keyOverride && forbiddenKeys.includes(keyOverride.toLowerCase())) {
                return;
            }

            // Display main key
            let keyKey = convertToXUL(keyString);
            keybindDisplay.appendChild(keyKey);

            // Get node instead of fragment
            let keyKeyNode = keybindDisplay.lastElementChild;
            keyKeyNode.textContent = keyOverride ? keyOverride.toUpperCase() : shortcutObject.key.toUpperCase();

            // Check if key can be substituted
            const substitutableKeys = [
                "enter",
                "escape",
                "back",
                "backspace",
                "delete",
                "space",
                "left",
                "up",
                "right",
                "down"
            ]

            if (substitutableKeys.includes(shortcutObject.key.toLowerCase()) || substitutableKeys.includes(keyOverride ? keyOverride.toLowerCase() : "")) {
                keyKeyNode.setAttribute("value", shortcutObject.key.toLowerCase());
                keyKeyNode.textContent = "";
            }

            // Convert icons to text for non-macOS systems
            if (Services.appinfo.OS.toLowerCase() !== "darwin") {
                const specialKeyMappings = {
                    "control": "Ctrl",
                    "cmd": "Meta",
                    "option": "Alt",
                    "shift": "Shift",
                    "enter": "Enter",
                    "escape": "Esc",
                    "back": "Backspace",
                    "backspace": "Backspace",
                    "delete": "Del"
                }

                let keyKeyNode = keybindDisplay.querySelectorAll('.natsumi-shortcut-key:not([value="key"])');

                keyKeyNode.forEach((node) => {
                    let value = node.getAttribute("value");
                    if (value in specialKeyMappings) {
                        node.textContent = specialKeyMappings[value];
                        node.setAttribute("value", "key");
                    }
                });
            }
        }
    }

    updateShortcutConflictDisplay(shortcutElement) {
        // Get shortcut object
        let shortcutObject = browserWindow.gBrowser.ownerDocument.body.natsumiKBSManager.shortcuts[shortcutElement.id];
        if (!shortcutObject) {
            return;
        }

        // Get keybinds display
        let conflictSelection = shortcutElement.querySelector(".natsumi-shortcut-conflict-selection");

        // Find selected value
        let selectedValue = shortcutObject.shortcutMode;
        let selectedNode = conflictSelection.querySelector(`.natsumi-shortcut-conflict-item[value="${selectedValue}"]`);

        // Clear existing selection
        let currentlySelected = conflictSelection.querySelector(".natsumi-shortcut-conflict-item[selected]");
        if (currentlySelected) {
            currentlySelected.removeAttribute("selected");
        }

        // Set selected value
        selectedNode.setAttribute("selected", "");
    }
}

function convertToXUL(node) {
    // noinspection JSUnresolvedReference
    return window.MozXULElement.parseXULToFragment(node);
}

function addToSidebar() {
    // noinspection JSUnresolvedReference
    gCategoryInits.set("paneNatsumiShortcuts", {
        _initted: true,
        init: () => {}
    });
}

if (window.addUnloadListener) {
    window.addUnloadListener(() => {
        // Unload settings panes.
        document.querySelectorAll("[data-category='paneNatsumiShortcuts']").forEach((el) => el.remove());

        // Unload pane handler.
        gCategoryInits.delete("paneNatsumiShortcuts");
    });
}

addToSidebar();
let natsumiShortcutsPrefPane = new NatsumiShortcutsPrefPane();
natsumiShortcutsPrefPane.init();
