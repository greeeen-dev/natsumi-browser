// ==UserScript==
// @include   main
// @loadOrder 11
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

class NatsumiPanelSidebarHandler {
    constructor() {
        this.wasDisabled = false;
        this.hasPanelSidebarObserver = false;
        this.panelSidebarObserver = new MutationObserver(() => {
            this.getPanelSidebarState();
            this.copyPanelSidebarWidth();
        });
    }

    init() {
        let browser = document.getElementById("browser");
        if (browser) {
            Services.prefs.addObserver("floorp.panelSidebar.enabled", this.getPanelSidebarPosition.bind(this));
            Services.prefs.addObserver("floorp.panelSidebar.enabled", this.getPanelSidebarEnabled.bind(this));
            Services.prefs.addObserver("floorp.panelSidebar.config", this.getPanelSidebarPosition.bind(this));
        }

        this.updateSidebarRemoved();
        this.getPanelSidebarPosition();
        this.getPanelSidebarEnabled();

        // Set listener for panel sidebar state
        let rootObserver = new MutationObserver(() => {
            this.getPanelSidebarState();
            this.copyPanelSidebarWidth();
        })
        rootObserver.observe(document.documentElement, {attributes: true, attributeFilter: ["style"]});

        // Add event listener for web content and sidebar
        let browserBox = document.getElementById("tabbrowser-tabbox");
        let sidebarBox = document.getElementById("sidebar-box");
        browserBox.addEventListener("click", () => {this.handleBrowserClick()});
        sidebarBox.addEventListener("click", () => {this.handleBrowserClick()});

        // Add event listener for escape key press
        window.addEventListener("keydown", (event) => {
            if (event.key.toLowerCase() === "escape") {
                this.handleEscPress();
            }
        });
    }

    getPanelSidebarState() {
        let panelSidebarState = document.documentElement.style.getPropertyValue("--panel-sidebar-display");

        if (!panelSidebarState) {
            return;
        }

        if (panelSidebarState === "flex") {
            let panelSidebar = document.getElementById("panel-sidebar-box");

            if (!this.hasPanelSidebarObserver) {
                // Create observer
                this.panelSidebarObserver.observe(panelSidebar, {attributes: true, attributeFilter: ["style", "data-floating"]});
                this.hasPanelSidebarObserver = true;
            }

            // Get floating status
            const isFloating = panelSidebar.getAttribute("data-floating") === "true";

            document.body.setAttribute("natsumi-panel-sidebar-active", "");

            if (isFloating) {
                document.body.setAttribute("natsumi-panel-sidebar-floating", "");
            } else {
                document.body.removeAttribute("natsumi-panel-sidebar-floating");
            }
        } else {
            document.body.removeAttribute("natsumi-panel-sidebar-active");
            document.body.removeAttribute("natsumi-panel-sidebar-floating");
        }
    }

    getPanelSidebarEnabled() {
        let isEnabled = false;

        if (!this.wasDisabled) {
            if (ucApi.Prefs.get("floorp.panelSidebar.config").exists()) {
                if (ucApi.Prefs.get("floorp.panelSidebar.enabled").exists()) {
                    isEnabled = ucApi.Prefs.get("floorp.panelSidebar.enabled").value;
                } else {
                    isEnabled = true;
                }
            }
        }

        if (isEnabled) {
            document.body.setAttribute("natsumi-panel-sidebar-enabled", "");
        } else {
            document.body.removeAttribute("natsumi-panel-sidebar-enabled");
            this.hasPanelSidebarObserver = false;
        }
    }

    getPanelSidebarPosition() {
        if (this.wasDisabled) {
            // We cannot determine the position here, the panel sidebar likely doesn't exist
            return;
        }

        let isRight = false;
        if (ucApi.Prefs.get("floorp.panelSidebar.config").exists()) {
            const panelSidebarConfig = JSON.parse(ucApi.Prefs.get("floorp.panelSidebar.config").value);
            isRight = panelSidebarConfig["position_start"] ?? false;
        }

        isRight = isRight && !this.checkSidebarRemoved();

        if (isRight) {
            document.body.setAttribute("natsumi-panel-sidebar-on-right", "");
        } else {
            document.body.removeAttribute("natsumi-panel-sidebar-on-right");
        }
    }

    checkSidebarRemoved() {
        if (ucApi.Prefs.get("floorp.panelSidebar.enabled").exists()) {
            return !ucApi.Prefs.get("floorp.panelSidebar.enabled").value;
        }

        // This is enabled on Floorp by default, so we'd need to return false here
        return false;
    }

    copyPanelSidebarWidth() {
        let panelSidebar = document.getElementById("panel-sidebar-box");

        if (!panelSidebar) {
            console.warn("Panel Sidebar box not found, probably not loaded in yet");
            return;
        }

        let panelSidebarWidth = panelSidebar.getBoundingClientRect().width;
        document.body.style.setProperty("--natsumi-panel-sidebar-width", `${panelSidebarWidth}px`);
    }

    handleBrowserClick(keyPress = false) {
        let hasOverlay = false;
        if (ucApi.Prefs.get("natsumi.sidebar.floorp-overlay-panel").exists) {
            hasOverlay = ucApi.Prefs.get("natsumi.sidebar.floorp-overlay-panel").value;
        }

        if (!hasOverlay && !keyPress) {
            return;
        }

        if (!document.body.hasAttribute("natsumi-panel-sidebar-active") || document.body.hasAttribute("natsumi-panel-sidebar-floating")) {
            return;
        }

        let closeButton = document.getElementById("panel-sidebar-close");
        closeButton.click();
    }

    handleEscPress() {
        let hasEscape = false;
        if (ucApi.Prefs.get("natsumi.sidebar.floorp-escape-panel").exists) {
            hasEscape = ucApi.Prefs.get("natsumi.sidebar.floorp-escape-panel").value;
        }

        if (hasEscape) {
            this.handleBrowserClick(true);
        }
    }

    updateSidebarRemoved() {
        this.wasDisabled = this.checkSidebarRemoved();
    }
}

let isFloorp = false;
if (ucApi.Prefs.get("natsumi.browser.type").exists) {
    isFloorp = ucApi.Prefs.get("natsumi.browser.type").value === "floorp";
}

if (isFloorp && !document.body.natsumiPanelSidebarHandler) {
    document.body.natsumiPanelSidebarHandler = new NatsumiPanelSidebarHandler();
    document.body.natsumiPanelSidebarHandler.init();
}