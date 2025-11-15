// ==UserScript==
// @include   main
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

class NatsumiStatusBarHandler {
    constructor() {
        this.sidebarNode = null;
        this.statusBarNode = null;
        this.isWaterfox = false;
        this.disableStatusBar = false;
        this.sidebarObserver = null;
        this.statusBarObserver = null;
    }

    init() {
        let isFloorp = false;
        if (ucApi.Prefs.get("natsumi.browser.type").exists) {
            this.isWaterfox = ucApi.Prefs.get("natsumi.browser.type").value === "waterfox";
            isFloorp = ucApi.Prefs.get("natsumi.browser.type").value === "floorp";
        }

        if (isFloorp || this.isWaterfox) {
            this.initStatusBarHeightCopy();
        } else {
            this.disableStatusBar = true;
        }

        this.sidebarNode = document.getElementById("sidebar-main");
        this.sidebarObserver = new MutationObserver(() => {
            this.copySidebarWidth();
            this.copyStatusBarHeight();
            this.copyWindowButtonsWidth();

            // Copy sidebar options height if the shadow root exists
            let sidebarNodeSR = this.sidebarNode.shadowRoot;
            if (sidebarNodeSR) {
                this.copySidebarOptionsHeight();
            }
        });
        this.sidebarObserver.observe(this.sidebarNode, {attributes: true, attributeFilter: ["style", "sidebar-launcher-expanded", "sidebar-ongoing-animations"]});
    }

    initStatusBarHeightCopy() {
        if (this.statusBarObserver) {
            return;
        }

        this.statusBarNode = document.querySelector("#nora-statusbar");
        if (this.isWaterfox) {
            this.statusBarNode = document.querySelector("#status-bar");
        }

        if (this.statusBarNode) {
            this.statusBarObserver = new MutationObserver(() => {
                document.body.natsumiStatusBarHandler.copyStatusBarHeight();
            });

            this.statusBarObserver.observe(this.statusBarNode, {attributes: true, childList: true, subtree: true});
        }
    }

    copySidebarWidth() {
        // Only run this if vertical tabs are enabled
        if (!ucApi.Prefs.get("sidebar.verticalTabs").value) {
            return;
        }

        let sidebar = document.querySelector("#sidebar-main");

        // Usually the sidebar should always exist, but if it doesn't, we can just return
        if (!sidebar) {
            return;
        }

        let width = sidebar.style.width;

        if (!width || width.length === 0) {
            width = "242px";
        }

        document.body.style.setProperty("--natsumi-sidebar-width", width);
    }

    copySidebarOptionsHeight() {
        // The buttons strip is in a shadow root, so we'll need to do some more work here
        let sidebarNode = document.querySelector("#sidebar-main").querySelector("sidebar-main");
        let sidebarNodeSR = sidebarNode.shadowRoot;

        if (!sidebarNodeSR) {
            console.warn("Sidebar shadow root not found, likely needs to be ran later.");
            return;
        }

        let sidebarOptions = sidebarNodeSR.querySelector(".tools-and-extensions");

        if (!sidebarOptions) {
            return;
        }

        const height = sidebarOptions.offsetHeight;

        document.body.style.setProperty("--natsumi-sidebar-options-height", `${height}px`);
    }

    copyStatusBarHeight() {
        // Init status bar stuff if required
        this.initStatusBarHeightCopy();

        if (this.disableStatusBar) {
            return;
        }

        let sidebarNode = document.querySelector("#sidebar-main");

        if (!this.statusBarNode) {
            if (this.isWaterfox) {
                this.statusBarNode = document.querySelector("#status-bar");
            } else {
                this.statusBarNode = document.querySelector("#nora-statusbar");
            }

            if (!this.statusBarNode) {
                // It's still null so return
                return;
            }
        }

        // For some reason, offsetHeight is null but scrollHeight is correct.
        // Probably due to nora-statusbar having absolute position
        let height = this.statusBarNode.scrollHeight;

        sidebarNode.style.setProperty("--natsumi-statusbar-height", `${height}px`);
    }

    copyWindowButtonsWidth() {
        let windowButtonsNode = document.querySelector("#nav-bar .titlebar-buttonbox-container");

        if (!windowButtonsNode) {
            return;
        }

        const width = windowButtonsNode.getClientRects()[0].width + "px";

        let navBar = document.querySelector("#navigator-toolbox");

        if (navBar) {
            navBar.style.setProperty("--natsumi-window-buttons-width", width);
        }
    }
}

let sidebar = document.querySelector("#sidebar-main");
let isFloorp = false;
let isWaterfox = false;

if (ucApi.Prefs.get("natsumi.browser.type").exists) {
    isFloorp = ucApi.Prefs.get("natsumi.browser.type").value === "floorp";
    isWaterfox = ucApi.Prefs.get("natsumi.browser.type").value === "waterfox";
}

if (!document.body.natsumiStatusBarHandler) {
    document.body.natsumiStatusBarHandler = new NatsumiStatusBarHandler();
    document.body.natsumiStatusBarHandler.init();
}

if (!sidebar) {
    console.warn("Sidebar not found, trying to find it...");
    for (let i = 0; i < 10; i++) {
        sidebar = document.querySelector("#sidebar-main");

        // If the sidebar exists, we can stop searching
        if (sidebar) {
            break;
        }

        // Wait for 1s before trying again
        await new Promise(resolve => setTimeout(resolve, 1000));
    }
}

if (sidebar) {
    // If the sidebar exists, copy its width
    document.body.natsumiStatusBarHandler.copySidebarWidth();
    document.body.natsumiStatusBarHandler.copySidebarOptionsHeight();
    document.body.natsumiStatusBarHandler.copyWindowButtonsWidth();
}