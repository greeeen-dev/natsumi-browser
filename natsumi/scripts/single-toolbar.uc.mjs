// ==UserScript==
// @include   main
// @ignorecache
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
import {
    customizationFilePath,
    enableCustomizableToolbar,
    resetCustomizableToolbar
} from "./single-toolbar-customization.sys.mjs";

class NatsumiSingleToolbarManager {
    constructor() {
        this.hoverTimeout = null;
        this.hoveredElements = 0;
    }

    init() {
        this.detectBookmarkHover();

        // Check if single toolbar is active
        let singleToolbarEnabled = false;
        if (ucApi.Prefs.get("natsumi.theme.single-toolbar").exists()) {
            singleToolbarEnabled = ucApi.Prefs.get("natsumi.theme.single-toolbar").value;
        }

        if (singleToolbarEnabled) {
            // Check if customization file exists
            IOUtils.exists(customizationFilePath).then((exists) => {
                if (!exists) {
                    enableCustomizableToolbar();
                }
            });
        }

        // Create observer for single toolbar pref
        Services.prefs.addObserver("natsumi.theme.single-toolbar", async () => {
            // Since the pref already exists, we don't need to check for its existence
            let singleToolbarEnabled = ucApi.Prefs.get("natsumi.theme.single-toolbar").value;

            if (singleToolbarEnabled) {
                await enableCustomizableToolbar();
            } else {
                await resetCustomizableToolbar();
            }
        });

        // Create observer for vertical tabs pref
        Services.prefs.addObserver("sidebar.verticalTabs", () => {
            let verticalTabsEnabled = ucApi.Prefs.get("sidebar.verticalTabs").value;

            // Deactivate single toolbar for horizontal tabs
            if (!verticalTabsEnabled) {
                ucApi.Prefs.set("natsumi.theme.single-toolbar", false);
            }
        });

        // Add event listeners for customization
        window.gNavToolbox.addEventListener("aftercustomization", () => {
            let singleToolbarEnabled = false;
            if (ucApi.Prefs.get("natsumi.theme.single-toolbar").exists()) {
                singleToolbarEnabled = ucApi.Prefs.get("natsumi.theme.single-toolbar").value;
            }

            if (!singleToolbarEnabled) {
                return;
            }

            enableCustomizableToolbar();
        })
        window.gNavToolbox.addEventListener("customizationready", () => {
            let singleToolbarEnabled = false;
            if (ucApi.Prefs.get("natsumi.theme.single-toolbar").exists()) {
                singleToolbarEnabled = ucApi.Prefs.get("natsumi.theme.single-toolbar").value;
            }

            if (!singleToolbarEnabled) {
                return;
            }

            resetCustomizableToolbar();
        });
    }

    setHover(isWindowButton = false) {
        let singleToolbarEnabled = false;
        if (ucApi.Prefs.get("natsumi.theme.single-toolbar").exists()) {
            singleToolbarEnabled = ucApi.Prefs.get("natsumi.theme.single-toolbar").value;
        }

        if (!singleToolbarEnabled) {
            this.hoveredElements = 0;
            document.body.removeAttribute("natsumi-bookmarks-hover");
            return;
        }

        if (isWindowButton) {
            let isNotMac = Services.appinfo.OS.toLowerCase() !== "darwin";
            let forcedLeft = false;

            if (ucApi.Prefs.get("natsumi.theme.force-window-controls-to-left").exists()) {
                forcedLeft = ucApi.Prefs.get("natsumi.theme.force-window-controls-to-left").value;
            }

            if ((isNotMac || forcedLeft) && isWindowButton) {
                return;
            }
        }

        if (this.hoverTimeout) {
            clearTimeout(this.hoverTimeout);
        }

        this.hoveredElements++;
        document.body.setAttribute("natsumi-bookmarks-hover", "");
    }

    removeHover(isWindowButton = false) {
        let singleToolbarEnabled = false;
        if (ucApi.Prefs.get("natsumi.theme.single-toolbar").exists()) {
            singleToolbarEnabled = ucApi.Prefs.get("natsumi.theme.single-toolbar").value;
        }

        if (!singleToolbarEnabled) {
            this.hoveredElements = 0;
            document.body.removeAttribute("natsumi-bookmarks-hover");
            return;
        }

        if (isWindowButton) {
            let isMac = Services.appinfo.OS.toLowerCase() !== "darwin";
            let forcedLeft = false;

            if (ucApi.Prefs.get("natsumi.theme.force-window-controls-to-left").exists()) {
                forcedLeft = ucApi.Prefs.get("natsumi.theme.force-window-controls-to-left").value;
            }

            if ((isMac || forcedLeft) && isWindowButton) {
                return;
            }
        }

        this.hoveredElements--;
        if (this.hoveredElements > 0) {
            return;
        } else if (this.hoveredElements < 0) {
            this.hoveredElements = 0;
        }

        this.hoverTimeout = setTimeout(() => {
            document.body.removeAttribute("natsumi-bookmarks-hover");
        }, 1000);
    }

    detectBookmarkHover() {
        let bookmarksToolbar = document.getElementById("PersonalToolbar");
        let windowButtonsContainer = document.querySelector("#PersonalToolbar .titlebar-buttonbox-container");

        if (!windowButtonsContainer) {
            let originalWindowButtonsContainer = document.querySelector(".titlebar-buttonbox-container");
            windowButtonsContainer = originalWindowButtonsContainer.cloneNode(true);
            bookmarksToolbar.appendChild(windowButtonsContainer);
        }

        if (bookmarksToolbar) {
            bookmarksToolbar.addEventListener("mouseover", (event) => {
                this.setHover();
            });
            bookmarksToolbar.addEventListener("mouseout", (event) => {
                this.removeHover();
            });
        }

        if (windowButtonsContainer) {
            windowButtonsContainer.addEventListener("mouseover", (event) => {
                console.log(event);
                this.setHover(true);
            });
            windowButtonsContainer.addEventListener("mouseout", (event) => {
                this.removeHover(true);
            });
        }
    }
}

if (!document.body.natsumiSingleToolbarManager) {
    document.body.natsumiSingleToolbarManager = new NatsumiSingleToolbarManager();
    document.body.natsumiSingleToolbarManager.init();
}
