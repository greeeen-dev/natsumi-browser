// ==UserScript==
// @include   main
// @ignorecache
// ==/UserScript==

import * as ucApi from "chrome://userchromejs/content/uc_api.sys.mjs";
import {NatsumiNotification} from "./notifications.sys.mjs";

let isFloorp = false;
let isWaterfox = false;

if (ucApi.Prefs.get("natsumi.browser.type").exists) {
    isFloorp = ucApi.Prefs.get("natsumi.browser.type").value === "floorp";
    isWaterfox = ucApi.Prefs.get("natsumi.browser.type").value === "waterfox";
}

function getShouldMigrate() {
    let shouldMigrate = false;

    if (ucApi.Prefs.get("natsumi.sidebar.use-statusbar-in-sidebar").exists) {
        shouldMigrate = ucApi.Prefs.get("natsumi.sidebar.use-statusbar-in-sidebar").value;
    }

    if (ucApi.Prefs.get("natsumi.sidebar.disable-bottom-toolbar").exists && shouldMigrate) {
        shouldMigrate = !ucApi.Prefs.get("natsumi.sidebar.disable-bottom-toolbar").value;
    }

    if (ucApi.Prefs.get("natsumi.sidebar.migrated-statusbar").exists && shouldMigrate) {
        shouldMigrate = !ucApi.Prefs.get("natsumi.sidebar.migrated-statusbar").value;
    }

    return shouldMigrate;
}

class NatsumiToolbarManager {
    constructor() {
        this.pinnedTabsObserver = null;
        this.pinnedToolbarObserver = null;
        this.topToolbarObserver = null;
        this.bottomToolbarObserver = null;
        this.verticalTabsObserver = null;
        this.sidebarNode = null;
        this.sidebarObserver = null;
    }

    init() {
        // Create pinned toolbar
        try {
            this.initPinnedToolbar();
        } catch(e) {
            console.error(e);
        }

        // Create top toolbar
        try {
            this.initTopToolbar();
        } catch(e) {
            console.error(e);
        }

        // Create bottom toolbar
        try {
            this.initBottomToolbar();
        } catch(e) {
            console.error(e);
        }

        // Get sidebar
        this.sidebarNode = document.querySelector("#sidebar-container") ?? document.querySelector("#sidebar-main");

        this.sidebarObserver = new MutationObserver(() => {
            this.copySidebarWidth();
            this.copyTopToolbarHeight();
            this.copyBottomToolbarHeight();
            this.copyWindowButtonsWidth();
            this.copyPinnedTabsHeight();
            this.copyPinnedToolbarHeight();

            // Copy sidebar options height if the shadow root exists
            let sidebarNodeSR = this.sidebarNode.shadowRoot;
            if (sidebarNodeSR) {
                this.copySidebarOptionsHeight();
            }
        });
        this.sidebarObserver.observe(this.sidebarNode, {attributes: true, attributeFilter: ["style", "sidebar-launcher-expanded", "sidebar-ongoing-animations"]});

        // Run initial copy
        this.copySidebarWidth();
        this.copyTopToolbarHeight();
        this.copyBottomToolbarHeight();
        this.copyWindowButtonsWidth();
        this.copyPinnedTabsHeight();
        this.copyPinnedToolbarHeight();
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
    }

    initTopToolbar() {
        // Use container
        let topToolbarContainer = document.createElement("div");
        topToolbarContainer.id = "natsumi-top-toolbar-container";
        document.body.appendChild(topToolbarContainer);

        // Copy window controls
        let windowControls = document.querySelector("#nav-bar .titlebar-buttonbox-container");
        let windowControlsCopy = windowControls.cloneNode(true);
        topToolbarContainer.appendChild(windowControlsCopy);

        this.createToolbar("natsumi-top-toolbar", false, false, [], topToolbarContainer);

        // Copy bottom toolbar height
        this.copyTopToolbarHeight();
        this.topToolbarObserver = new MutationObserver(() => {
            this.copyTopToolbarHeight();
        });

        let topToolbar = document.getElementById("natsumi-top-toolbar");
        if (topToolbar) {
            this.topToolbarObserver.observe(topToolbar, {attributes: true, childList: true, attributeFilter: ["style", "hidden"]});
        }

        // Disable bottom toolbar if needed
        let mergedToolbar = false;
        let islands = false;

        if (ucApi.Prefs.get("natsumi.sidebar.top-toolbar").exists) {
            mergedToolbar = !ucApi.Prefs.get("natsumi.sidebar.top-toolbar").value;
        }
        if (ucApi.Prefs.get("natsumi.theme.islands").exists) {
            islands = ucApi.Prefs.get("natsumi.theme.islands").value;
        }

        if (!ucApi.Prefs.get("sidebar.verticalTabs").value || mergedToolbar || islands) {
            this.removeToolbar("natsumi-top-toolbar");
        }

        const topToolbarToggle = () => {
            let verticalTabs = ucApi.Prefs.get("sidebar.verticalTabs").value;
            let mergedToolbar = false;
            let islands = false;

            if (ucApi.Prefs.get("natsumi.sidebar.top-toolbar").exists) {
                mergedToolbar = !ucApi.Prefs.get("natsumi.sidebar.top-toolbar").value;
            }
            if (ucApi.Prefs.get("natsumi.theme.islands").exists) {
                islands = ucApi.Prefs.get("natsumi.theme.islands").value;
            }

            if (!verticalTabs || mergedToolbar || islands) {
                this.removeToolbar("natsumi-top-toolbar");
            } else {
                this.createToolbar("natsumi-top-toolbar");
            }
        }

        Services.prefs.addObserver("sidebar.verticalTabs", topToolbarToggle);
        Services.prefs.addObserver("natsumi.sidebar.top-toolbar", topToolbarToggle);
        Services.prefs.addObserver("natsumi.theme.islands", topToolbarToggle);
    }

    initBottomToolbar() {
        let initialPlacements = [];

        if (!getShouldMigrate()) {
            initialPlacements = ["library-button"];

            if (isFloorp) {
                initialPlacements.push("workspaces-toolbar-button");
            }

            if (ucApi.Prefs.get("sidebar.verticalTabs").value) {
                initialPlacements.push("new-tab-button");
            }
        }

        this.createToolbar("natsumi-bottom-toolbar", false, false, initialPlacements);

        // Copy bottom toolbar height
        this.copyBottomToolbarHeight();
        this.bottomToolbarObserver = new MutationObserver(() => {
            this.copyBottomToolbarHeight();
        });

        let bottomToolbar = document.getElementById("natsumi-bottom-toolbar");
        if (bottomToolbar) {
            this.bottomToolbarObserver.observe(bottomToolbar, {attributes: true, childList: true, attributeFilter: ["style", "hidden"]});
        }

        // Disable bottom toolbar if toggled
        let toolbarDisabled = false;
        if (ucApi.Prefs.get("natsumi.sidebar.disable-bottom-toolbar").exists) {
            toolbarDisabled = ucApi.Prefs.get("natsumi.sidebar.disable-bottom-toolbar").value;
        }

        if (toolbarDisabled) {
            this.removeToolbar("natsumi-bottom-toolbar");
        }

        Services.prefs.addObserver("natsumi.sidebar.disable-bottom-toolbar", () => {
            let disabled = ucApi.Prefs.get("natsumi.sidebar.disable-bottom-toolbar").value;

            if (disabled) {
                this.removeToolbar("natsumi-bottom-toolbar");
            } else {
                this.createToolbar("natsumi-bottom-toolbar");
            }
        });
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
                toolbar.removeAttribute("mode");
            }

            // Add toolbar to body
            parentNode.appendChild(toolbar);
        }

        // Register toolbar
        window.CustomizableUI.registerArea(toolbarId, {defaultPlacements: defaultPlacements, overflowable: canOverflow});
        window.CustomizableUI.registerToolbarNode(toolbar);
    }

    removeToolbar(toolbarId, destroyPlacements = false) {
        // Move toggle sidebar button (if in toolbar)
        // This prevents breaking the sidebar
        let toolbarWidgets = window.CustomizableUI.getWidgetIdsInArea(toolbarId);
        let navbarWidgets = window.CustomizableUI.getWidgetIdsInArea("nav-bar");

        if (toolbarWidgets.includes("sidebar-button")) {
            let newPosition = 0;
            if (!ucApi.Prefs.get("sidebar.position_start").value) {
                newPosition = navbarWidgets.length;
            }

            window.CustomizableUI.addWidgetToArea("sidebar-button", "nav-bar", newPosition);
        }

        window.CustomizableUI.unregisterArea(toolbarId, destroyPlacements);
    }

    copyPinnedToolbarHeight() {
        let pinnedToolbar = document.querySelector("#natsumi-pinned-toolbar");

        if (!pinnedToolbar) {
            // Probably not initialized yet
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

    copySidebarWidth() {
        // Only run this if vertical tabs are enabled
        if (!ucApi.Prefs.get("sidebar.verticalTabs").value) {
            return;
        }

        let sidebar = document.querySelector("#sidebar-container") ?? document.querySelector("#sidebar-main");

        // Usually the sidebar should always exist, but if it doesn't, we can just return
        if (!sidebar) {
            return;
        }

        let width = sidebar.getBoundingClientRect().width;

        if (!width || width === 0) {
            width = 242;
        }

        document.body.style.setProperty("--natsumi-sidebar-width", `${width}px`);

        // Refresh Miniplayer text scrolling
        let miniplayerContainer = document.getElementById("natsumi-miniplayer-container");

        if (!miniplayerContainer) {
            return;
        }

        for (let miniplayerNode of miniplayerContainer.querySelectorAll(".natsumi-miniplayer")) {
            if (!miniplayerNode.natsumiMiniplayerController) {
                // This Miniplayer is broken
                continue;
            }

            miniplayerNode.natsumiMiniplayerController.refreshMetadataAnimations();
        }
    }

    copyTopToolbarHeight() {
        if (!CustomizableUI.areas.includes("natsumi-top-toolbar")) {
            document.body.style.removeProperty("--natsumi-top-toolbar-height");
            return;
        }

        let topToolbarNode = document.getElementById("natsumi-top-toolbar");
        let toolbarWidgets = window.CustomizableUI.getWidgetIdsInArea("natsumi-top-toolbar");

        if (toolbarWidgets.length === 0) {
            document.body.setAttribute("natsumi-top-toolbar-empty", "");
        } else {
            document.body.removeAttribute("natsumi-top-toolbar-empty");
        }

        let height = topToolbarNode.scrollHeight;

        if (height === 0) {
            height = 28;
        }

        document.body.style.setProperty("--natsumi-top-toolbar-height", `${height}px`);
    }

    copyBottomToolbarHeight() {
        let sidebarNode = document.querySelector("#sidebar-container") ?? document.querySelector("#sidebar-main");
        let bottomToolbarNode = document.getElementById("natsumi-bottom-toolbar");
        let toolbarWidgets = window.CustomizableUI.getWidgetIdsInArea("natsumi-bottom-toolbar");

        if (toolbarWidgets.length === 0) {
            let autohideToolbar = false;
            if (ucApi.Prefs.get("natsumi.sidebar.autohide-bottom-toolbar").exists) {
                autohideToolbar = ucApi.Prefs.get("natsumi.sidebar.autohide-bottom-toolbar").value;
            }

            if (autohideToolbar) {
                sidebarNode.setAttribute("natsumi-bottom-toolbar-empty", "");
            }
        } else {
            sidebarNode.removeAttribute("natsumi-bottom-toolbar-empty");
        }

        let height = bottomToolbarNode.scrollHeight;

        if (height === 0) {
            height = 28;
        }

        sidebarNode.style.setProperty("--natsumi-bottom-toolbar-height", `${height}px`);
    }

    copyWindowButtonsWidth() {
        let windowButtonsNode = document.querySelector("#nav-bar .titlebar-buttonbox-container");

        if (!windowButtonsNode) {
            return;
        }

        const width = windowButtonsNode.getBoundingClientRect().width + "px";

        let navBar = document.querySelector("#navigator-toolbox");

        if (navBar) {
            navBar.style.setProperty("--natsumi-window-buttons-width", width);
        }
    }

    copySidebarOptionsHeight() {
        // The buttons strip is in a shadow root, so we'll need to do some more work here
        let sidebarNode = (document.querySelector("#sidebar-container") ?? document.querySelector("#sidebar-main")).querySelector("sidebar-main");
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
}

class NatsumiStatusBarHandler {
    constructor() {
        this.statusBarNode = null;
        this.isWaterfox = false;
        this.statusBarObserver = null;
    }

    init() {
        let isFloorp = false;
        if (ucApi.Prefs.get("natsumi.browser.type").exists) {
            this.isWaterfox = ucApi.Prefs.get("natsumi.browser.type").value === "waterfox";
            isFloorp = ucApi.Prefs.get("natsumi.browser.type").value === "floorp";
        }

        if (isFloorp || this.isWaterfox) {
            this.initStatusBar();
        }
    }

    initStatusBar() {
        this.statusBarNode = document.getElementById("nora-statusbar");
        if (this.isWaterfox) {
            this.statusBarNode = document.getElementById("status-bar");
        }

        if (this.statusBarNode) {
            if (isFloorp) {
                // Get Floorp version if we're on Floorp
                let floorpVersion = AppConstants.MOZ_APP_VERSION_DISPLAY.split("@")[0];

                // Get minor version
                let minorVersion = parseInt(floorpVersion.split(".")[1]);

                if (minorVersion < 15) {
                    // Add observer for status bar
                    document.body.natsumiButtonsManager.patchToolbarButtons(this.statusBarNode);
                }
            }

            // Induce 100ms delay
            setTimeout(() => {
                this.migrateStatusBar();
            }, 100);
        } else if (!this.statusBarObserver) {
            // This can be a bit sluggish here, so we wait
            this.statusBarObserver = new MutationObserver(() => {
                let statusBar = document.getElementById("nora-statusbar") ?? document.getElementById("status-bar");

                if (statusBar) {
                    this.migrateStatusBar();
                    this.statusBarObserver.disconnect();
                }
            });
            this.statusBarObserver.observe(document.body, {childList: true});
        }
    }

    migrateStatusBar() {
        let shouldMigrate = getShouldMigrate();

        if (!shouldMigrate) {
            ucApi.Prefs.set("natsumi.sidebar.migrated-statusbar", true);
            return;
        }

        let statusBarWidgets;
        if (isFloorp) {
            statusBarWidgets = window.CustomizableUI.getWidgetIdsInArea("nora-statusbar");
        } else {
            statusBarWidgets = window.CustomizableUI.getWidgetIdsInArea("status-bar");
        }

        let indexOffset = 0;
        for (let i = 0; i < statusBarWidgets.length; i++) {
            let widget = statusBarWidgets[i];

            if (widget === "status-text") {
                indexOffset++;
                continue;
            }

            window.CustomizableUI.addWidgetToArea(widget, "natsumi-bottom-toolbar", i - indexOffset);
        }

        ucApi.Prefs.set("natsumi.sidebar.migrated-statusbar", true);
        ucApi.Prefs.set("natsumi.sidebar.use-statusbar-in-sidebar", false);

        let notificationObject = new NatsumiNotification(
            "Your toolbar got an upgrade!",
            "Your status bar items were moved to the new Natsumi Bottom Toolbar, so your status bar is free for more!",
            "chrome://natsumi/content/icons/lucide/sparkle.svg",
            10000
        );
        notificationObject.addToContainer();
    }
}

class NatsumiButtonsManager {
    constructor() {
        this.fixableButtons = ["alltabs-button", "downloads-button", "library-button", "firefox-view-button"];
        this.badToolbars = ["nora-statusbar", "natsumi-pinned-toolbar", "natsumi-bottom-toolbar"];
    }

    init() {
        // Patch pinned toolbar
        let pinnedToolbar = document.getElementById("natsumi-pinned-toolbar");
        this.patchToolbarButtons(pinnedToolbar);

        // Patch top toolbar
        let topToolbar = document.getElementById("natsumi-top-toolbar");
        this.patchToolbarButtons(topToolbar);

        // Patch bottom toolbar
        let bottomToolbar = document.getElementById("natsumi-bottom-toolbar");
        this.patchToolbarButtons(bottomToolbar);
    }

    patchToolbarButtons(toolbar) {
        if (!this.badToolbars.includes(toolbar.id)) {
            // This toolbar is fine
            return;
        }

        // Patch toolbar
        toolbar.addEventListener("mousedown", (event) => {
            let toolbarButton = event.target.closest("toolbarbutton");

            if (!toolbarButton) {
                return;
            }

            if (this.fixableButtons.includes(toolbarButton.id)) {
                this.handleButtonPress(toolbarButton);
            }
        });
    }

    handleButtonPress(button) {
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

let sidebar = document.querySelector("#sidebar-container") ?? document.querySelector("#sidebar-main");

if (!document.body.natsumiStatusBarHandler) {
    document.body.natsumiStatusBarHandler = new NatsumiStatusBarHandler();
    document.body.natsumiStatusBarHandler.init();
}

if (!sidebar) {
    console.warn("Sidebar not found, trying to find it...");
    for (let i = 0; i < 10; i++) {
        sidebar = document.querySelector("#sidebar-container") ?? document.querySelector("#sidebar-main");

        // If the sidebar exists, we can stop searching
        if (sidebar) {
            break;
        }

        // Wait for 1s before trying again
        await new Promise(resolve => setTimeout(resolve, 1000));
    }
}