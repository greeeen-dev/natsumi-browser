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

import { NatsumiActorWrapper } from "./actors/js-actors.js";
import * as ucApi from "chrome://userchromejs/content/uc_api.sys.mjs";

function convertToXUL(node) {
    // noinspection JSUnresolvedReference
    return window.MozXULElement.parseXULToFragment(node);
}

class NatsumiGlimpse {
    constructor() {
        this.glimpse = {};
        this.glimpseTabs = []; // Array to quickly check if a tab is a glimpse tab
        this.currentGlimpseTab = null;
        this.glimpseInterval = null;
    }

    init() {
        // Ensure Glimpse enabled pref exists
        if (!ucApi.Prefs.get("natsumi.glimpse.enabled").exists()) {
            ucApi.Prefs.get("natsumi.glimpse.enabled").value = true;
        }

        // Set event listener
        document.addEventListener("select", this.onSelect.bind(this));
        document.addEventListener("keydown", this.onKeyDown.bind(this));
        gBrowser.tabContainer.addEventListener("TabClose", this.onTabClose.bind(this));
        gBrowser.addProgressListener({
            onLocationChange: () => {
                let glimpseParentTab = this.currentGlimpseTab;

                // Attempt to fetch glimpse tab so we don't have to wait for currentGlimpseTab to change
                if (!glimpseParentTab) {
                    let currentTab = gBrowser.selectedTab;
                    let currentTabId = currentTab.linkedPanel;
                    let glimpseData = this.glimpse[currentTabId];

                    if (!glimpseData) {
                        // Try to check if this is a Glimpse tab
                        let isGlimpseTab = this.glimpseTabs.includes(currentTabId);
                        if (isGlimpseTab) {
                            let parentTabId = this.getGlimpseParent(currentTabId);
                            if (parentTabId) {
                                glimpseParentTab = document.querySelector(`tab[linkedpanel=${parentTabId}]`);
                            }
                        }
                    } else {
                        // This is a parent of Glimpse
                        glimpseParentTab = currentTab;
                    }
                }

                if (glimpseParentTab) {
                    requestAnimationFrame(() => {
                        glimpseParentTab.linkedBrowser.browsingContext.isActive = true;
                        glimpseParentTab.linkedBrowser.renderLayers = true;
                    })
                }
            }
        });
    }

    setGlimpseInterval() {
        this.glimpseInterval = setInterval(() => {
            if (this.currentGlimpseTab && this.currentGlimpseTab.linkedBrowser) {
                if (!this.currentGlimpseTab.linkedBrowser.renderLayers) {
                    requestAnimationFrame(() => {
                        this.currentGlimpseTab.linkedBrowser.browsingContext.isActive = true;
                        this.currentGlimpseTab.linkedBrowser.renderLayers = true;
                    });
                }
            }
        }, 50);
    }

    removeGlimpseInterval() {
        if (this.glimpseInterval) {
            clearInterval(this.glimpseInterval);
            this.glimpseInterval = null;
        }
    }

    onMouseMove() {
        if (this.currentGlimpseTab && this.currentGlimpseTab.linkedBrowser) {
            requestAnimationFrame(() => {
                this.currentGlimpseTab.linkedBrowser.browsingContext.isActive = true;
                this.currentGlimpseTab.linkedBrowser.renderLayers = true;
            });
        }
    }

    onTabClose(event) {
        let closedTab = event.target;
        let closedTabId = closedTab.linkedPanel;

        // Check if this is a glimpse tab
        let isGlimpseParent = closedTabId in this.glimpse;
        let isGlimpseTab = this.glimpseTabs.includes(closedTabId);

        if (isGlimpseParent && isGlimpseTab) {
            // This should never happen
            console.error("A tab is both a Glimpse parent and Glimpse tab; this should never happen. Please restart your browser.");
            return;
        }

        if (isGlimpseTab) {
            let shouldSwitchToParent = false;

            // Check if Glimpse is being closed
            if (closedTab.hasAttribute("natsumi-glimpse-closed")) {
                // Here we assume the tab was closed through the controls
                // In this case, we just switch to the parent
                shouldSwitchToParent = true;
            }

            // Find parent tab
            let parentTabId = null;

            for (let parentId in this.glimpse) {
                if (this.glimpse[parentId].glimpseTabId === closedTabId) {
                    parentTabId = parentId;
                    break;
                }
            }

            if (!parentTabId) {
                return;
            }

            // Unregister glimpse
            this.unregisterGlimpse(parentTabId);

            // Switch to parent tab if needed
            let parentTab = document.querySelector(`tab[linkedpanel=${parentTabId}]`);
            if (parentTab) {
                let parentBrowser = parentTab.linkedBrowser;
                parentTab.removeAttribute("natsumi-glimpse-selected");
                parentBrowser.removeAttribute("natsumi-has-glimpse");

                if (shouldSwitchToParent) {
                    gBrowser.selectedTab = parentTab;
                } else {
                    // Check if parent is a pinned tab
                    if (parentTab.pinned) {
                        // Don't close parent tab in this case, instead switch to the first non-pinned tab
                        let nonPinnedTabs = document.getElementById("tabbrowser-arrowscrollbox");
                        let firstNonPinned = nonPinnedTabs.querySelector("& > .tabbrowser-tab:not([hidden]):not([natsumi-glimpse-tab])");

                        if (firstNonPinned) {
                            gBrowser.selectedTab = firstNonPinned;
                        } else {
                            window.BrowserCommands.openTab();
                        }
                        return;
                    }

                    gBrowser.removeTab(parentTab);
                }
            }
        } else if (isGlimpseParent) {
            // Close glimpse tab too
            let glimpseTabId = this.glimpse[closedTabId].glimpseTabId;
            let glimpseTab = document.querySelector(`tab[linkedpanel=${glimpseTabId}]`);
            if (glimpseTab) {
                gBrowser.removeTab(glimpseTab);
            }

            // Unregister glimpse
            this.unregisterGlimpse(closedTabId);
        }
    }

    onSelect() {
        let tabSelected = gBrowser.selectedTab;
        let tabSelectedId = tabSelected.linkedPanel;
        let tabSelectedBrowser = tabSelected.linkedBrowser;
        let tabbox = document.getElementById("tabbrowser-tabbox");

        // Run sanity check (ensure Glimpse tab is always hidden)
        for (let tab of gBrowser.tabs) {
            if (tab.attributes["natsumi-glimpse-tab"] && !tab.hidden) {
                tab.setAttribute("hidden", "true");
            }
        }
        gBrowser.tabContainer._invalidateCachedVisibleTabs();

        // Remove attributes from previous glimpse tab
        if (this.currentGlimpseTab) {
            let currentGlimpseTabId = this.currentGlimpseTab.linkedPanel;
            let glimpseTabId = this.glimpse[currentGlimpseTabId]?.glimpseTabId;

            if (!glimpseTabId) {
                return;
            }

            // Check if we're on the glimpse tab right now
            if (tabSelectedId === glimpseTabId) {
                return;
            }

            // Get glimpse tab
            let glimpseTab = document.querySelector(`tab[linkedpanel=${glimpseTabId}]`);

            if (!glimpseTab) {
                // Unregister glimpse then return
                this.unregisterGlimpse(tabSelectedId);
                return;
            }

            // Remove glimpse attributes
            let glimpseBrowser = glimpseTab.linkedBrowser;
            this.currentGlimpseTab.removeAttribute("natsumi-glimpse-selected");
            this.currentGlimpseTab.linkedBrowser.removeAttribute("natsumi-has-glimpse");
            glimpseBrowser.removeAttribute("natsumi-is-glimpse");
            tabbox.removeAttribute("natsumi-glimpse-active");
            this.currentGlimpseTab.renderLayers = false;
            this.currentGlimpseTab = null;
        }

        // Check if we're in a glimpse tab
        if (this.glimpseTabs.includes(tabSelectedId)) {
            // Find glimpse parent
            let parentTabId = this.getGlimpseParent(tabSelectedId);
            if (!parentTabId) {
                return;
            }

            tabSelected = document.querySelector(`tab[linkedpanel=${parentTabId}]`);
            tabSelectedId = parentTabId;
            tabSelectedBrowser = tabSelected.linkedBrowser;
        }

        // Check if there's glimpse data available
        if (this.glimpse[tabSelectedId]) {
            let glimpseData = this.glimpse[tabSelectedId];
            let glimpseTabId = glimpseData.glimpseTabId;

            // Get glimpse tab
            let glimpseTab = document.querySelector(`tab[linkedpanel=${glimpseTabId}]`);

            if (!glimpseTab) {
                // Unregister glimpse then return
                this.unregisterGlimpse(tabSelectedId);
                return;
            }

            // Show glimpse tab
            let glimpseBrowser = glimpseTab.linkedBrowser;
            tabSelectedBrowser.setAttribute("natsumi-has-glimpse", "true");
            glimpseBrowser.setAttribute("natsumi-is-glimpse", "true");
            tabbox.setAttribute("natsumi-glimpse-active", "");
            this.currentGlimpseTab = tabSelected;
            gBrowser.selectedTab = glimpseTab;
            tabSelected.setAttribute("natsumi-glimpse-selected", "");
            requestAnimationFrame(() => {
                tabSelected.linkedBrowser.renderLayers = true;
            });
            this.setGlimpseInterval();
        }
    }

    onKeyDown(event) {
        if (event.key.toLowerCase() === "escape") {
            // Check if current tab is a glimpse tab
            if (this.currentGlimpseTab) {
                // Get Glimpse tab ID
                let glimpseTab = this.glimpse[this.currentGlimpseTab.linkedPanel];
                if (!glimpseTab) {
                    return;
                }

                let glimpseTabId = glimpseTab.glimpseTabId;

                // Deactivate Glimpse with animation
                this.deactivateGlimpseWithAnim(glimpseTabId);
            }
        }
    }

    canActivateGlimpse() {
        // Get current tab
        let currentTab = gBrowser.selectedTab;
        let currentTabId = currentTab.linkedPanel; // We can treat the linked panel as the tab's "ID"

        // If current tab is a Glimpse tab/parent, we cannot activate Glimpse
        return !this.glimpseTabs.includes(currentTabId);
    }

    activateGlimpse(link, launcher = false) {
        // Get current tab and browser
        let currentTab = gBrowser.selectedTab;
        let currentTabId = currentTab.linkedPanel; // We can treat the linked panel as the tab's "ID"
        let currentBrowser = currentTab.linkedBrowser;
        let tabbox = document.getElementById("tabbrowser-tabbox");

        // Do not activate if this is a Glimpse tab, but open tab anyways
        if (this.glimpseTabs.includes(currentTabId)) {
            if (launcher) {
                return;
            }

            gBrowser.addTab(link, {
                skipAnimation: true,
                inBackground: true,
                triggeringPrincipal: gBrowser.contentPrincipal,
            });
            return;
        }

        // Get tab container ID (if it exists)
        let tabContainerId = null;
        if (currentTab.hasAttribute("usercontextid")) {
            tabContainerId = currentTab.getAttribute("usercontextid");
        }

        // Open glimpse link in new tab
        let newTab = gBrowser.addTab(link, {
            skipAnimation: true,
            inBackground: true,
            userContextId: tabContainerId,
            triggeringPrincipal: gBrowser.contentPrincipal,
        });
        let newTabId = newTab.linkedPanel;

        // Get matching browser element
        let newBrowser = newTab.linkedBrowser;

        // Set glimpse status
        currentBrowser.setAttribute("natsumi-has-glimpse", "true");
        newBrowser.setAttribute("natsumi-is-glimpse", "true");
        newBrowser.setAttribute("natsumi-glimpse-parent", currentTabId);
        tabbox.setAttribute("natsumi-glimpse-active", "");
        tabbox.setAttribute("natsumi-glimpse-animate", "");
        newTab.setAttribute("natsumi-glimpse-tab", "true");
        newTab.setAttribute("hidden", "true");
        gBrowser.tabContainer._invalidateCachedVisibleTabs();

        // Create Glimpse controls
        let glimpseControlsFragment = convertToXUL(`
            <div class="natsumi-glimpse-controls">
                <div class="natsumi-glimpse-close-button"></div>
                <div class="natsumi-glimpse-expand-button"></div>
            </div>
        `);
        let newBrowserContainer = newBrowser.parentElement.parentElement.parentElement;
        newBrowserContainer.appendChild(glimpseControlsFragment);

        // Create Glimpse indicator
        let glimpseIndicatorFragment = convertToXUL(`
            <div class="natsumi-glimpse-indicator">
                <div class="natsumi-glimpse-indicator-icon"></div>
                <div class="natsumi-glimpse-indicator-label">
                    You are viewing this tab in Glimpse mode.
                </div>
            </div>
        `);
        newBrowserContainer.appendChild(glimpseIndicatorFragment);

        // Set event listeners for Glimpse controls
        let glimpseCloseButton = newBrowserContainer.querySelector(".natsumi-glimpse-close-button");
        let glimpseExpandButton = newBrowserContainer.querySelector(".natsumi-glimpse-expand-button");

        glimpseCloseButton.addEventListener("click", () => {
            this.deactivateGlimpseWithAnim(newTabId);
        });
        glimpseExpandButton.addEventListener("click", () => {
            this.graduateGlimpseWithAnim(newTabId);
        });

        // Register glimpse
        this.glimpse[currentTabId] = {
            glimpseTabId: newTabId
        }
        this.glimpseTabs.push(newTabId);
        this.currentGlimpseTab = currentTab;

        gBrowser.selectedTab = newTab;

        requestAnimationFrame(() => {
            currentBrowser.docShellIsActive = true;
            currentBrowser.renderLayers = true;
        })

        // Set natsumi-glimpse-selected attribute
        currentTab.setAttribute("natsumi-glimpse-selected", "");

        setTimeout(() => {
            tabbox.removeAttribute("natsumi-glimpse-animate");
        }, 300);
    }

    ensureGlimpse(glimpseTabId) {
        return this.glimpseTabs.includes(glimpseTabId);
    }

    getGlimpseParent(glimpseTabId) {
        // Find parent tab
        let parentTabId = null;

        for (let parentId in this.glimpse) {
            if (this.glimpse[parentId].glimpseTabId === glimpseTabId) {
                parentTabId = parentId;
                break;
            }
        }

        return parentTabId;
    }

    deactivateGlimpseWithAnim(glimpseTabId) {
        // Get glimpse tab
        let glimpseTab = document.querySelector(`tab[linkedpanel=${glimpseTabId}]`);
        if (!glimpseTab) {
            return;
        }

        // Ensure this is a glimpse tab
        if (!this.ensureGlimpse(glimpseTabId)) {
            return;
        }

        // This is sufficient to ensure that this is a Glimpse tab
        let tabbox = document.getElementById("tabbrowser-tabbox");
        tabbox.setAttribute("natsumi-glimpse-animate-disappear", "true");
        setTimeout(() => {
            this.deactivateGlimpse(glimpseTabId);
            tabbox.removeAttribute("natsumi-glimpse-animate-disappear");
        }, 300);
    }

    deactivateGlimpse(glimpseTabId) {
        // Get glimpse tab
        let glimpseTab = document.querySelector(`tab[linkedpanel=${glimpseTabId}]`);
        if (!glimpseTab) {
            return;
        }

        // Ensure this is a glimpse tab
        if (!this.ensureGlimpse(glimpseTabId)) {
            return;
        }

        // Find parent tab
        let parentTabId = this.getGlimpseParent(glimpseTabId);
        if (!parentTabId) {
            return;
        }

        // Add attribute to indicate closure
        glimpseTab.setAttribute("natsumi-glimpse-closed", "true");

        // Close Glimpse tab
        gBrowser.removeTab(glimpseTab);
    }

    graduateGlimpseWithAnim(glimpseTabId) {
        // Get glimpse tab
        let glimpseTab = document.querySelector(`tab[linkedpanel=${glimpseTabId}]`);
        if (!glimpseTab) {
            return;
        }

        // Ensure this is a glimpse tab
        if (!this.ensureGlimpse(glimpseTabId)) {
            return;
        }

        // This is sufficient to ensure that this is a Glimpse tab
        let tabbox = document.getElementById("tabbrowser-tabbox");
        tabbox.setAttribute("natsumi-glimpse-animate-graduate", "true");
        setTimeout(() => {
            this.graduateGlimpse(glimpseTabId);
            tabbox.removeAttribute("natsumi-glimpse-animate-graduate");
        }, 300);
    }

    graduateGlimpse(glimpseTabId) {
        // Get glimpse tab
        let glimpseTab = document.querySelector(`tab[linkedpanel=${glimpseTabId}]`);
        if (!glimpseTab) {
            return;
        }

        // Ensure this is a glimpse tab
        if (!this.ensureGlimpse(glimpseTabId)) {
            return;
        }

        // Find parent tab
        let parentTabId = this.getGlimpseParent(glimpseTabId);
        if (!parentTabId) {
            return;
        }

        // Graduate Glimpse tab
        glimpseTab.removeAttribute("natsumi-glimpse-tab");
        glimpseTab.removeAttribute("hidden");
        gBrowser.tabContainer._invalidateCachedVisibleTabs();
        let glimpseBrowser = glimpseTab.linkedBrowser;
        glimpseBrowser.removeAttribute("natsumi-is-glimpse");
        glimpseBrowser.removeAttribute("natsumi-glimpse-parent");

        // Destroy Glimpse controls
        let glimpseTabContainer = glimpseBrowser.parentElement.parentElement.parentElement;
        let glimpseControls = glimpseTabContainer.querySelector(".natsumi-glimpse-controls");
        let glimpseIndicator = glimpseTabContainer.querySelector(".natsumi-glimpse-indicator");
        if (glimpseControls) {
            glimpseControls.remove();
        }
        if (glimpseIndicator) {
            glimpseIndicator.remove();
        }

        // Remove attributes from parent tab
        let parentTab = document.querySelector(`tab[linkedpanel=${parentTabId}]`);
        let parentBrowser = parentTab.linkedBrowser;
        let nonPinnedTabs = document.getElementById("tabbrowser-arrowscrollbox");
        parentTab.removeAttribute("natsumi-glimpse-selected");
        parentBrowser.removeAttribute("natsumi-has-glimpse");

        // Move graduated Glimpse tab if needed
        if (parentTab.pinned) {
            // Move to the beginning of non-pinned tabs
            let firstNonPinned = nonPinnedTabs.querySelector("& > .tabbrowser-tab");

            if (firstNonPinned) {
                gBrowser.moveTabToStart(glimpseTab);
            }
        } else if (glimpseTab.previousSibling !== parentTab) {
            let allNonpinned = nonPinnedTabs.querySelectorAll("& > .tabbrowser-tab");
            let parentTabIndex = Array.from(allNonpinned).indexOf(parentTab);

            // Check if parent tab is the last tab
            if (parentTab.nextSibling) {
                gBrowser.moveTabTo(glimpseTab, {elementIndex: parentTabIndex + gBrowser.pinnedTabCount + 1});
            } else {
                gBrowser.moveTabToEnd(glimpseTab);
            }
        }

        // Unregister glimpse
        this.unregisterGlimpse(parentTabId);
    }

    unregisterGlimpse(parentTabId) {
        // Remove from glimpse tabs array
        let glimpseTabId = this.glimpse[parentTabId].glimpseTabId;
        let index = this.glimpseTabs.indexOf(glimpseTabId);
        if (index > -1) {
            this.glimpseTabs.splice(index, 1);
        }

        // Unregister glimpse
        delete this.glimpse[parentTabId];
    }
}

class NatsumiGlimpseLauncher {
    constructor() {
        this.launcherNode = null;
        this.launcherInputNode = null;
        this.searchEngine = null;
    }

    init() {
        let glimpseLauncherXUL = `
            <div id="natsumi-glimpse-launcher">
                <div id="natsumi-glimpse-launcher-search"></div>
                <div id="natsumi-glimpse-launcher-input-container">
                    <div id="natsumi-glimpse-launcher-input-autocomplete"></div>
                    <html:input id="natsumi-glimpse-launcher-input" type="text" placeholder="Open in Glimpse..."/>
                </div>
            </div>
        `
        let glimpseLauncherFragment = convertToXUL(glimpseLauncherXUL);

        // Add to browser
        document.body.appendChild(glimpseLauncherFragment);

        // Fetch nodes
        this.launcherNode = document.getElementById("natsumi-glimpse-launcher");
        this.launcherInputNode = document.getElementById("natsumi-glimpse-launcher-input");
        this.launcherInputContainer = document.getElementById("natsumi-glimpse-launcher-input-container");

        // Ensure notifications node shows on top of launcher
        let notificationsContainer = document.getElementById("natsumi-notifications-container");
        if (notificationsContainer) {
            document.body.insertBefore(this.launcherNode, notificationsContainer);
        }

        // Set event listeners
        this.launcherInputNode.addEventListener("keydown", this.onKeyDownEvent.bind(this));
        document.addEventListener("select", this.onSelectEvent.bind(this));
    }

    onSelectEvent(event) {
        if (event.target.id === "tabbrowser-tabpanels") {
            this.resetLauncher();
        }
    }

    onKeyDownEvent(event) {
        // Check if text is selected
        let textSelected = this.launcherInputNode.selectionStart !== this.launcherInputNode.selectionEnd;
        let autocompleteText = document.getElementById("natsumi-glimpse-launcher-input-autocomplete")

        if (event.key.toLowerCase() === "enter") {
            // Open in Glimpse
            if (this.launcherInputNode.value.trim() === "") {
                return;
            }

            let url = this.launcherInputNode.value.trim();
            if (this.searchEngine) {
                url = this.getSearchUrl(this.searchEngine, url);
            } else {
                // Check if input is a URL
                let isUrl = this.isUrl(url, true);
                if (!isUrl) {
                    // Treat as search query with default search engine
                    url = this.getDefaultSearchUrl(url);
                }
            }

            window.natsumiGlimpse.activateGlimpse(url, true);
            this.resetLauncher();
        } else if (event.key.toLowerCase() === " ") {
            if (this.launcherInputNode.value.startsWith("@") && !this.launcherInputNode.value.includes(" ")) {
                this.autoCompleteSearch(true).then((searchEngine) => {
                    if (searchEngine) {
                        event.preventDefault();
                        event.stopPropagation();
                        autocompleteText.textContent = "";
                        this.launcherInputContainer.removeAttribute("natsumi-glimpse-launcher-has-autocomplete");

                        requestAnimationFrame(() => {
                            this.launcherInputNode.value = "";
                        })
                    } else {
                        autocompleteText.textContent = "";
                        this.launcherInputContainer.removeAttribute("natsumi-glimpse-launcher-has-autocomplete");
                    }
                });
            }
        } else if (event.key.toLowerCase() === "escape") {
            this.resetLauncher();
        } else if (event.key.toLowerCase() === "tab") {
            event.preventDefault();
            event.stopPropagation();
            if (this.launcherInputContainer.hasAttribute("natsumi-glimpse-launcher-has-autocomplete")) {
                this.autoCompleteSearch().then((searchEngine) => {
                    if (searchEngine) {
                        autocompleteText.textContent = "";
                        this.launcherInputContainer.removeAttribute("natsumi-glimpse-launcher-has-autocomplete");
                    }
                });
            }
        } else if (event.key.toLowerCase() === "backspace" || event.key.toLowerCase() === "back") {
            // Check if input is empty
            if (this.launcherInputNode.value === "") {
                // Reset any search engine selection
                this.clearSearchEngine();
            } else {
                // Check if autocomplete is active
                if (this.launcherInputContainer.hasAttribute("natsumi-glimpse-launcher-has-autocomplete")) {
                    if (!textSelected) {
                        event.preventDefault();
                    }
                    autocompleteText.textContent = "";
                    this.launcherInputContainer.removeAttribute("natsumi-glimpse-launcher-has-autocomplete");
                }
            }
        } else {
            if (!this.searchEngine && event.key.length === 1) {
                // Check if autocomplete is possible
                let currentValue = this.launcherInputNode.value + event.key;
                if (currentValue.startsWith("@") && !currentValue.includes(" ") && currentValue.length > 1) {
                    this.getAutoComplete(true, false, this.launcherInputNode.value + event.key).then((searchAlias) => {
                        if (searchAlias) {
                            autocompleteText.textContent = searchAlias;
                            this.launcherInputContainer.setAttribute("natsumi-glimpse-launcher-has-autocomplete", "");
                        } else {
                            autocompleteText.textContent = "";
                            this.launcherInputContainer.removeAttribute("natsumi-glimpse-launcher-has-autocomplete");
                        }
                    });
                } else {
                    autocompleteText.textContent = "";
                    this.launcherInputContainer.removeAttribute("natsumi-glimpse-launcher-has-autocomplete");
                }
            }
        }
    }

    getDefaultSearchUrl(query) {
        return Services.search.defaultEngine.getSubmission(query).uri.spec;
    }

    getSearchUrl(searchEngine, query) {
        return searchEngine._urls[0].getSubmission(query, "UTF-8")._uri.spec;
    }

    isUrl(input, ignoreProtocol = false) {
        if (input.startsWith("about:") && !input.includes(" ")) {
            // This is a Firefox about: page
            return true;
        }

        if (!input.startsWith("http://") && !input.startsWith("https://") && !input.includes("://") && ignoreProtocol) {
            // Add https:// to the input to test if it's a valid URL
            if (input.includes(".") && !input.endsWith(".")) {
                input = "https://" + input;
            }
        }

        try {
            let url = new URL(input);
            return (url.protocol === "http:" || url.protocol === "https:");
        } catch (e) {
            return false;
        }
    }

    activateLauncher() {
        if (!window.natsumiGlimpse.canActivateGlimpse()) {
            return;
        }

        this.launcherNode.setAttribute("open", "");
        this.launcherInputNode.focus();
    }

    resetLauncher() {
        this.launcherInputNode.value = "";
        this.searchEngine = null;
        this.launcherNode.removeAttribute("search-engine-selected");
        this.launcherNode.removeAttribute("open");
        this.launcherInputNode.blur();
    }

    async getAutoComplete(returnAlias = false, strict = false, override = null) {
        let inputValue = this.launcherInputNode.value.trim();

        if (override) {
            inputValue = override.trim();
        }

        // Check if spaces still exist
        if (inputValue.includes(" ")) {
            // This is either a search query or a URL
            return;
        }

        const searchEngines = await Services.search.getVisibleEngines();
        let selectedEngine = null;
        let selectedAlias = null;

        for (let engine of searchEngines) {
            // Get aliases
            let engineAliases = engine.aliases;
            if (engine._metadata) {
                if (engine._metadata.alias) {
                    engineAliases.push(engine._metadata.alias);
                }
            }

            for (let alias of engineAliases) {
                let aliasMatches = false;
                if (strict) {
                    aliasMatches = (alias.toLowerCase() === inputValue.toLowerCase());
                } else {
                    aliasMatches = (alias.toLowerCase().startsWith(inputValue.toLowerCase()));
                }
                if (aliasMatches) {
                    // Found matching search engine
                    selectedEngine = engine;
                    selectedAlias = alias;
                    break;
                }
            }
        }

        if (returnAlias) {
            if (!selectedAlias) {
                return;
            }

            selectedAlias = selectedAlias.slice(inputValue.length);
            selectedAlias = inputValue + selectedAlias;

            return selectedAlias;
        }

        return selectedEngine;
    }

    async autoCompleteSearch(strict = false) {
        if (this.searchEngine) {
            return;
        }

        let engine = await this.getAutoComplete(false, strict);
        if (engine) {
            this.setSearchEngine(engine);
        }

        return engine;
    }

    setSearchEngine(engine) {
        this.searchEngine = engine;
        this.launcherNode.setAttribute("search-engine-selected", `${engine._name}`);
        this.launcherInputNode.value = "";

        // Set value for search engine display
        let searchEngineNode = document.getElementById("natsumi-glimpse-launcher-search");
        searchEngineNode.textContent = `${engine._name}`;
    }

    clearSearchEngine() {
        this.searchEngine = null;
        this.launcherNode.removeAttribute("search-engine-selected");
    }
}

let JSWindowActors = {
    NatsumiGlimpse: {
        parent: {
            esModuleURI: "chrome://natsumi/content/scripts/actors/NatsumiGlimpseParent.sys.mjs"
        },
        child: {
            esModuleURI: "chrome://natsumi/content/scripts/actors/NatsumiGlimpseChild.sys.mjs",
            events: {
                DOMContentLoaded: {},
                click: {
                    capture: true
                },
                mousedown: {
                    capture: true
                },
                mouseup: {
                    capture: true
                },
                drag: {
                    capture: true
                }
            },
        },
        allFrames: true,
        matches: [
            "*://*/*"
        ],
        enablePreference: "natsumi.glimpse.enabled"
    }
}

if (!window.natsumiGlimpse) {
    window.natsumiGlimpse = new NatsumiGlimpse();
    window.natsumiGlimpse.init();
}
if (!window.natsumiGlimpseLauncher) {
    try {
        document.body.natsumiGlimpseLauncher = new NatsumiGlimpseLauncher();
        document.body.natsumiGlimpseLauncher.init();
    } catch (e) {
        console.error(e);
    }
}

try {
    let actorWrapper = new NatsumiActorWrapper();
    actorWrapper.addWindowActors(JSWindowActors);
} catch (e) {
    console.error("Failed to add Natsumi JS Window Actors:", e);
}
