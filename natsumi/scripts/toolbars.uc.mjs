// ==UserScript==
// @include   main
// @ignorecache
// ==/UserScript==

import * as ucApi from "chrome://userchromejs/content/uc_api.sys.mjs";

class NatsumiToolbarManager {
    constructor() {
        this.pinnedTabsObserver = null;
        this.pinnedToolbarObserver = null;
        this.verticalTabsObserver = null;
        this.sidebarObserver = null;
    }

    init() {
        try {
            this.initPinnedToolbar();
        } catch(e) {
            console.error(e);
        }
    }

    initPinnedToolbar() {
        let verticalTabsEnabled = ucApi.Prefs.get("sidebar.verticalTabs").value;
        this.createToolbar("natsumi-pinned-toolbar");

        if (!verticalTabsEnabled) {
            this.removeToolbar("natsumi-pinned-toolbar");
        }

        // Disable pinned toolbar if vertical tabs is disabled
        Services.prefs.addObserver("sidebar.verticalTabs", () => {
            let verticalTabsEnabled = ucApi.Prefs.get("sidebar.verticalTabs").value;

            if (!verticalTabsEnabled) {
                this.removeToolbar("natsumi-pinned-toolbar");
            } else {
                this.createToolbar("natsumi-pinned-toolbar");
            }
        });

        // Copy pinned tabs height
        this.copyPinnedTabsHeight();
        this.pinnedTabsObserver = new MutationObserver(() => {
            this.copyPinnedTabsHeight();
        });

        let pinnedTabs = document.getElementById("pinned-tabs-container") ?? document.getElementById("vertical-pinned-tabs-container");
        if (pinnedTabs) {
            this.pinnedTabsObserver.observe(pinnedTabs, {attributes: true, childList: true, attributeFilter: ["style", "hidden"]});
        }

        // Copy pinned toolbar height
        this.copyPinnedToolbarHeight();
        this.pinnedToolbarObserver = new MutationObserver(() => {
            this.copyPinnedToolbarHeight();
        });

        let pinnedToolbar = document.getElementById("natsumi-pinned-toolbar");
        if (pinnedToolbar) {
            this.pinnedToolbarObserver.observe(pinnedToolbar, {attributes: true, childList: true, attributeFilter: ["style", "hidden"]});
        }

        // Create observer for vertical tabs
        let verticalTabs = document.getElementById("vertical-tabs");

        this.verticalTabsObserver = new MutationObserver(() => {
            if (verticalTabs.querySelector("#pinned-tabs-container") || verticalTabs.querySelector("#vertical-pinned-tabs-container")) {
                this.copyPinnedTabsHeight();
                this.copyPinnedToolbarHeight();
            }
        });

        if (verticalTabs) {
            this.verticalTabsObserver.observe(pinnedToolbar, {childList: true});
        }

        // Create observer for sidebar
        let sidebar = document.querySelector("#sidebar-main");

        this.sidebarObserver = new MutationObserver(() => {
            this.copyPinnedTabsHeight();
            this.copyPinnedToolbarHeight();
        });

        if (sidebar) {
            this.sidebarObserver.observe(sidebar, {attributes: true, attributeFilter: ["sidebar-launcher-expanded", "sidebar-ongoing-animations"]});
        }
    }

    createToolbar(toolbarId, textMode = false, canOverflow = false, defaultPlacements = [], parent = null) {
        // Get toolbar element
        let toolbar = document.getElementById(toolbarId);
        let parentNode = parent ?? document.body;

        if (!toolbar) {
            // Create toolbar element
            toolbar = document.createXULElement("toolbar");
            toolbar.id = toolbarId;
            toolbar.setAttribute("customizable", "true");
            toolbar.setAttribute("mode", "icons");
            toolbar.setAttribute("class", "browser-toolbar");
            toolbar.setAttribute("context", "toolbar-context-menu");
            toolbar.setAttribute("overflowable", `${canOverflow}`);

            if (textMode) {
                toolbar.setAttribute("mode", "text");
            }

            // Add toolbar to body
            parentNode.appendChild(toolbar);
        }

        // Register toolbar
        window.CustomizableUI.registerArea(toolbarId, {defaultPlacements: defaultPlacements, overflowable: canOverflow});
        window.CustomizableUI.registerToolbarNode(toolbar);
    }

    removeToolbar(toolbarId, destroyPlacements = false) {
        window.CustomizableUI.unregisterArea(toolbarId, destroyPlacements);
    }

    copyPinnedToolbarHeight() {
        let pinnedToolbar = document.querySelector("#natsumi-pinned-toolbar");

        if (!pinnedToolbar) {
            return;
        }

        // If pinned tabs are hidden, set height to 0
        if (pinnedToolbar.hasAttribute("hidden")) {
            document.body.style.setProperty("--natsumi-pinned-toolbar-height", `0px`);
            return;
        }

        // If there's nothing, then remove the property
        if (pinnedToolbar.children.length === 0) {
            document.body.style.removeProperty("--natsumi-pinned-toolbar-height");
            return;
        }

        // We can't use style.height so we need to compute it
        const pinnedToolbarHeight = pinnedToolbar.getBoundingClientRect().height;
        document.body.style.setProperty("--natsumi-pinned-toolbar-height", `${pinnedToolbarHeight}px`);
    }

    copyPinnedTabsHeight() {
        let pinnedTabs = document.getElementById("pinned-tabs-container") ?? document.getElementById("vertical-pinned-tabs-container");

        if (!pinnedTabs) {
            return;
        }

        if (!ucApi.Prefs.get("sidebar.verticalTabs").value) {
            return;
        }

        // If pinned tabs are hidden, set height to 0
        if (pinnedTabs.hasAttribute("hidden")) {
            document.body.style.setProperty("--natsumi-pinned-tabs-height", `0px`);
            return;
        }

        // We can't use style.height so we need to compute it
        const pinnedTabsHeight = pinnedTabs.getBoundingClientRect().height;

        if (pinnedTabsHeight === 0) {
            if (pinnedTabs.childElementCount !== 0) {
                // This isn't right
                return;
            }
        }

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

            // Add observer for status bar
            document.body.natsumiButtonsManager.registerToolbarListener(this.statusBarNode);
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

        let width = sidebar.getBoundingClientRect().width;

        if (!width || width === 0) {
            width = 242;
        }

        document.body.style.setProperty("--natsumi-sidebar-width", `${width}px`);
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

class NatsumiButtonsManager {
    constructor() {
        this.fixableButtons = ["alltabs-button", "downloads-button", "library-button", "firefox-view-button"];
        this.badToolbars = ["nora-statusbar", "natsumi-pinned-toolbar"];
        this.toolbarObserver = new MutationObserver((mutations) => {
            for (let mutation of mutations) {
                const addedNodes = mutation.addedNodes;
                for (let addedNode of addedNodes) {
                    if (addedNode.nodeName === "toolbarpaletteitem") {
                        addedNode = addedNode.querySelector("toolbarbutton");
                    }

                    if (this.fixableButtons.includes(addedNode.id)) {
                        this.addButtonPatch(addedNode);
                    }
                }
            }
        });
    }

    init() {
        for (let fixableButton of this.fixableButtons) {
            let buttonNode = document.getElementById(fixableButton);

            if (!buttonNode) {
                continue;
            }

            this.addButtonPatch(buttonNode);
        }

        // Observe pinned toolbar
        let pinnedToolbar = document.getElementById("natsumi-pinned-toolbar");
        this.registerToolbarListener(pinnedToolbar);
    }

    getParentToolbar(node) {
        return node.parentElement.id;
    }

    registerToolbarListener(toolbar) {
        if (!this.badToolbars.includes(toolbar.id)) {
            // This toolbar is fine
            return;
        }

        // Patch existing buttons
        let toolbarButtons = toolbar.querySelectorAll("toolbarbutton");
        for (let toolbarButton of toolbarButtons) {
            if (this.fixableButtons.includes(toolbarButton.id)) {
                this.addButtonPatch(toolbarButton);
            }
        }

        this.toolbarObserver.observe(toolbar, {childList: true});
    }

    addButtonPatch(button) {
        if (button.hasAttribute("natsumi-toolbar-patched")) {
            // Already patched
            return;
        }

        button.addEventListener("mousedown", (event) => {
            if (!this.badToolbars.includes(this.getParentToolbar(button))) {
                return;
            }

            if (button.hasAttribute("open")) {
                return;
            }

            switch (button.id) {
                // These cases are taken from navigator-toolbox.js
                // Some are omitted as they cannot be triggered outside the navbar
                case "firefox-view-button":
                    FirefoxViewHandler.openToolbarMouseEvent(event);
                    break;
                case "alltabs-button":
                    gTabsPanel.showAllTabsPanel(event, "alltabs-button");
                    break;
                case "downloads-button":
                    DownloadsIndicatorView.onCommand(event);
                    break;
                case "library-button":
                    PanelUI.showSubView("appMenu-libraryView", button, event);
                    break;
            }
        });

        button.setAttribute("natsumi-toolbar-patched", "");
    }
}

if (!document.body.natsumiToolbarManager) {
    document.body.natsumiToolbarManager = new NatsumiToolbarManager();
    document.body.natsumiToolbarManager.init();
}

if (!document.body.natsumiButtonsManager) {
    document.body.natsumiButtonsManager = new NatsumiButtonsManager();
    document.body.natsumiButtonsManager.init();
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