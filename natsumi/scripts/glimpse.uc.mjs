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
        this.multiGlimpse = false;
        this.chainingGlimpse = false;
    }

    init() {
        // Ensure Glimpse prefs exist
        if (!ucApi.Prefs.get("natsumi.glimpse.enabled").exists()) {
            ucApi.Prefs.set("natsumi.glimpse.enabled", true);
        }
        if (!ucApi.Prefs.get("natsumi.glimpse.multi").exists()) {
            ucApi.Prefs.set("natsumi.glimpse.multi", true);
        }

        // Fetch multi glimpse pref
        this.multiGlimpse = ucApi.Prefs.get("natsumi.glimpse.multi").value;
        Services.prefs.addObserver("natsumi.glimpse.multi", () => {
            this.multiGlimpse = ucApi.Prefs.get("natsumi.glimpse.multi").value;
        });

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
                    this.ensureGlimpseParentRender();
                }
            }
        });
    }

    ensureGlimpseParentRender() {
        if (!this.currentGlimpseTab || !this.currentGlimpseTab.linkedBrowser) {
            return;
        }

        this.currentGlimpseTab.linkedBrowser.browsingContext.isActive = true;
        this.currentGlimpseTab.linkedBrowser.renderLayers = true;

        requestAnimationFrame(() => {
            this.ensureGlimpseParentRender();
        })
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

            // Ignore tabs set to be ignored
            if (closedTab.hasAttribute("natsumi-glimpse-ignore")) {
                return;
            }

            // Find parent tab
            let parentTabId = null;

            for (let parentId in this.glimpse) {
                if (this.glimpse[parentId]["tabs"].includes(closedTabId)) {
                    parentTabId = parentId;
                    break;
                }
            }

            if (!parentTabId) {
                return;
            }

            // Get Glimpse data
            let glimpseData = this.glimpse[parentTabId];
            if (glimpseData["tabs"].length > 1 && !shouldSwitchToParent) {
                // Remove closed tab from glimpse data
                this.removeFromGlimpse(parentTabId, closedTabId);
                return;
            }

            // Unregister glimpse
            this.unregisterGlimpse(parentTabId);
            if (this.currentGlimpseTab) {
                this.currentGlimpseTab.renderLayers = false;
                this.currentGlimpseTab = null;
            }

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

            if (glimpseData["tabs"].length > 1 && shouldSwitchToParent) {
                // Indicates Esc was pressed (closes all Glimpse tabs)
                let glimpseTabIds = glimpseData["tabs"];
                for (let glimpseTabId of glimpseTabIds) {
                    let glimpseTab = document.querySelector(`tab[linkedpanel=${glimpseTabId}]`);
                    if (glimpseTab) {
                        // Check if we're already closing this tab
                        if (glimpseTab.hasAttribute("natsumi-glimpse-closed")) {
                            continue;
                        }

                        glimpseTab.setAttribute("natsumi-glimpse-ignore", "true");
                        gBrowser.removeTab(glimpseTab);
                    }
                }

                // Remove Glimpse attributes from tabbox
                let tabbox = document.getElementById("tabbrowser-tabbox");
                tabbox.removeAttribute("natsumi-glimpse-multi-active");
                tabbox.removeAttribute("natsumi-glimpse-active");
            }
        } else if (isGlimpseParent) {
            // Close glimpse tab too
            let glimpseTabIds = this.glimpse[closedTabId]["tabs"];

            for (let glimpseTabId of glimpseTabIds) {
                let glimpseTab = document.querySelector(`tab[linkedpanel=${glimpseTabId}]`);
                if (glimpseTab) {
                    // Check if we're already closing this tab
                    if (glimpseTab.hasAttribute("natsumi-glimpse-closed")) {
                        continue;
                    }

                    glimpseTab.setAttribute("natsumi-glimpse-ignore", "true");
                    gBrowser.removeTab(glimpseTab);
                }
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
            let glimpseTabIds = this.glimpse[currentGlimpseTabId]["tabs"];

            // Check if we're on the glimpse tab right now
            if (glimpseTabIds.includes(tabSelectedId)) {
                return;
            }

            for (let glimpseTabId of glimpseTabIds) {
                // Get glimpse tab
                let glimpseTab = document.querySelector(`tab[linkedpanel=${glimpseTabId}]`);

                if (!glimpseTab) {
                    // Handle glimpse update accordingly
                    if (this.glimpse[currentGlimpseTabId]["tabs"].length > 1) {
                        this.removeFromGlimpse(currentGlimpseTabId, glimpseTabId);
                        continue;
                    } else {
                        this.unregisterGlimpse(tabSelectedId);
                        break;
                    }
                }

                let glimpseBrowser = glimpseTab.linkedBrowser;

                // Remove glimpse attributes
                glimpseBrowser.removeAttribute("natsumi-is-glimpse");
            }

            this.currentGlimpseTab.removeAttribute("natsumi-glimpse-selected");
            this.currentGlimpseTab.linkedBrowser.removeAttribute("natsumi-has-glimpse");
            tabbox.removeAttribute("natsumi-glimpse-active");
            tabbox.removeAttribute("natsumi-glimpse-multi-active");
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
            let glimpseTabIds = glimpseData["tabs"];

            // Run sanity check
            for (let glimpseTabId of glimpseTabIds) {
                // Get glimpse tab
                let glimpseTab = document.querySelector(`tab[linkedpanel=${glimpseTabId}]`);

                if (!glimpseTab) {
                    // Handle glimpse update accordingly
                    if (this.glimpse[tabSelectedId]["tabs"].length > 1) {
                        this.removeFromGlimpse(tabSelectedId, glimpseTabId);
                    } else {
                        this.unregisterGlimpse(tabSelectedId);
                        return;
                    }
                }
            }

            // Refresh Glimpse data
            glimpseData = this.glimpse[tabSelectedId];

            // Show Glimpse tabs
            for (let glimpseTabId of this.glimpse[tabSelectedId]["tabs"]) {
                // Get glimpse tab
                let glimpseTab = document.querySelector(`tab[linkedpanel=${glimpseTabId}]`);
                let glimpseTabIndex = this.glimpse[tabSelectedId]["tabs"].indexOf(glimpseTabId);

                // Show glimpse tab
                let glimpseBrowser = glimpseTab.linkedBrowser;
                let glimpseTabContainer = glimpseBrowser.parentElement.parentElement.parentElement;
                glimpseBrowser.setAttribute("natsumi-is-glimpse", "true");
                glimpseTabContainer.removeAttribute("natsumi-glimpse-hidden-above");
                glimpseTabContainer.removeAttribute("natsumi-glimpse-hidden-below");

                if (glimpseTabIndex < glimpseData["index"]) {
                    glimpseTabContainer.setAttribute("natsumi-glimpse-hidden-above", "");
                } else if (glimpseTabIndex > glimpseData["index"]) {
                    glimpseTabContainer.setAttribute("natsumi-glimpse-hidden-below", "");
                } else {
                    gBrowser.selectedTab = glimpseTab;
                }
            }

            // Check if we're on multi-Glimpse
            if (glimpseTabIds.length > 1) {
                tabbox.setAttribute("natsumi-glimpse-multi-active", "");
            }

            let currentGlimpseTab = document.querySelector(`tab[linkedpanel=${glimpseData["tabs"][glimpseData["index"]]}]`);
            tabSelectedBrowser.setAttribute("natsumi-has-glimpse", "true");
            tabbox.setAttribute("natsumi-glimpse-active", "");
            tabSelected.setAttribute("natsumi-glimpse-selected", "");
            this.currentGlimpseTab = tabSelected;
            gBrowser.selectedTab = currentGlimpseTab;
            requestAnimationFrame(() => {
                tabSelected.linkedBrowser.renderLayers = true;
            });
            this.ensureGlimpseParentRender();
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

                let glimpseTabId = glimpseTab["tabs"][glimpseTab["index"]];

                // Deactivate Glimpse with animation
                this.deactivateGlimpseWithAnim(glimpseTabId);
            }
        }
    }

    activateChaining() {
        this.chainingGlimpse = true;
    }

    releaseChain() {
        this.chainingGlimpse = false;
    }

    canActivateGlimpse() {
        // Get current tab
        let currentTab = gBrowser.selectedTab;
        let currentTabId = currentTab.linkedPanel; // We can treat the linked panel as the tab's "ID"

        // If multi-glimpse is enabled, always return true
        if (this.multiGlimpse) {
            return true;
        }

        // If current tab is a Glimpse tab/parent, we cannot activate Glimpse
        return !this.glimpseTabs.includes(currentTabId);
    }

    activateGlimpse(link, launcher = false) {
        if (this.chainingGlimpse) {
            document.body.natsumiGlimpseChainer.addToChain(link);
            return;
        }

        // Get current tab and browser
        let currentTab = gBrowser.selectedTab;
        let currentTabId = currentTab.linkedPanel; // We can treat the linked panel as the tab's "ID"
        let currentBrowser = currentTab.linkedBrowser;
        let tabbox = document.getElementById("tabbrowser-tabbox");

        // Check if the tab is a Glimpse parent
        let isGlimpseParent = currentTabId in this.glimpse;
        let isGlimpseTab = this.glimpseTabs.includes(currentTabId);

        if ((isGlimpseParent || isGlimpseTab) && !this.multiGlimpse) {
            // Do not activate if multi-glimpse is disabled, but open tab anyways
            if (!launcher) {
                gBrowser.addTab(link, {
                    skipAnimation: true,
                    inBackground: true,
                    triggeringPrincipal: gBrowser.contentPrincipal,
                });
            }

            return;
        }

        if (isGlimpseTab) {
            // Set current tab to parent
            let parentTab = this.getGlimpseParent(currentTabId);
            if (!parentTab) {
                return;
            }

            currentTab = document.querySelector(`tab[linkedpanel=${parentTab}]`);
            currentTabId = currentTab.linkedPanel;
            currentBrowser = currentTab.linkedBrowser;
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
                <div class="natsumi-glimpse-multi-close-button"></div>
                <div class="natsumi-glimpse-expand-button"></div>
            </div>
        `);
        let glimpseMultiControlsFragment = convertToXUL(`
            <div class="natsumi-glimpse-multi-controls">
                <div class="natsumi-glimpse-prev-button"></div>
                <div class="natsumi-glimpse-next-button"></div>
            </div>
        `);
        let newBrowserContainer = newBrowser.parentElement.parentElement.parentElement;
        newBrowserContainer.appendChild(glimpseControlsFragment);
        newBrowserContainer.appendChild(glimpseMultiControlsFragment);

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
        let glimpseMultiCloseButton = newBrowserContainer.querySelector(".natsumi-glimpse-multi-close-button");
        let glimpseExpandButton = newBrowserContainer.querySelector(".natsumi-glimpse-expand-button");
        let glimpseMultiPrevButton = newBrowserContainer.querySelector(".natsumi-glimpse-prev-button");
        let glimpseMultiNextButton = newBrowserContainer.querySelector(".natsumi-glimpse-next-button");

        glimpseCloseButton.addEventListener("click", () => {
            this.deactivateGlimpseWithAnim(newTabId);
        });
        glimpseMultiCloseButton.addEventListener("click", () => {
            // Check tab count
            let glimpseData = this.glimpse[currentTabId];
            if (glimpseData["tabs"].length <= 1) {
                this.deactivateGlimpseWithAnim(newTabId);
            } else {
                this.deactivateGlimpse(newTabId, true);
            }
        });
        glimpseExpandButton.addEventListener("click", () => {
            this.graduateGlimpseWithAnim(newTabId);
        });
        glimpseMultiPrevButton.addEventListener("click", () => {
            this.cycleGlimpseTabs(currentTabId, false);
        });
        glimpseMultiNextButton.addEventListener("click", () => {
            this.cycleGlimpseTabs(currentTabId, true);
        });

        // Register glimpse
        if (!this.glimpse[currentTabId]) {
            this.glimpse[currentTabId] = {"index": 0, "tabs": []};
        }
        this.glimpse[currentTabId]["tabs"].push(newTabId);
        this.glimpse[currentTabId]["index"] = this.glimpse[currentTabId]["tabs"].length - 1;
        this.glimpseTabs.push(newTabId);
        this.currentGlimpseTab = currentTab;

        let parentTabContent = currentTab.querySelector(".tab-content");
        if (!currentTab.pinned) {
            parentTabContent.setAttribute("natsumi-glimpse-indicator", "");
            parentTabContent.style.setProperty("--natsumi-glimpse-tabs", `"${this.glimpse[currentTabId]["tabs"].length}"`);
        }

        if (this.glimpse[currentTabId]["tabs"].length > 1) {
            tabbox.setAttribute("natsumi-glimpse-multi-active", "");

            // Assume we're in multi-Glimpse
            for (let glimpseTabId of this.glimpse[currentTabId]["tabs"]) {
                let glimpseTab = document.querySelector(`tab[linkedpanel=${glimpseTabId}]`);
                let glimpseBrowser = glimpseTab.linkedBrowser;
                let glimpseTabContainer = glimpseBrowser.parentElement.parentElement.parentElement;
                glimpseTabContainer.setAttribute("natsumi-glimpse-multiglimpse", "");
                if (glimpseTabId !== newTabId) {
                    glimpseTabContainer.setAttribute("natsumi-glimpse-hidden-above", "");
                } else {
                    glimpseTabContainer.removeAttribute("natsumi-glimpse-hidden-above");
                }
            }
        } else {
            // Single Glimpse
            let glimpseTabId = this.glimpse[currentTabId]["tabs"][0];
            let glimpseTab = document.querySelector(`tab[linkedpanel=${glimpseTabId}]`);
            let glimpseBrowser = glimpseTab.linkedBrowser;
            let glimpseTabContainer = glimpseBrowser.parentElement.parentElement.parentElement;
            glimpseTabContainer.removeAttribute("natsumi-glimpse-multiglimpse");
            glimpseTabContainer.removeAttribute("natsumi-glimpse-hidden-above");
            glimpseTabContainer.removeAttribute("natsumi-glimpse-hidden-below");
        }

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
            if (this.glimpse[parentId]["tabs"].includes(glimpseTabId)) {
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

    deactivateGlimpse(glimpseTabId, multiGlimpseRemove = false) {
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
        if (multiGlimpseRemove) {
            glimpseTab.setAttribute("natsumi-glimpse-ignore", "true");
            this.removeFromGlimpse(parentTabId, glimpseTabId);

            let glimpseData = this.glimpse[parentTabId];
            if (glimpseData["tabs"].length === 1) {
                // Remove multi-glimpse attributes
                let tabbox = document.getElementById("tabbrowser-tabbox");
                tabbox.removeAttribute("natsumi-glimpse-multi-active");

                // Set remaining tab as current tab
                let remainingGlimpseTabId = glimpseData["tabs"][0];
                let remainingGlimpseTab = document.querySelector(`tab[linkedpanel=${remainingGlimpseTabId}]`);
                let remainingGlimpseBrowser = remainingGlimpseTab.linkedBrowser;
                let remainingGlimpseTabContainer = remainingGlimpseBrowser.parentElement.parentElement.parentElement;
                remainingGlimpseTabContainer.removeAttribute("natsumi-glimpse-hidden-above");
                remainingGlimpseTabContainer.removeAttribute("natsumi-glimpse-hidden-below");
                gBrowser.selectedTab = remainingGlimpseTab;
            } else {
                for (let remainingGlimpseTabId of glimpseData["tabs"]) {
                    let remainingGlimpseTab = document.querySelector(`tab[linkedpanel=${remainingGlimpseTabId}]`);
                    let glimpseIndex = glimpseData["tabs"].indexOf(remainingGlimpseTabId);

                    if (!remainingGlimpseTab) {
                        continue;
                    }

                    let remainingGlimpseBrowser = remainingGlimpseTab.linkedBrowser;
                    let remainingGlimpseTabContainer = remainingGlimpseBrowser.parentElement.parentElement.parentElement;
                    remainingGlimpseTabContainer.removeAttribute("natsumi-glimpse-hidden-above");
                    remainingGlimpseTabContainer.removeAttribute("natsumi-glimpse-hidden-below");

                    if (glimpseIndex === glimpseData["index"]) {
                        gBrowser.selectedTab = remainingGlimpseTab;
                    } else if (glimpseIndex < glimpseData["index"]) {
                        remainingGlimpseTabContainer.setAttribute("natsumi-glimpse-hidden-above", "");
                    } else {
                        remainingGlimpseTabContainer.setAttribute("natsumi-glimpse-hidden-below", "");
                    }
                }
            }
        } else {
            glimpseTab.setAttribute("natsumi-glimpse-closed", "true");
        }

        // Close Glimpse tab
        gBrowser.removeTab(glimpseTab);
    }

    cycleGlimpseTabs(parentTabId, forward = true) {
        // Get glimpse data
        let glimpseData = this.glimpse[parentTabId];
        if (!glimpseData) {
            return;
        }

        if (glimpseData["tabs"].length <= 1) {
            return;
        }

        // Get current index
        let currentIndex = glimpseData["index"];
        if (forward) {
            currentIndex += 1;
            if (currentIndex >= glimpseData["tabs"].length) {
                currentIndex = 0;
            }
        } else {
            currentIndex -= 1;
            if (currentIndex < 0) {
                currentIndex = glimpseData["tabs"].length - 1;
            }
        }

        // Update index
        this.glimpse[parentTabId]["index"] = currentIndex;

        // Update tabs
        for (let glimpseTabId of glimpseData["tabs"]) {
            let glimpseTab = document.querySelector(`tab[linkedpanel=${glimpseTabId}]`);
            let glimpseTabIndex = glimpseData["tabs"].indexOf(glimpseTabId);
            let glimpseBrowser = glimpseTab.linkedBrowser;
            let glimpseTabContainer = glimpseBrowser.parentElement.parentElement.parentElement;

            glimpseTabContainer.removeAttribute("natsumi-glimpse-hidden-above");
            glimpseTabContainer.removeAttribute("natsumi-glimpse-hidden-below");

            if (glimpseTabIndex === currentIndex) {
                gBrowser.selectedTab = glimpseTab;
            } else if (glimpseTabIndex < currentIndex) {
                glimpseTabContainer.setAttribute("natsumi-glimpse-hidden-above", "");
            } else if (glimpseTabIndex > currentIndex) {
                glimpseTabContainer.setAttribute("natsumi-glimpse-hidden-below", "");
            }
        }
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

        // Get Glimpse data
        let glimpseData = this.glimpse[parentTabId];
        let stillHasGlimpse = false;
        if (glimpseData["tabs"].length > 1) {
            // We're on multi-Glimpse, so we shouldn't remove parent status
            stillHasGlimpse = true;
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
            let allNonpinned = nonPinnedTabs.querySelectorAll("& > .tabbrowser-tab:not([hidden])");
            let parentTabIndex = Array.from(allNonpinned).indexOf(parentTab);

            // Check if parent tab is the last tab
            if (parentTab.nextSibling) {
                gBrowser.moveTabTo(glimpseTab, {elementIndex: parentTabIndex + gBrowser.pinnedTabCount + 1});
            } else {
                gBrowser.moveTabToEnd(glimpseTab);
            }
        }

        // Unregister glimpse
        if (!stillHasGlimpse) {
            this.unregisterGlimpse(parentTabId);
        } else {
            // Remove graduated tab from glimpse data
            this.removeFromGlimpse(parentTabId, glimpseTabId);
        }
    }

    unregisterGlimpse(parentTabId) {
        // Remove from glimpse tabs array
        let glimpseTabIds = this.glimpse[parentTabId]["tabs"];
        for (let glimpseTabId of glimpseTabIds) {
            let index = this.glimpseTabs.indexOf(glimpseTabId);
            if (index > -1) {
                this.glimpseTabs.splice(index, 1);
            }
        }

        let parentTab = document.querySelector(`tab[linkedpanel=${parentTabId}]`);
        let parentTabContent = parentTab.querySelector(".tab-content");
        if (!parentTab.pinned) {
            parentTabContent.removeAttribute("natsumi-glimpse-indicator");
            parentTabContent.style.removeProperty("--natsumi-glimpse-tabs");
        }

        // Unregister glimpse
        delete this.glimpse[parentTabId];
    }

    removeFromGlimpse(parentTabId, glimpseTabId) {
        // Remove glimpse tab from glimpse data
        let glimpseData = this.glimpse[parentTabId];

        if (!glimpseData) {
            return;
        }

        if (glimpseData["tabs"].length <= 1) {
            // Unregister Glimpse
            this.unregisterGlimpse(parentTabId);
            return;
        }

        let parentTab = document.querySelector(`tab[linkedpanel=${parentTabId}]`);

        let glimpseTabIndex = glimpseData["tabs"].indexOf(glimpseTabId);
        if (glimpseTabIndex > -1) {
            glimpseData["tabs"].splice(glimpseTabIndex, 1);
        }

        let glimpseTabsArrayIndex = this.glimpseTabs.indexOf(glimpseTabId);
        if (glimpseTabsArrayIndex > -1) {
            this.glimpseTabs.splice(glimpseTabsArrayIndex, 1);
        }

        let parentTabContent = parentTab.querySelector(".tab-content");
        if (!parentTab.pinned) {
            parentTabContent.setAttribute("natsumi-glimpse-indicator", "");
            parentTabContent.style.setProperty("--natsumi-glimpse-tabs", `"${this.glimpse[parentTabId]["tabs"].length}"`);
        }

        // Change index
        let newTabIndex = glimpseTabIndex;
        if (newTabIndex >= glimpseData["tabs"].length) {
            newTabIndex = glimpseData["tabs"].length - 1;
        }

        glimpseData["index"] = newTabIndex;
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
        let autocompleteText = document.getElementById("natsumi-glimpse-launcher-input-autocomplete");

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
        let autocompleteText = document.getElementById("natsumi-glimpse-launcher-input-autocomplete");

        // Reset Glimpse Launcher
        this.launcherInputNode.value = "";
        this.searchEngine = null;
        this.launcherNode.removeAttribute("search-engine-selected");
        this.launcherNode.removeAttribute("open");
        autocompleteText.textContent = "";
        this.launcherInputContainer.removeAttribute("natsumi-glimpse-launcher-has-autocomplete");
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

class NatsumiGlimpseChainer {
    constructor() {
        this.chainingGlimpse = false;
        this.glimpseChain = [];
        this.chainAnimationTimeout = null;
    }

    init() {
        const chainerXUL = `
            <div id="natsumi-glimpse-chainer-indicator">
                <div id="natsumi-glimpse-chainer-icon"></div>
                <div id="natsumi-glimpse-chainer-indicator-container">
                    <div id="natsumi-glimpse-chainer-text">
                        Glimpse Chain!
                    </div>
                    <div id="natsumi-glimpse-chainer-tabs">
                        0
                    </div>
                </div>
                <div id="natsumi-glimpse-chainer-indicator-buttons">
                    <div id="natsumi-glimpse-chainer-indicator-open"></div>
                    <div id="natsumi-glimpse-chainer-indicator-abort"></div>
                </div>
            </div>
        `
        const chainerFragment = convertToXUL(chainerXUL);

        // Add to browser
        document.body.appendChild(chainerFragment);

        // Fetch nodes
        this.chainerIndicatorNode = document.getElementById("natsumi-glimpse-chainer-indicator");
        this.chainerTabsNode = document.getElementById("natsumi-glimpse-chainer-tabs");
        this.chainerOpenButton = document.getElementById("natsumi-glimpse-chainer-indicator-open");
        this.chainerAbortButton = document.getElementById("natsumi-glimpse-chainer-indicator-abort");

        // Set event listeners
        this.chainerOpenButton.addEventListener("click", () => {
            this.releaseChain();
        });
        this.chainerAbortButton.addEventListener("click", () => {
            this.cancelChain();
        });
    }

    activateChaining() {
        if (!window.natsumiGlimpse.multiGlimpse) {
            return;
        }

        this.chainingGlimpse = true;
        window.natsumiGlimpse.activateChaining();
        this.chainerTabsNode.textContent = "0";
        this.chainerIndicatorNode.setAttribute("chaining", "");
    }

    _resetChain() {
        this.glimpseChain = [];
        this.chainerIndicatorNode.removeAttribute("goodlucktoyourbrowser");
        this.chainerIndicatorNode.removeAttribute("chaining");
    }

    releaseChain() {
        if (this.glimpseChain.length === 0) {
            this.cancelChain();
        }

        if (!window.natsumiGlimpse.multiGlimpse) {
            // Abort chaining
            this.cancelChain();
        }

        this.chainingGlimpse = false;
        window.natsumiGlimpse.releaseChain();

        for (let link of this.glimpseChain) {
            window.natsumiGlimpse.activateGlimpse(link);
        }

        this._resetChain();
    }

    cancelChain() {
        this.chainingGlimpse = false;
        window.natsumiGlimpse.releaseChain();
        this._resetChain();
    }

    addToChain(link) {
        if (!this.chainingGlimpse) {
            return;
        }

        if (link && !this.glimpseChain.includes(link)) {
            this.glimpseChain.push(link);

            if (this.chainAnimationTimeout) {
                clearTimeout(this.chainAnimationTimeout);
                this.chainAnimationTimeout = null;
            }

            this.chainerIndicatorNode.setAttribute("added", "");
            this.chainAnimationTimeout = setTimeout(() => {
                this.chainerIndicatorNode.removeAttribute("added");
            }, 1000);
        }

        if (this.glimpseChain.length >= 10) {
            this.chainerIndicatorNode.setAttribute("goodlucktoyourbrowser", "");
        }

        this.chainerTabsNode.textContent = `${this.glimpseChain.length}`;
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
if (!window.natsumiGlimpseChainer) {
    document.body.natsumiGlimpseChainer = new NatsumiGlimpseChainer();
    document.body.natsumiGlimpseChainer.init();
}

try {
    let actorWrapper = new NatsumiActorWrapper();
    actorWrapper.addWindowActors(JSWindowActors);
} catch (e) {
    console.error("Failed to add Natsumi JS Window Actors:", e);
}
