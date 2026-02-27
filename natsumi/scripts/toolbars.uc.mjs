// ==UserScript==
// @include   main
// @ignorecache
// ==/UserScript==

import * as ucApi from "chrome://userchromejs/content/uc_api.sys.mjs";

class NatsumiToolbarManager {
    constructor() {
        this.pinnedTabsObserver = null;
    }

    init() {
        if (ucApi.Prefs.get("natsumi.experiments.toolbar").exists()) {
            if (!ucApi.Prefs.get("natsumi.experiments.toolbar").value) {
                return;
            }
        } else {
            return;
        }

        this.createToolbar("natsumi-pinned-toolbar");

        // Disable pinned toolbar if vertical tabs is disabled
        Services.prefs.addObserver("sidebar.verticalTabs", () => {
            let verticalTabsEnabled = ucApi.Prefs.get("sidebar.verticalTabs").value;

            if (verticalTabsEnabled) {
                window.CustomizableUI.registerArea("natsumi-pinned-toolbar");
            } else {
                window.CustomizableUI.unregisterArea("natsumi-pinned-toolbar", true);
            }
        });

        // Copy pinned tabs height
        this.copyPinnedTabsHeight();
        this.pinnedTabsObserver = new MutationObserver(() => {
            this.copyPinnedTabsHeight();
        });

        let pinnedTabs = document.querySelector("#pinned-tabs-container");
        if (pinnedTabs) {
            this.pinnedTabsObserver.observe(pinnedTabs, {attributes: true, attributeFilter: ["style", "hidden"]});
        }
    }

    createToolbar(toolbarId, textMode = false, defaultPlacements = []) {
        // Create toolbar element
        let toolbar = document.createXULElement("toolbar");
        toolbar.id = toolbarId;
        toolbar.setAttribute("customizable", "true");
        toolbar.setAttribute("mode", "icons");
        toolbar.setAttribute("class", "browser-toolbar");
        toolbar.setAttribute("context", "toolbar-context-menu");

        if (textMode) {
            toolbar.setAttribute("mode", "text");
        }

        // Add toolbar to body
        document.body.appendChild(toolbar);

        // Register toolbar
        window.CustomizableUI.registerArea(toolbarId, {defaultPlacements: defaultPlacements});
        window.CustomizableUI.registerToolbarNode(toolbar);
    }

    copyPinnedTabsHeight() {
        let pinnedTabs = document.querySelector("#pinned-tabs-container");

        if (!pinnedTabs) {
            return;
        }

        // If pinned tabs are hidden, set height to 0
        if (pinnedTabs.hasAttribute("hidden")) {
            document.body.style.setProperty("--natsumi-pinned-tabs-height", `0px`);
            return;
        }

        // We can't use style.height so we need to compute it
        const pinnedTabsHeight = pinnedTabs.getBoundingClientRect().height;
        document.body.style.setProperty("--natsumi-pinned-tabs-height", `${pinnedTabsHeight}px`);
    }
}

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

            // Also initialize status bar in compact mode manager
            if (document.body.natsumiCompactModeManager) {
                document.body.natsumiCompactModeManager.initStatusbar();
            }
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

if (!document.body.natsumiToolbarManager) {
    document.body.natsumiToolbarManager = new NatsumiToolbarManager();
    document.body.natsumiToolbarManager.init();
}