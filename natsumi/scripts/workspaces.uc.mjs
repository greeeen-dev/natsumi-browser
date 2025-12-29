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
import { applyCustomTheme } from "./custom-theme.sys.mjs";

function convertToXUL(node) {
    // noinspection JSUnresolvedReference
    return window.MozXULElement.parseXULToFragment(node);
}

class NatsumiWorkspacesWrapper {
    // A wrapper class for managing workspaces in Floorp directly from the window
    constructor() {
        this.workspacesModule = null;
        this.workspacesContext = null;
        this.modalManager = null;
        this.tabManager = null;
        this.iconManager = null;
        this.initialized = false;
        this.properInit = false;
        this.initInterval = null;
        this.dataRetrieveQueue = [];
    }

    async init() {
        let workspacesModulePath = "chrome://noraneko/content/assets/js/index26.js";

        // Get Floorp version
        let floorpVersion = AppConstants.MOZ_APP_VERSION_DISPLAY.split("@")[0];

        // Get minor version
        let minorVersion = parseInt(floorpVersion.split(".")[1]);
        let patchVersion = parseInt(floorpVersion.split(".")[2]);

        // Get Firedragon status
        let isFiredragon = AppConstants.MOZ_APP_BASENAME.toLowerCase() === "firedragon";

        if (minorVersion > 9 || minorVersion === 9 && patchVersion >= 2) {
            // FLoorp 12.9.2+ (do nothing)
        } else if (minorVersion === 9 && patchVersion < 2) {
            // Floorp 12.9.0 and 12.9.1
            workspacesModulePath = "chrome://noraneko/content/assets/js/index25.js";
        } else if (minorVersion >= 8) {
            // Floorp 12.8.0+
            workspacesModulePath = "chrome://noraneko/content/assets/js/index25.js";
        } else if (minorVersion >= 4) {
            // Floorp 12.4.0+
            workspacesModulePath = "chrome://noraneko/content/assets/js/index23.js";
        } else {
            // Everything else
            workspacesModulePath = "chrome://noraneko/content/assets/js/index22.js";
        }

        if (isFiredragon) {
            // Firedragon 12.3.0+ (overrides Floorp module path)
            workspacesModulePath = "chrome://noraneko/content/assets/js/modules/workspaces.js";
        }

        this.workspacesModule = await import(workspacesModulePath);
        let workspacesContext;

        if (isFiredragon) {
            workspacesContext = this.workspacesModule.default.getCtx();
        } else {
            workspacesContext = this.workspacesModule._.getCtx();
        }

        // This can be lazy, so we can always initialize this later
        if (workspacesContext) {
            this.setManagers(workspacesContext);
        } else {
            console.warn("Workspaces context could not be retrieved, will do this later.");
            this.setInitInterval();
        }

        // Set init to true
        this.initialized = true;
    }

    setInitInterval() {
        if (this.properInit) {
            return;
        }

        // Get Firedragon status
        let isFiredragon = AppConstants.MOZ_APP_BASENAME.toLowerCase() === "firedragon";

        this.initInterval = setInterval(() => {
            let workspacesContext;

            if (isFiredragon) {
                workspacesContext = this.workspacesModule.default.getCtx();
            } else {
                workspacesContext = this.workspacesModule._.getCtx();
            }

            if (workspacesContext) {
                console.log("Workspaces context retrieved, initializing now.", workspacesContext);

                // Set managers and init status
                this.setManagers(workspacesContext);
                this.properInit = true;

                // Signal to all queued classes that they can retrieve data now
                for (let queuedFunction of this.dataRetrieveQueue) {
                    queuedFunction();
                }
                this.dataRetrieveQueue = [];

                // Clear interval
                clearInterval(this.initInterval);
                this.initInterval = null;
            }
        }, 100);
    }

    setManagers(workspacesContext) {
        this.workspacesContext = workspacesContext;
        this.modalManager = workspacesContext.modalCtx;
        this.tabManager = workspacesContext.tabManagerCtx;
        this.iconManager = workspacesContext.iconCtx;
    }

    getCurrentWorkspaceID() {
        if (!this.initialized) {
            return;
        }

        return this.workspacesContext.getSelectedWorkspaceID();
    }

    getDefaultWorkspaceID() {
        if (!this.initialized) {
            return;
        }

        return this.workspacesContext.getDefaultWorkspaceID();
    }

    getAllWorkspaceIDs(ordered = false) {
        if (ucApi.Prefs.get("floorp.workspaces.v4.store").exists()) {
            let workspacesData = JSON.parse(ucApi.Prefs.get("floorp.workspaces.v4.store").value);
            let workspaceIDs = [];

            if (ordered && workspacesData["order"]) {
                return workspacesData["order"];
            }

            for (let index in workspacesData["data"]) {
                workspaceIDs.push(workspacesData["data"][index][0]);
            }

            return workspaceIDs;
        } else {
            return [];
        }
    }

    setCurrentWorkspaceID(workspaceId) {
        if (!this.initialized) {
            return;
        }

        return this.tabManager.changeWorkspace(workspaceId);
    }

    createWorkspace(workspaceName = null) {
        if (!this.initialized) {
            return;
        }

        if (!workspaceName) {
            return this.workspacesContext.createNoNameWorkspace();
        } else {
            return this.workspacesContext.createWorkspace(workspaceName);
        }
    }

    async showWorkspacesModal(workspaceId = null) {
        if (!this.initialized) {
            return;
        }

        // Get current workspace ID if none is provided
        if (!workspaceId) {
            workspaceId = this.getCurrentWorkspaceID();
        }

        // Show workspaces config modal
        await this.modalManager.showWorkspacesModal(workspaceId);
    }

    getWorkspaceIconUrl(icon) {
        return this.iconManager.getWorkspaceIconUrl(icon);
    }

    dispatchWorkspaceChangeEvent() {
        const event = new CustomEvent("natsumiWorkspaceChanged", {
            bubbles: true,
            cancelable: false,
            detail: {
                workspaceId: this.getCurrentWorkspaceID()
            }
        });
        document.dispatchEvent(event);
    }
}

class NatsumiWorkspaceIndicator {
    // An indicator to show the current workspace in the tabs sidebar

    constructor() {
        this.workspacesWrapper = null;
        this.indicatorNode = null;
        this.tabsListNode = null;
        this.verticalTabsMutationObserver = null;
    }

    init() {
        this.workspacesWrapper = document.body.natsumiWorkspacesWrapper;

        // Set up observer
        // This also runs the UI initialization so we can only run it once workspace data is available
        if (this.workspacesWrapper.properInit) {
            this.setVerticalTabsMutationObserver();
        } else {
            this.workspacesWrapper.dataRetrieveQueue.push(this.setVerticalTabsMutationObserver.bind(this));
        }
    }

    addIndicator() {
        // Remove existing indicator
        let existingIndicator = document.getElementById("natsumi-workspace-indicator");
        if (existingIndicator) {
            existingIndicator.remove();
        }

        // Create workspace indicator
        const indicatorXULString = `
            <div id="natsumi-workspace-indicator">
                <div id="natsumi-workspace-indicator-icon"></div>
                <div id="natsumi-workspace-indicator-name"></div>
                <div id="natsumi-workspace-indicator-clear"></div>
            </div>
        `
        let indicatorFragment = convertToXUL(indicatorXULString);

        // Append to sidebar then refetch indicator
        let tabBrowserNode = document.getElementById("tabbrowser-tabs");
        let tabsListNode = document.getElementById("tabbrowser-arrowscrollbox");
        tabBrowserNode.insertBefore(indicatorFragment, tabsListNode); // We can't use appendChild otherwise Firefox will start breaking

        // Refetch indicator node
        this.indicatorNode = document.getElementById("natsumi-workspace-indicator");

        // Ensure order
        let tabsClearer = document.getElementById("natsumi-tabs-clearer");
        if (tabsClearer) {
            tabBrowserNode.insertBefore(this.indicatorNode, tabsClearer);
        }
        let staticTabsContainer = document.getElementById("natsumi-static-tabs-container");
        if (staticTabsContainer) {
            tabBrowserNode.insertBefore(this.indicatorNode, staticTabsContainer);
        }

        // Set click event listener
        this.indicatorNode.addEventListener("click", () => {
            if (this.workspacesWrapper) {
                this.workspacesWrapper.showWorkspacesModal();
            }
        });

        let clearButton = this.indicatorNode.querySelector("#natsumi-workspace-indicator-clear");
        clearButton.addEventListener("click", (event) => {
            event.stopPropagation();

            // Clear all tabs
            if (document.body.natsumiUnpinnedTabsClearer) {
                document.body.natsumiUnpinnedTabsClearer.clearTabs();
            }
        });

        // Refresh data
        this.refreshIndicator();
    }

    setVerticalTabsMutationObserver() {
        const verticalTabsElement = document.getElementById("vertical-tabs");

        if (this.verticalTabsMutationObserver) {
            this.verticalTabsMutationObserver.disconnect();
        }

        // Check if #tabbrowser-tabs exists
        const tabsListNode = document.getElementById("tabbrowser-tabs");
        if (tabsListNode) {
            this.tabsListNode = tabsListNode;
            this.addIndicator();
        }

        this.verticalTabsMutationObserver = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                const tabsListNode = document.getElementById("tabbrowser-tabs");
                if (tabsListNode) {
                    const needsUIInit = this.tabsListNode === null;
                    this.tabsListNode = tabsListNode;

                    if (needsUIInit) {
                        this.addIndicator();
                    }
                } else {
                    this.tabsListNode = null;
                }
            });
        });

        this.verticalTabsMutationObserver.observe(verticalTabsElement, {childList: true, subtree: true});
    }

    refreshIndicator() {
        if (!this.indicatorNode) {
            return;
        }

        // Get current workspace data
        let currentWorkspaceData = getCurrentWorkspaceData();

        // Set icon and name
        this.indicatorNode.style.setProperty("--natsumi-workspace-icon", currentWorkspaceData["icon"]);
        let nameNode = this.indicatorNode.querySelector("#natsumi-workspace-indicator-name");
        nameNode.textContent = currentWorkspaceData["name"];
    }
}

class NatsumiWorkspacePinsManager {
    constructor() {
        this.workspacesWrapper = null;
    }

    init() {
        this.workspacesWrapper = document.body.natsumiWorkspacesWrapper;
        document.addEventListener("select", this.onSelectEvent.bind(this));
    }

    onSelectEvent(event) {
        if (event.target.id !== "tabbrowser-tabpanels") {
            return;
        }

        let workspaceSpecificPinsEnabled = false;
        if (ucApi.Prefs.get("natsumi.tabs.workspace-specific-pins").exists()) {
            workspaceSpecificPinsEnabled = ucApi.Prefs.get("natsumi.tabs.workspace-specific-pins").value;
        }

        if (!workspaceSpecificPinsEnabled) {
            return;
        }

        let currentWorkspaceId = this.workspacesWrapper.getCurrentWorkspaceID();
        let currentTabWorkspaceId = gBrowser.selectedTab.getAttribute("floorpWorkspaceId");

        if (currentTabWorkspaceId !== currentWorkspaceId) {
            // Somehow we've ended up in a different workspace
            this.workspacesWrapper.setCurrentWorkspaceID(currentTabWorkspaceId);
        }
    }

    updatePinnedTabs() {
        // Check if workspace-specific pinned tabs are enabled
        let workspaceSpecificPinsEnabled = false;
        if (ucApi.Prefs.get("natsumi.tabs.workspace-specific-pins").exists()) {
            workspaceSpecificPinsEnabled = ucApi.Prefs.get("natsumi.tabs.workspace-specific-pins").value;
        }

        if (!workspaceSpecificPinsEnabled) {
            return;
        }

        let pinnedTabsContainer = document.getElementById("pinned-tabs-container");
        let pinnedTabs = pinnedTabsContainer.querySelectorAll("tab");

        let defaultWorkspaceId = this.workspacesWrapper.getDefaultWorkspaceID();
        let currentWorkspaceId = this.workspacesWrapper.getCurrentWorkspaceID();

        let hiddenCount = 0;
        let shownCount = 0;

        for (let tab of pinnedTabs) {
            let tabWorkspaceId = tab.getAttribute("floorpWorkspaceId") ?? defaultWorkspaceId;

            if (tabWorkspaceId === currentWorkspaceId) {
                tab.removeAttribute("hidden");
                tab.removeAttribute("natsumi-workspace-hidden");
                gBrowser.moveTabTo(tab, {elementIndex: shownCount});
                shownCount++;
            } else {
                tab.setAttribute("hidden", "true");
                tab.setAttribute("natsumi-workspace-hidden", "");
                hiddenCount++;
            }
        }

        gBrowser.tabContainer._invalidateCachedVisibleTabs();
    }

    updatePinnedTabsContainer() {
        let pinnedTabsContainer = document.getElementById("pinned-tabs-container");
        let pinnedTabsSplitter = document.getElementById("vertical-pinned-tabs-splitter");

        // Get visible pinned tabs
        let visiblePinnedTabs = pinnedTabsContainer.querySelectorAll("tab:not([hidden='true'])");

        if (visiblePinnedTabs.length === 0) {
            pinnedTabsContainer.setAttribute("hidden", "true");

            if (pinnedTabsSplitter) {
                pinnedTabsSplitter.setAttribute("hidden", "true");
            }
        } else {
            pinnedTabsContainer.removeAttribute("hidden");

            if (pinnedTabsSplitter) {
                pinnedTabsSplitter.removeAttribute("hidden");
            }
        }
    }

    freePinnedTabs(workspaceId = null) {
        let pinnedTabsContainer = document.getElementById("pinned-tabs-container");
        let hiddenPinnedTabs = pinnedTabsContainer.querySelectorAll("tab[natsumi-workspace-hidden]");

        if (workspaceId) {
            hiddenPinnedTabs = pinnedTabsContainer.querySelectorAll(`tab[natsumi-workspace-hidden][floorpWorkspaceId='${workspaceId}']`);
        }

        for (let tab of hiddenPinnedTabs) {
            tab.removeAttribute("hidden");
            tab.removeAttribute("natsumi-workspace-hidden");
        }
    }
}

let currentWorkspaceId = null;
let currentWorkspaceIndex = 0;
let currentWorkspaceAnimationTimeout = null;

function getCurrentWorkspaceData() {
    const tabsListNode = document.getElementById("tabbrowser-arrowscrollbox");
    const availableTabs = tabsListNode.querySelectorAll("tab:not([hidden])");
    const workspaceData = JSON.parse(ucApi.Prefs.get("floorp.workspaces.v4.store").value)
    let workspaceName = null;
    let workspaceIcon = null;
    let workspaceId = workspaceData["defaultID"];

    // Attempt to get workspace ID from workspaces wrapper if available
    if (document.body.natsumiWorkspacesWrapper && document.body.natsumiWorkspacesWrapper.properInit) {
        workspaceId = document.body.natsumiWorkspacesWrapper.getCurrentWorkspaceID();
    } else {
        // Use fallback method (fetch from tabs, not as accurate)
        if (availableTabs.length > 0) {
            if ("floorpWorkspaceId" in availableTabs[0].attributes) {
                workspaceId = availableTabs[0].attributes["floorpWorkspaceId"].value;
            }
        }
    }

    const newWorkspaceIndex = workspaceData["order"].indexOf(workspaceId);
    let shouldAnimate = false;
    let shouldAnimateLeft = false;
    if (newWorkspaceIndex !== -1) {
        if (currentWorkspaceIndex !== newWorkspaceIndex) {
            shouldAnimate = true;
            if (newWorkspaceIndex < currentWorkspaceIndex) {
                shouldAnimateLeft = true;
            }
        }

        currentWorkspaceIndex = newWorkspaceIndex;
    }

    for (let workspaceIndex in workspaceData["data"]) {
        let workspace = workspaceData["data"][workspaceIndex];
        if (workspace[0] === workspaceId) {
            workspaceName = workspace[1]["name"]
            workspaceIcon = workspace[1]["icon"]

            try {
                if (!workspaceIcon) {
                    workspaceIcon = `url(${document.body.natsumiWorkspacesWrapper.getWorkspaceIconUrl("fingerprint")})`;
                } else {
                    workspaceIcon = `url(${document.body.natsumiWorkspacesWrapper.getWorkspaceIconUrl(workspaceIcon)})`;
                }
            } catch (e) {
                console.warn("Failed to get workspace icon: ", e);
                workspaceIcon = null;
            }

            break;
        }
    }

    if (shouldAnimate) {
        if (currentWorkspaceAnimationTimeout) {
            clearTimeout(currentWorkspaceAnimationTimeout);
        }

        let tabsList = document.getElementById("tabbrowser-tabs");
        tabsList.removeAttribute("natsumi-workspace-animation");
        tabsList.removeAttribute("natsumi-workspace-animation-left");

        if (shouldAnimateLeft) {
            tabsList.setAttribute("natsumi-workspace-animation-left", "");
        }

        tabsList.setAttribute("natsumi-workspace-animation", "");
        currentWorkspaceAnimationTimeout = setTimeout(() => {
            tabsList.removeAttribute("natsumi-workspace-animation");
            tabsList.removeAttribute("natsumi-workspace-animation-left");
        }, 300);
    }

    return {"id": workspaceId, "name": workspaceName, "icon": workspaceIcon};
}

function copyWorkspaceName() {
    let currentWorkspaceData = getCurrentWorkspaceData();
    let sidebar = document.getElementById("sidebar-main");
    sidebar.style.setProperty("--natsumi-workspace-name", `"${currentWorkspaceData["name"]}"`);
    sidebar.style.setProperty("--natsumi-workspace-icon", currentWorkspaceData["icon"]);
}

function copyAllWorkspaces() {
    let workspacesButton = document.getElementById("workspaces-toolbar-button");

    if (!workspacesButton) {
        // Mutation observer will take care of this for us
        return;
    }

    const workspaceData = JSON.parse(ucApi.Prefs.get("floorp.workspaces.v4.store").value)
    const currentWorkspaceData = getCurrentWorkspaceData();

    // Clear existing workspaces
    const allWorkspaceIcons = workspacesButton.querySelectorAll(".natsumi-workspace-icon");

    allWorkspaceIcons.forEach(icon => {
        if (icon.parentNode === workspacesButton) {
            workspacesButton.removeChild(icon);
        }
    });

    let buttonAdded = false;
    let perWorkspaceData = {};
    for (let index in workspaceData["data"]) {
        let workspace = workspaceData["data"][index];
        perWorkspaceData[workspace[0]] = workspace[1];
    }

    for (let workspaceId of workspaceData["order"]) {
        let workspace = perWorkspaceData[workspaceId];
        let workspaceIcon = workspace["icon"];

        if (!workspaceIcon) {
            workspaceIcon = `url(${document.body.natsumiWorkspacesWrapper.getWorkspaceIconUrl("fingerprint")})`;
        } else {
            workspaceIcon = `url(${document.body.natsumiWorkspacesWrapper.getWorkspaceIconUrl(workspaceIcon)})`;
        }

        let newButtonNode = document.createElement("div");
        newButtonNode.classList.add("natsumi-workspace-icon");
        newButtonNode.style.setProperty("--natsumi-workspace-icon", workspaceIcon);

        if (workspaceId === currentWorkspaceData["id"]) {
            newButtonNode.classList.add("natsumi-workspace-active");
        }

        newButtonNode.addEventListener("click", (event) => {
            if (!event.shiftKey) {
                event.stopPropagation();
                event.preventDefault();
                document.body.natsumiWorkspacesWrapper.setCurrentWorkspaceID(workspaceId);
            }
        })

        workspacesButton.appendChild(newButtonNode);
        buttonAdded = true;
    }

    if (buttonAdded) {
        workspacesButton.setAttribute("natsumi-has-workspaces", "");
    } else {
        workspacesButton.removeAttribute("natsumi-has-workspaces");
    }
}

let tabsList = document.getElementById("tabbrowser-arrowscrollbox");
let pinnedTabsContainer = document.getElementById("pinned-tabs-container");
let isFloorp = false;

if (ucApi.Prefs.get("natsumi.browser.type").exists) {
    isFloorp = ucApi.Prefs.get("natsumi.browser.type").value === "floorp";
}

if (isFloorp) {
    try {
        let workspacesButton = document.getElementById("workspaces-toolbar-button");

        if (workspacesButton) {
            copyAllWorkspaces();
        } else {
            // Let mutation observers handle this
            let toolbarsObserver = new MutationObserver(function (mutations) {
                mutations.forEach(function (mutationRecord) {
                    let newWorkspacesButton = document.getElementById("workspaces-toolbar-button");
                    if (newWorkspacesButton) {
                        copyAllWorkspaces();

                        // Ensure workspace button is always visible
                        let isVerticalTabs = ucApi.Prefs.get("sidebar.verticalTabs").value;
                        if (isVerticalTabs && newWorkspacesButton.parentNode.id === "TabsToolbar-customization-target") {
                            // This shouldn't be here
                            let targetStatusbar = false;
                            if (ucApi.Prefs.get("natsumi.theme.patch-move-workspaces-to-statusbar").exists) {
                                targetStatusbar = ucApi.Prefs.get("natsumi.theme.patch-move-workspaces-to-statusbar").value;
                            }

                            if (targetStatusbar) {
                                let statusBar = document.getElementById("nora-statusbar");
                                let existingButtons = statusBar.querySelectorAll("toolbarbutton");

                                if (existingButtons.length === 2) {
                                    statusBar.insertBefore(newWorkspacesButton, existingButtons[1]);
                                } else {
                                    statusBar.appendChild(newWorkspacesButton);
                                }
                            } else {
                                let navbarTarget = document.getElementById("nav-bar-customization-target");
                                let sidebarNode = navbarTarget.querySelector("sidebar-button");

                                if (sidebarNode) {
                                    navbarTarget.insertBefore(newWorkspacesButton, sidebarNode.nextSibling);
                                } else {
                                    navbarTarget.insertBefore(newWorkspacesButton, navbarTarget.firstChild);
                                }
                            }
                        }

                        toolbarsObserver.disconnect(); // Stop observing once the button exists
                    }
                });
            });

            let toolbox = document.getElementById("nav-bar-customization-target");
            let statusBar = document.getElementById("nora-statusbar");

            toolbarsObserver.observe(toolbox, {attributes: true, childList: true, subtree: true});

            if (statusBar) {
                toolbarsObserver.observe(statusBar, {attributes: true, childList: true, subtree: true});
            }
        }

        let tabsListObserver = new MutationObserver(function (mutations) {
            // Prevent infinite loops
            if (mutations.length === 1) {
                let mutation = mutations[0];
                if (mutation.target.id === "natsumi-workspace-indicator-name") {
                    return;
                }
            }

            copyWorkspaceName();
            copyAllWorkspaces();

            if (document.body.natsumiWorkspaceIndicator) {
                document.body.natsumiWorkspaceIndicator.refreshIndicator();
            }

            if (document.body.natsumiWorkspacePinsManager) {
                document.body.natsumiWorkspacePinsManager.updatePinnedTabs();
                document.body.natsumiWorkspacePinsManager.updatePinnedTabsContainer();
            }

            // Get current workspace ID
            if (document.body.natsumiWorkspacesWrapper) {
                let newWorkspaceId = document.body.natsumiWorkspacesWrapper.getCurrentWorkspaceID();
                if (currentWorkspaceId !== newWorkspaceId) {
                    currentWorkspaceId = newWorkspaceId;
                    document.body.natsumiWorkspacesWrapper.dispatchWorkspaceChangeEvent();
                    applyCustomTheme();
                }
            }
        });
        tabsListObserver.observe(tabsList, {attributes: true, childList: true, subtree: true});

        let pinnedTabsObserver = new MutationObserver(function (mutations) {
            if (document.body.natsumiWorkspacePinsManager) {
                document.body.natsumiWorkspacePinsManager.updatePinnedTabsContainer();
            }
        });
        pinnedTabsObserver.observe(pinnedTabsContainer, {childList: true});

        Services.prefs.addObserver("natsumi.tabs.workspace-specific-pins", () => {
            let workspaceSpecificPinsEnabled = ucApi.Prefs.get("natsumi.tabs.workspace-specific-pins").value;

            if (document.body.natsumiWorkspacePinsManager) {
                if (!workspaceSpecificPinsEnabled) {
                    // Free all pinned tabs
                    document.body.natsumiWorkspacePinsManager.freePinnedTabs();
                } else {
                    // Update pinned tabs to reflect current workspace
                    document.body.natsumiWorkspacePinsManager.updatePinnedTabs();
                }

                document.body.natsumiWorkspacePinsManager.updatePinnedTabsContainer();
            }
        });
        Services.prefs.addObserver("floorp.workspaces.v4.store", () => {
            copyWorkspaceName();
            copyAllWorkspaces();
        });

        // Initialize workspaces wrapper
        document.body.natsumiWorkspacesWrapper = new NatsumiWorkspacesWrapper();
        document.body.natsumiWorkspacesWrapper.dataRetrieveQueue.push(() => {
            copyWorkspaceName();
            applyCustomTheme();
        });
        document.body.natsumiWorkspacesWrapper.init().then(() => {
            // Initialize workspace indicator
            document.body.natsumiWorkspaceIndicator = new NatsumiWorkspaceIndicator();
            document.body.natsumiWorkspaceIndicator.init();

            // Initialize workspace pins manager
            document.body.natsumiWorkspacePinsManager = new NatsumiWorkspacePinsManager();
            document.body.natsumiWorkspacePinsManager.init();
        })
    } catch (e) {
        console.error(e);
    }
}
