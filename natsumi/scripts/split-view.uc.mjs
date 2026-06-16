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
        gBrowser.tabContainer.addEventListener("TabSelect", () => {this.onTabSelect()});
    }

    onTabSelect() {
        // We'll need to ensure that .deck-selected is set for the correct tab
        let allSelectedPanels = Array.from(document.querySelectorAll("#tabbrowser-tabpanels .browserSidebarContainer.deck-selected"));

        if (allSelectedPanels.length <= 1) {
            // No issues here, selected panel count is as expected
            return;
        }

        for (let tabPanel of allSelectedPanels) {
            if (tabPanel.id !== gBrowser.selectedTab.linkedPanel) {
                tabPanel.classList.remove("deck-selected");
                console.log("Deselected", tabPanel.id);
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