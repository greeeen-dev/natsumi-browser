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

class NatsumiSplitViewManager {
    constructor() {
    }

    init() {
        if (ucApi.Prefs.get("natsumi.browser.disable-splitview-patches").exists()) {
            if (ucApi.Prefs.get("natsumi.browser.disable-splitview-patches").value) {
                console.warn("Natsumi Split View patches are disabled. If disabling this fixes split views, please report this.");
                return;
            }
        }

        // Add event listeners
        gBrowser.tabContainer.addEventListener("TabClose", this.onTabClose.bind(this));
        window.addEventListener("TabSplitViewActivate", this.onSplitViewActivate.bind(this));
    }

    onTabClose(event) {
        let closedTab = event.target;

        if (closedTab.splitview) {
            for (let tab of closedTab.splitview.tabs) {
                let linkedPanelNode = document.getElementById(tab.linkedPanel);

                if (linkedPanelNode) {
                    linkedPanelNode.style.removeProperty("width");
                    linkedPanelNode.removeAttribute("width");
                }
            }
        }
    }

    onSplitViewActivate() {
        // Ensure split views have valid tabs
        let splitTabs = document.querySelectorAll("tab-split-view-wrapper tab");
        for (let splitTab of splitTabs) {
            if (splitTab.hasAttribute("natsumi-glimpse-tab")) {
                // Glimpse should never be split, destroy tab
                gBrowser.removeTab(splitTab);
            }
        }
    }
}

if (!document.body.natsumiSplitViewManager) {
    try {
        document.body.natsumiSplitViewManager = new NatsumiSplitViewManager();
        document.body.natsumiSplitViewManager.init();
    } catch (e) {
        console.error(e);
    }
}