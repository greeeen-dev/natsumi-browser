// ==UserScript==
// @include   main
// @loadOrder 12
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

function convertToXUL(node) {
    // noinspection JSUnresolvedReference
    return window.MozXULElement.parseXULToFragment(node);
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
        let tabs = tabsList.querySelectorAll("tab:not([hidden='true'])");
        let allTabs = tabsList.querySelectorAll("tab:not([hidden='true'])");

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
        let pinnedTabs = pinnedTabsContainer.querySelectorAll("tab:not([hidden='true'])");

        // Only override shouldOpen if there are absolutely no tabs left
        if (pinnedTabs.length === 0) {
            ucApi.Prefs.get("browser.tabs.closeWindowWithLastTab").value;
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
    }
}

if (!document.body.natsumiUnpinnedTabsClearer) {
    document.body.natsumiUnpinnedTabsClearer = new NatsumiUnpinnedTabsClearer();
    document.body.natsumiUnpinnedTabsClearer.init();
}
