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

class NatsumiSingleToolbarManager {
    constructor() {
        this.hoverTimeout = null;
        this.hoveredElements = 0;
    }

    init() {
        // Set up window control buttons
        let bookmarksToolbar = document.getElementById("PersonalToolbar");
        let originalWindowButtonsContainer = document.querySelector(".titlebar-buttonbox-container");
        let windowButtonsContainer = originalWindowButtonsContainer.cloneNode(true);
        bookmarksToolbar.appendChild(windowButtonsContainer);

        this.setupDetectBookmarkHover();
        this.extendBookmarksIfNeeded();

        // Create observer for vertical tabs pref
        Services.prefs.addObserver("sidebar.verticalTabs", () => {
            let verticalTabsEnabled = ucApi.Prefs.get("sidebar.verticalTabs").value;

            // Deactivate single toolbar for horizontal tabs
            if (!verticalTabsEnabled) {
                ucApi.Prefs.set("natsumi.theme.single-toolbar", false);
            }
        });

        let sidebarNode = document.getElementById("sidebar-main");
        if (!sidebarNode.hasAttribute("sidebar-launcher-expanded")) {
            ucApi.Prefs.set("natsumi.theme.single-toolbar", false);
        }

        // Create observer for sidebar
        const sidebarObserver = new MutationObserver(() => {
            let sidebarExpanded = sidebarNode.hasAttribute("sidebar-launcher-expanded");

            // Check if single toolbar is active
            let singleToolbarEnabled = false;
            if (ucApi.Prefs.get("natsumi.theme.single-toolbar").exists()) {
                singleToolbarEnabled = ucApi.Prefs.get("natsumi.theme.single-toolbar").value;
            }

            if (!sidebarExpanded && singleToolbarEnabled) {
                // Although re-expanding the sidebar would be best here, it may conflict with ongoing animations
                ucApi.Prefs.set("natsumi.theme.single-toolbar", false);
            }
        });
        sidebarObserver.observe(sidebarNode, {attributes: true, attributeFilter: ["sidebar-launcher-expanded"]});

        Services.prefs.addObserver("natsumi.theme.single-toolbar", () => {
            let singleToolbarEnabled = ucApi.Prefs.get("natsumi.theme.single-toolbar").value;
            let sidebarExpanded = sidebarNode.hasAttribute("sidebar-launcher-expanded");

            if (singleToolbarEnabled && !sidebarExpanded) {
                // Expand sidebar
                SidebarController.handleToolbarButtonClick();
            }
        });

        // Create observer for bookmarks bar hover pref
        Services.prefs.addObserver("natsumi.theme.show-bookmarks-on-hover", () => {
            this.extendBookmarksIfNeeded();
        });
        Services.prefs.addObserver("natsumi.theme.force-window-controls-to-left", () => {
            this.extendBookmarksIfNeeded();
        });
        Services.prefs.addObserver("sidebar.position_start", () => {
            this.extendBookmarksIfNeeded();
        });

        // Create event listeners for window
        window.addEventListener("willenterfullscreen", () => {
            this.extendBookmarksIfNeeded(true);
        })
        window.addEventListener("willexitfullscreen", () => {
            this.extendBookmarksIfNeeded(false);
        })
    }

    extendBookmarksIfNeeded(isFullScreen = null) {
        let hoverableBookmarksEnabled = false;
        let controlsInSidebar = false;
        const sidebarOnLeft = ucApi.Prefs.get("sidebar.position_start").value;
        const isMac = Services.appinfo.OS.toLowerCase() === "darwin";

        if (isFullScreen === null) {
            isFullScreen = document.documentElement.hasAttribute("inFullscreen");
        }

        if (ucApi.Prefs.get("natsumi.theme.show-bookmarks-on-hover").exists()) {
            hoverableBookmarksEnabled = ucApi.Prefs.get("natsumi.theme.show-bookmarks-on-hover").value;
        }
        if (ucApi.Prefs.get("natsumi.theme.force-window-controls-to-left").exists()) {
            controlsInSidebar = ucApi.Prefs.get("natsumi.theme.force-window-controls-to-left").value;
        }

        if (hoverableBookmarksEnabled) {
            document.body.removeAttribute("natsumi-bookmarks-extend");
            return;
        }

        if (isMac && !sidebarOnLeft && !controlsInSidebar && !isFullScreen) {
            document.body.setAttribute("natsumi-bookmarks-extend", "");
        } else if (!isMac && sidebarOnLeft && !controlsInSidebar) {
            document.body.setAttribute("natsumi-bookmarks-extend", "");
        } else {
            document.body.removeAttribute("natsumi-bookmarks-extend");
        }
    }

    canUseHoverable() {
        if (ucApi.Prefs.get("natsumi.theme.show-bookmarks-on-hover").exists()) {
            return ucApi.Prefs.get("natsumi.theme.show-bookmarks-on-hover").value;
        }

        return false;
    }

    setHover(isWindowButton = false) {
        if (!this.canUseHoverable()) {
            this.removeHover();
            return;
        }

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

            if (!this.canUseHoverable()) {
                return;
            }
        }

        this.hoverTimeout = setTimeout(() => {
            document.body.removeAttribute("natsumi-bookmarks-hover");
        }, 1000);
    }

    setupDetectBookmarkHover() {
        let bookmarksToolbar = document.getElementById("PersonalToolbar");
        let windowButtonsContainer = document.querySelector("#PersonalToolbar .titlebar-buttonbox-container");

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
