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

class NatsumiCompactModeManager {
    constructor() {
        this.sidebarHovered = 0;
        this.sidebarTimeout = null;
        this.navbarTimeout = null;
        this.isPWA = document.documentElement.hasAttribute("taskbartab");
        this.pwaFullscreenListener = null;
        this.disableShortcutActions = false;
        this.visibleDuration = 300;
        this.deferrable = [];
        this.deferrableRegistered = [];
    }

    init() {
        let sidebarNode = document.getElementById("sidebar-main");
        let navigatorToolboxNode = document.getElementById("navigator-toolbox");
        let navbarNode = document.getElementById("nav-bar");

        // Check if browser is Floorp or Waterfox
        let isFloorp = false;
        let isWaterfox = false;

        if (ucApi.Prefs.get("natsumi.browser.type").exists) {
            isFloorp = ucApi.Prefs.get("natsumi.browser.type").value === "floorp";
            isWaterfox = ucApi.Prefs.get("natsumi.browser.type").value === "waterfox";
        }

        if (sidebarNode) {
            sidebarNode.addEventListener("mouseenter", this.handleElementEnter.bind(this), true);
            sidebarNode.addEventListener("mouseleave", this.handleElementLeave.bind(this), true);
        }

        if (navigatorToolboxNode) {
            navigatorToolboxNode.addEventListener("mouseenter", this.handleElementEnter.bind(this), true);
            navigatorToolboxNode.addEventListener("mouseleave", this.handleElementLeave.bind(this), true);
        }

        if (navbarNode) {
            navbarNode.addEventListener("mouseenter", this.handleElementEnter.bind(this), true);
            navbarNode.addEventListener("mouseleave", this.handleElementLeave.bind(this), true);
        }

        this.registerDeferrable("natsumi-pinned-toolbar");

        if (isFloorp) {
            this.registerDeferrable("nora-statusbar");
        } else if (isWaterfox) {
            this.registerDeferrable("status-bar");
        }

        let deferrableListener = new MutationObserver(() => {
            for (let deferrable of this.deferrable) {
                if (this.deferrableRegistered.includes(deferrable)) {
                    continue;
                }

                this.registerDeferrable(deferrable);
            }
        });
        deferrableListener.observe(document.body, {
            childList: true
        });

        let bodyMutationOnserver = new MutationObserver((mutations) => {
            mutations.forEach(() => {
                if (!document.body.hasAttribute("natsumi-compact-mode")) {
                    // Reset compact mode
                    this.resetCompactMode();
                }
            });
        });
        bodyMutationOnserver.observe(document.body, {
            attributes: true,
            attributeFilter: ["natsumi-compact-mode"]
        });

        // Enable compact mode if set to be enabled by default
        if (ucApi.Prefs.get("natsumi.theme.compact-on-new-window").exists() && !this.isPWA) {
            if (ucApi.Prefs.get("natsumi.theme.compact-on-new-window").value) {
                this.enableCompactMode();
            }
        }

        if (ucApi.Prefs.get("natsumi.theme.compact-long-visibility").exists() && this.isPWA) {
            if (ucApi.Prefs.get("natsumi.theme.compact-long-visibility").value) {
                this.visibleDuration = 1000;
            }
        }

        Services.prefs.addObserver("natsumi.theme.compact-long-visibility", () => {
            if (ucApi.Prefs.get("natsumi.theme.compact-long-visibility").value) {
                this.visibleDuration = 1000;
            } else {
                this.visibleDuration = 300;
            }
        });

        // Set PWA full screen listener
        if (this.isPWA) {
            this.pwaFullscreenListener = new MutationObserver(() => {
                const isFullScreen = document.documentElement.hasAttribute("inFullscreen");
                let pwaDynamicCompactMode = false;

                if (ucApi.Prefs.get("natsumi.theme.compact-pwa-dynamic").exists() && this.isPWA) {
                    if (ucApi.Prefs.get("natsumi.theme.compact-pwa-dynamic").value) {
                        pwaDynamicCompactMode = true;
                    }
                }

                if (pwaDynamicCompactMode) {
                    if (isFullScreen) {
                        this.enableCompactMode();
                    } else {
                        this.disableCompactMode();
                    }
                }
            });
            this.pwaFullscreenListener.observe(document.documentElement, {
                attributes: true,
                attributeFilter: ["inFullscreen"]
            });
        }

        // Listen for Floorp Zen Mode
        if (isFloorp) {
            Services.prefs.addObserver("floorp.zenmode.enabled", () => {
                let canIntercept = true;

                if (ucApi.Prefs.get("natsumi.theme.compact-keep-zen-mode").exists) {
                    canIntercept = !ucApi.Prefs.get("natsumi.theme.compact-keep-zen-mode").value;
                }

                if (!canIntercept) {
                    return;
                }

                if (ucApi.Prefs.get("floorp.zenmode.enabled").value) {
                    ucApi.Prefs.set("floorp.zenmode.enabled", false);

                    if (this.isCompactMode()) {
                        this.disableCompactMode();
                    } else {
                        this.enableCompactMode();
                    }
                }
            });
        }

        // Add sidebar observer
        const sidebarObserver = new MutationObserver(() => {
            this.handleSidebarResize();
        });
        sidebarObserver.observe(sidebarNode, {attributes: true, attributeFilter: ["style"]});
    }

    registerDeferrable(elementId) {
        if (!this.deferrable.includes(elementId)) {
            this.deferrable.push(elementId);
        }

        let deferrableNode = document.getElementById(elementId);

        if (deferrableNode) {
            deferrableNode.addEventListener("mouseenter", this.handleElementEnter.bind(this), true);
            deferrableNode.addEventListener("mouseleave", this.handleElementLeave.bind(this), true);
            this.deferrableRegistered.push(elementId);
        }
    }

    enableCompactMode(isShortcut = false) {
        if (isShortcut && this.disableShortcutActions) {
            return;
        }

        document.body.setAttribute("natsumi-compact-mode", "");
    }

    disableCompactMode(isShortcut = false) {
        if (isShortcut && this.disableShortcutActions) {
            return;
        }

        document.body.removeAttribute("natsumi-compact-mode");
        document.body.removeAttribute("natsumi-compact-sidebar-extend");
        document.body.removeAttribute("natsumi-compact-navbar-extend");
    }

    handleElementEnter(event) {
        // Check if compact mode is enabled thru body attributes
        if (!document.body.hasAttribute("natsumi-compact-mode")) {
            return;
        }

        if (this.sidebarHovered < 0) {
            this.sidebarHovered = 0;
        }

        // Check single toolbar
        let isSingleToolbar = false;
        if (ucApi.Prefs.get("natsumi.theme.single-toolbar").exists()) {
            if (ucApi.Prefs.get("natsumi.theme.single-toolbar").value) {
                isSingleToolbar = true;
            }
        }

        // Check hidden elements
        let sidebarHidden = true;
        let toolbarHidden = true;
        if (!isSingleToolbar && !this.isPWA) {
            if (ucApi.Prefs.get("natsumi.theme.compact-style").exists()) {
                if (ucApi.Prefs.get("natsumi.theme.compact-style").value === "sidebar") {
                    toolbarHidden = false;
                } else if (ucApi.Prefs.get("natsumi.theme.compact-style").value === "toolbar") {
                    sidebarHidden = false;
                }
            }
        }

        if ((event.target.id === "sidebar-main" || event.target.id === "natsumi-pinned-toolbar") && sidebarHidden) {
            if (this.sidebarTimeout) {
                clearTimeout(this.sidebarTimeout);
                this.sidebarTimeout = null;
            }

            this.sidebarHovered++;
        } else if ((
            event.target.id === "nav-bar" && isSingleToolbar ||
            event.target.id === "navigator-toolbox" && !isSingleToolbar
        ) && toolbarHidden) {
            if (isSingleToolbar) {
                if (this.sidebarTimeout) {
                    clearTimeout(this.sidebarTimeout);
                    this.sidebarTimeout = null;
                }

                this.sidebarHovered++;
            }

            if (!isSingleToolbar) {
                if (this.navbarTimeout) {
                    clearTimeout(this.navbarTimeout);
                    this.navbarTimeout = null;
                }
            }

            document.body.setAttribute("natsumi-compact-navbar-hover", "");
        } else if ((
            event.target.id === "nora-statusbar" || event.target.id === "status-bar"
        ) && sidebarHidden) {
            if (event.target.classList.contains("hidden") || event.target.getAttribute("collapsed") === "true" || event.target.style.display === "none") {
                if (this.sidebarTimeout) {
                    clearTimeout(this.sidebarTimeout);
                    this.sidebarTimeout = null;
                }

                this.sidebarHovered++;
            }
        }

        if (this.sidebarHovered > 0) {
            document.body.setAttribute("natsumi-compact-sidebar-hover", "");
        }
    }

    handleElementLeave(event) {
        // Check if compact mode is enabled thru body attributes
        if (!document.body.hasAttribute("natsumi-compact-mode")) {
            return;
        }

        // Check single toolbar
        let isSingleToolbar = false;
        if (ucApi.Prefs.get("natsumi.theme.single-toolbar").exists()) {
            if (ucApi.Prefs.get("natsumi.theme.single-toolbar").value) {
                isSingleToolbar = true;
            }
        }

        let sidebarInteracted = false;

        // Check hidden elements
        let sidebarHidden = true;
        let toolbarHidden = true;
        if (!isSingleToolbar && !this.isPWA) {
            if (ucApi.Prefs.get("natsumi.theme.compact-style").exists()) {
                if (ucApi.Prefs.get("natsumi.theme.compact-style").value === "sidebar") {
                    toolbarHidden = false;
                } else if (ucApi.Prefs.get("natsumi.theme.compact-style").value === "toolbar") {
                    sidebarHidden = false;
                }
            }
        }

        if ((event.target.id === "sidebar-main" || event.target.id === "natsumi-pinned-toolbar") && sidebarHidden) {
            this.sidebarHovered--;
            sidebarInteracted = true;
        } else if ((
            event.target.id === "nav-bar" && isSingleToolbar ||
            event.target.id === "navigator-toolbox" && !isSingleToolbar
        ) && toolbarHidden) {
            if (isSingleToolbar) {
                this.sidebarHovered--;
                sidebarInteracted = true;
            }

            if (document.body.hasAttribute("natsumi-compact-navbar-hover")) {
                this.navbarTimeout = setTimeout(() => {
                    document.body.removeAttribute("natsumi-compact-navbar-hover");
                    this.navbarTimeout = null;
                }, this.visibleDuration);
            }
        } else if ((
            event.target.id === "nora-statusbar" || event.target.id === "status-bar"
        ) && sidebarHidden) {
            if (event.target.classList.contains("hidden") || event.target.getAttribute("collapsed") === "true" || event.target.style.display === "none") {
                sidebarInteracted = true;
                this.sidebarHovered--;
            }
        }

        if (this.sidebarHovered <= 0 && sidebarInteracted) {
            this.sidebarTimeout = setTimeout(() => {
                document.body.removeAttribute("natsumi-compact-sidebar-hover");
                this.sidebarTimeout = null;
            }, this.visibleDuration);
            this.sidebarHovered = 0;
        }
    }

    isCompactMode() {
        return document.body.hasAttribute("natsumi-compact-mode");
    }

    resetCompactMode() {
        if (document.body.hasAttribute("natsumi-compact-mode")) {
            // Compact mode is still on
            return;
        }

        if (document.body.hasAttribute("natsumi-compact-sidebar-hover")) {
            document.body.removeAttribute("natsumi-compact-sidebar-hover");
        }

        if (document.body.hasAttribute("natsumi-compact-navbar-hover")) {
            document.body.removeAttribute("natsumi-compact-navbar-hover");
        }

        if (this.sidebarTimeout) {
            clearTimeout(this.sidebarTimeout);
            this.sidebarTimeout = null;
        }

        if (this.navbarTimeout) {
            clearTimeout(this.navbarTimeout);
            this.navbarTimeout = null;
        }

        this.sidebarHovered = 0;
    }

    handleSidebarResize() {
        let sidebarNode = document.getElementById("sidebar-main");

        // Get sidebar state
        const sidebarExpanded = sidebarNode.hasAttribute("sidebar-launcher-expanded");

        // Is the sidebar width as expected?
        const sidebarWidth = sidebarNode.style.width;

        if (sidebarWidth !== "0px" || sidebarWidth === "") {
            // No issues
            return;
        }

        // Copy sidebar width
        if (sidebarExpanded) {
            sidebarNode.style.width = `${SidebarController.getUIState().expandedLauncherWidth}px`;
        } else {
            sidebarNode.style.removeProperty("width");
        }
    }
}

if (!document.body.natsumiCompactModeManager) {
    document.body.natsumiCompactModeManager = new NatsumiCompactModeManager();
    document.body.natsumiCompactModeManager.init();
}
