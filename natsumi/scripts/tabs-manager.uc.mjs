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

let isFloorp = false;
let floorpWorkspacesEnabled = false;

// Events that may need static tabs to refresh their visibility
// Source: https://searchfox.org/firefox-main/source/browser/components/firefoxview/OpenTabs.sys.mjs
const mayNeedRefreshEvents = [
    // "TabAttrModified", (may not need this, also may cause performance issues)
    "TabClose",
    "TabMove",
    "TabOpen",
    "TabPinned",
    "TabUnpinned",
    "SplitViewCreated",
    "SplitViewRemoved",
    "select"
];

if (ucApi.Prefs.get("natsumi.browser.type").exists()) {
    isFloorp = ucApi.Prefs.get("natsumi.browser.type").value === "floorp";

    if (ucApi.Prefs.get("floorp.workspaces.enabled").exists()) {
        floorpWorkspacesEnabled = ucApi.Prefs.get("floorp.workspaces.enabled").value;
    }
}

function convertToXUL(node) {
    // noinspection JSUnresolvedReference
    return window.MozXULElement.parseXULToFragment(node);
}

class NatsumiTabsManager {
    constructor() {
        this.tabsList = null;
    }

    init() {
        this.tabsList = document.getElementById("tabbrowser-tabs");
    }

    ensureAccessible(tab) {
        if (!this.tabsList.allTabs.includes(tab)) {
            this.tabsList.allTabs.push(tab);
        }
    }
}

class NatsumiStaticTabsManager {
    constructor() {
        this.staticTabs = {}; // Workspace IDs are to be used here, if not possible use "default"
        this.usesWorkspaces = false;
        this.staticTabsNode = null;
        this.tabDragOverUnpinned = false;
    }

    init() {
        // We only need to look out for floorpWorkspacesEnabled, since it will be false anyway if
        // isFloorp is false
        this.usesWorkspaces = floorpWorkspacesEnabled;

        // Create Static Tabs container
        this.staticTabsNode = this._createStaticTabNode();
        let tabsClearerNode = document.getElementById("natsumi-tabs-clearer");
        let tabsListNode = document.getElementById("tabbrowser-tabs");
        tabsListNode.insertBefore(this.staticTabsNode, tabsClearerNode); // Tabs clearer already exists at this stage

        // Remove scroll buttons
        let scrollButtonUp = this.staticTabsNode.shadowRoot.getElementById("scrollbutton-up");
        let scrollButtonDown = this.staticTabsNode.shadowRoot.getElementById("scrollbutton-down");
        scrollButtonUp.style.display = "none";
        scrollButtonDown.style.display = "none";

        // Add "Add to Static Tabs" context menu item
        this.addContextMenuButton();

        // Restore static tabs
        this.restoreStaticTabs();

        // Add workspaces change event listener
        if (this.usesWorkspaces) {
            document.addEventListener("natsumiWorkspaceChanged", this.updateStaticTabsForWorkspace.bind(this));
        }

        // Add event listeners for things that require static tabs to be made accessible
        for (let eventName of mayNeedRefreshEvents) {
            document.addEventListener(eventName, () => {
                // Run after a short delay to allow tab operations to complete
                setTimeout(() => {
                    this.ensureStaticTabsAreAccessible();
                }, 50);
            });
        }

        // Intercept events for tab dragging
        let unpinnedTabsContainer = document.getElementById("tabbrowser-arrowscrollbox");
        unpinnedTabsContainer.addEventListener("dragover", (event) => {
            console.log(event);
            if (gBrowser.selectedTab.hasAttribute("natsumi-static-tab")) {
                // Prevent dragging
                this.tabDragOverUnpinned = true;
                event.preventDefault();
                event.stopPropagation();
            }
        }, true);
        unpinnedTabsContainer.addEventListener("drop", (event) => {
            console.log(event);
            if (this.tabDragOverUnpinned) {
                this.tabDragOverUnpinned = false;
                event.preventDefault();
                event.stopPropagation();

                // Remove static tabs from static tabs
                this.removeMultipleFromStaticTabs(gBrowser.selectedTabs);
            }
        });
        document.addEventListener("dragover", (event) => {
            console.log(event);
        });
        this.staticTabsNode.addEventListener("drop", (event) => {
            console.log(event);
            event.preventDefault();
            event.stopPropagation();
            this.tabDragOverUnpinned = false;

            // We're in the static tabs container, so we take action depending on selected tabs
            let moveTabsIntoStatic = false;
            let reorderStaticTabs = true;

            for (let tab of gBrowser.selectedTabs) {
                if (!tab.hasAttribute("natsumi-static-tab")) {
                    moveTabsIntoStatic = true;
                    reorderStaticTabs = false;
                    break;
                }
            }

            if (moveTabsIntoStatic) {
                this.addMultipleToStaticTabs(gBrowser.selectedTabs);
            } else if (reorderStaticTabs) {
                this.insertStaticTabs(gBrowser.selectedTabs, event);
            }

            // Reset styling for tabs
            for (let tab of this.staticTabsNode.querySelectorAll("tab")) {
                tab.setAttribute("style", "");
            }
        })
    }

    determineInsertIndex(tabs, event) {
        let insertIndex = 0;

        // Get total selected static tabs
        let selectedStatic = 0;
        let selectedStaticIndexes = [];
        let allStaticTabs = Array.from(this.staticTabsNode.querySelectorAll("tab"));
        for (let tab of tabs) {
            if (tab.hasAttribute("natsumi-static-tab")) {
                selectedStatic += 1;
                let tabIndex = allStaticTabs.indexOf(tab);
                if (tabIndex > -1) {
                    selectedStaticIndexes.push(tabIndex);
                }
            }
        }

        // Get mouse position relative to static tabs container
        let rect = this.staticTabsNode.getBoundingClientRect();
        let mouseX = event.clientX - rect.left;
        let mouseY = event.clientY - rect.top;

        // Get current Y scroll position
        let scrollTop = this.staticTabsNode.scrollTop;

        // Find mouse position with scroll offset
        let adjustedMouseY = mouseY + scrollTop;

        // Get height of first tab
        let firstTab = this.staticTabsNode.querySelector("tab");
        if (!firstTab) {
            return 0; // No tabs, insert at start
        }

        let tabHeight = firstTab.getBoundingClientRect().height;

        // Calculate index based on adjusted mouse Y position
        insertIndex = Math.round(adjustedMouseY / tabHeight);

        // Adjust index to account for selected static tabs
        let finalIndex = insertIndex;
        for (let index of selectedStaticIndexes) {
            if (index < insertIndex) {
                finalIndex -= 1;
            }
        }

        return finalIndex;
    }

    insertStaticTabs(tabs, event) {

    }

    addContextMenuButton() {
        // Create context menu items
        let addContextMenuButton = document.createXULElement("menuitem");
        addContextMenuButton.id = "context_addToStaticTabs";
        addContextMenuButton.setAttribute("label", "Add to Static Tabs");

        let removeContextMenuButton = document.createXULElement("menuitem");
        removeContextMenuButton.id = "context_removeFromStaticTabs";
        removeContextMenuButton.setAttribute("label", "Remove from Static Tabs");

        // Add to context menu
        let tabContextMenu = document.getElementById("tabContextMenu");
        let unloadTabButton = document.getElementById("context_unloadTab");
        tabContextMenu.insertBefore(addContextMenuButton, unloadTabButton);
        tabContextMenu.insertBefore(removeContextMenuButton, unloadTabButton);

        // Register event handlers
        let mainPopupSet = document.getElementById("mainPopupSet");
        mainPopupSet.addEventListener("command", (event) => {
            if (event.target.id === "context_addToStaticTabs") {
                // Check if tabs have been multiselected
                const isMultiSelected = gBrowser.multiSelectedTabsCount > 0;
                if (isMultiSelected) {
                    this.addMultipleToStaticTabs(gBrowser.selectedTabs);
                } else {
                    this.addToStaticTabs(TabContextMenu.contextTab);
                }
            } else if (event.target.id === "context_removeFromStaticTabs") {
                // Check if tabs have been multiselected
                const isMultiSelected = gBrowser.multiSelectedTabsCount > 0;
                if (isMultiSelected) {
                    this.removeMultipleFromStaticTabs(gBrowser.selectedTabs);
                } else {
                    this.removeFromStaticTabs(TabContextMenu.contextTab);
                }
            }
        })
    }

    restoreStaticTabs() {
        // To be done later
    }

    _createStaticTabNode() {
        let staticTabsNode = document.createXULElement("arrowscrollbox");
        staticTabsNode.id = "natsumi-static-tabs-container";
        staticTabsNode.setAttribute("clicktoscroll", "");
        staticTabsNode.setAttribute("smoothscroll", "true");

        // Set orient depending on vertical tabs toggle
        if (ucApi.Prefs.get("sidebar.verticalTabs").value) {
            staticTabsNode.setAttribute("orient", "vertical");
        } else {
            staticTabsNode.setAttribute("orient", "horizontal");
        }

        return staticTabsNode;
    }

    _checkIfTabIsStatic(tab, workspaceId) {
        let workspaceIdKey = workspaceId ?? "default";
        if (!this.staticTabs[workspaceIdKey]) {
            return false;
        }

        return this.staticTabs[workspaceIdKey].includes(tab);
    }

    _registerStaticTab(tab, workspaceId) {
        let workspaceIdKey = workspaceId ?? "default";
        if (!this.staticTabs[workspaceIdKey]) {
            this.staticTabs[workspaceIdKey] = [];
        }
        this.staticTabs[workspaceIdKey].push(tab);
    }

    _unregisterStaticTab(tab) {
        for (let workspaceId in this.staticTabs) {
            let index = this.staticTabs[workspaceId].indexOf(tab);
            if (index > -1) {
                this.staticTabs[workspaceId].splice(index, 1);
                return;
            }
        }
    }

    updateStaticTabsForWorkspace(workspaceId = null) {
        if (!this.usesWorkspaces) {
            return;
        }

        let workspaceTabs = [];
        let workspaceIdKey = workspaceId ?? "default";

        if (this.usesWorkspaces && !workspaceId) {
            // Get current workspace ID
            workspaceIdKey = document.body.natsumiWorkspacesWrapper.getCurrentWorkspaceID();
        }

        if (this.staticTabs[workspaceIdKey]) {
            workspaceTabs = this.staticTabs[workspaceIdKey];
        }

        // Hide static tabs from other workspaces
        let allStaticTabs = this.staticTabsNode.querySelector("tab");
        for (let tab of allStaticTabs) {
            if (workspaceTabs.includes(tab)) {
                tab.removeAttribute("hidden");
            } else {
                tab.setAttribute("hidden", "true");
            }
        }

        // Update tab visibility cache (or whatever it is, I honestly don't know)
        gBrowser.tabContainer._invalidateCachedVisibleTabs();
    }

    ensureStaticTabsAreAccessible() {
        let allStaticTabs = this.staticTabsNode.querySelectorAll("tab");

        // Keep track of which static tabs haven't been updated
        let notUpdatedTabs = [];
        for (let workspaceId in this.staticTabs) {
            for (let tab of this.staticTabs[workspaceId]) {
                notUpdatedTabs.push(tab);
            }
        }

        for (let tab of allStaticTabs) {
            document.body.natsumiTabsManager.ensureAccessible(tab);

            if (notUpdatedTabs.includes(tab)) {
                // Remove from not updated tabs
                let index = notUpdatedTabs.indexOf(tab);
                if (index > -1) {
                    notUpdatedTabs.splice(index, 1);
                }
            }
        }

        // Assume other tabs have been moved
        for (let tab of notUpdatedTabs) {
            tab.removeAttribute("natsumi-static-tab");
            tab.setAttribute("style", "");
            this._unregisterStaticTab(tab);
        }
    }

    addMultipleToStaticTabs(tabs, workspaceId = null, updateTabOnly = false) {
        for (let tab of tabs) {
            this.addToStaticTabs(tab, workspaceId, updateTabOnly);
        }
    }

    addToStaticTabs(tab, workspaceId = null, updateTabOnly = false) {
        // Ensure tab isn't static already (unless we're only updating the tab node)
        if (this._checkIfTabIsStatic(tab, workspaceId) && !updateTabOnly) {
            return;
        }
        if (tab.hasAttribute("natsumi-static-tab") && updateTabOnly) {
            return;
        }

        // Move tab to static tabs container
        this.staticTabsNode.appendChild(tab);

        // Mark tab as static
        tab.setAttribute("natsumi-static-tab", "true");

        // Register Static Tab
        if (!updateTabOnly) {
            this._registerStaticTab(tab, workspaceId);
        }
    }

    removeMultipleFromStaticTabs(tabs) {
        for (let tab of tabs) {
            this.removeFromStaticTabs(tab);
        }
    }

    removeFromStaticTabs(tab) {
        // Ensure tab is static
        if (!tab.hasAttribute("natsumi-static-tab")) {
            return;
        }

        // Move tab back to unpinned tabs container
        let unpinnedTabsPeriphery = document.getElementById("tabbrowser-arrowscrollbox-periphery");
        unpinnedTabsPeriphery.parentElement.insertBefore(tab, unpinnedTabsPeriphery);

        // Unmark tab as static
        tab.removeAttribute("natsumi-static-tab");

        // Reset inline styles (so it doesn't stay shifted)
        tab.setAttribute("style", "");

        // Unregister Static Tab
        this._unregisterStaticTab(tab);
    }
}

class NatsumiUnpinnedTabsClearer {
    // An indicator to show the current workspace in the tabs sidebar

    constructor() {
        this.clearerNode = null;
        this.clearerButton = null;
    }

    init() {
        // Create workspace indicator
        const clearerXULString = `
            <div id="natsumi-tabs-clearer">
                <div id="natsumi-tabs-clearer-separator"></div>
                <div id="natsumi-tabs-clearer-button">
                    Clear                
                </div>
            </div>
        `
        let clearerFragment = convertToXUL(clearerXULString);

        // Append to sidebar then refetch clearer
        let tabBrowserNode = document.getElementById("tabbrowser-tabs");
        let tabsListNode = document.getElementById("tabbrowser-arrowscrollbox");
        tabBrowserNode.insertBefore(clearerFragment, tabsListNode); // We can't use appendChild otherwise Firefox will start breaking

        // Refetch nodes
        this.clearerNode = document.getElementById("natsumi-tabs-clearer");
        this.clearerButton = document.getElementById("natsumi-tabs-clearer-button");

        // Set click event listener
        this.clearerButton.addEventListener("click", () => {
            this.clearTabs();
        });
    }

    clearTabs() {
        // Get tabs
        let tabsList = document.getElementById("tabbrowser-arrowscrollbox");
        let tabs = Array.from(tabsList.querySelectorAll("tab:not([hidden='true'])"));
        let allTabs = Array.from(tabsList.querySelectorAll("tab:not([hidden='true'])"));

        if (ucApi.Prefs.get("natsumi.sidebar.clear-keep-selected").exists()) {
            if (ucApi.Prefs.get("natsumi.sidebar.clear-keep-selected").value) {
                tabs = tabsList.querySelectorAll(
                    "tab:not([hidden='true']):not([multiselected='true']):not([selected='true'])"
                );
            }
        }

        if (tabs.length === 0) {
            return;
        }

        let shouldOpen = false;
        if (ucApi.Prefs.get("natsumi.sidebar.clear-open-newtab").exists()) {
            if (ucApi.Prefs.get("natsumi.sidebar.clear-open-newtab").value) {
                shouldOpen = true;
            }
        }

        // Check pinned tabs container
        let pinnedTabsContainer = document.getElementById("pinned-tabs-container");
        let pinnedTabs = [];
        if (pinnedTabsContainer) {
            pinnedTabs = pinnedTabsContainer.querySelectorAll("tab:not([hidden='true'])");
        }

        // Only override shouldOpen if there are absolutely no tabs left
        if (pinnedTabs.length === 0) {
            let closeWithLastTab = ucApi.Prefs.get("browser.tabs.closeWindowWithLastTab").value;
            if (closeWithLastTab) {
                shouldOpen = true;
            }
        }

        if (shouldOpen) {
            // Check if we'll have no tabs after clearing
            if (tabs.length === allTabs.length) {
                gBrowser.addTab(BROWSER_NEW_TAB_URL, {
                    skipAnimation: true,
                    inBackground: true,
                    triggeringPrincipal: gBrowser.contentPrincipal,
                });
            }
        }

        gBrowser.removeTabs(tabs);
        document.body.natsumiStaticTabsManager.ensureStaticTabsAreAccessible();
    }
}

if (!document.body.natsumiTabsManager) {
    document.body.natsumiTabsManager = new NatsumiTabsManager();
    document.body.natsumiTabsManager.init();
}
if (!document.body.natsumiUnpinnedTabsClearer) {
    document.body.natsumiUnpinnedTabsClearer = new NatsumiUnpinnedTabsClearer();
    document.body.natsumiUnpinnedTabsClearer.init();
}
if (!document.body.natsumiStaticTabsManager) {
    document.body.natsumiStaticTabsManager = new NatsumiStaticTabsManager();
    document.body.natsumiStaticTabsManager.init();
}