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

import {NatsumiNotification} from "./notifications.sys.mjs";
import * as ucApi from "chrome://userchromejs/content/uc_api.sys.mjs";

export class NatsumiShortcutActions {
    static copyCurrentUrl() {
        let currentUrl = gBrowser.currentURI.spec;
        navigator.clipboard.writeText(currentUrl);

        // Add to notifications
        let notificationObject = new NatsumiNotification("Copied URL to clipboard!", null, "chrome://natsumi/content/icons/lucide/copy.svg")
        notificationObject.addToContainer();
    }

    static toggleBrowserLayout() {
        let isSingleToolbar = false;
        if (ucApi.Prefs.get("natsumi.theme.single-toolbar").exists()) {
            isSingleToolbar = ucApi.Prefs.get("natsumi.theme.single-toolbar").value;
        }

        ucApi.Prefs.get("natsumi.theme.single-toolbar").value = !isSingleToolbar;
    }

    static toggleVerticalTabs() {
        let isVerticalTabs = false;
        if (ucApi.Prefs.get("sidebar.verticalTabs").exists()) {
            isVerticalTabs = ucApi.Prefs.get("sidebar.verticalTabs").value;
        }

        ucApi.Prefs.get("sidebar.verticalTabs").value = !isVerticalTabs;
    }

    static toggleCompactMode() {
        if (!document.body.natsumiCompactModeManager) {
            // Compact mode manager isn't initialized yet (or is broken)
            return;
        }

        if (document.body.attributes["natsumi-compact-mode"]) {
            document.body.natsumiCompactModeManager.disableCompactMode(true);
        } else {
            document.body.natsumiCompactModeManager.enableCompactMode(true);
        }
    }

    static toggleCompactSidebar() {
        if (!(document.body.hasAttribute("natsumi-compact-mode"))) {
            return;
        }

        if (document.body.hasAttribute("natsumi-compact-sidebar-extend")) {
            document.body.removeAttribute("natsumi-compact-sidebar-extend");
        } else {
            document.body.setAttribute("natsumi-compact-sidebar-extend", "");
        }
    }

    static toggleCompactNavbar() {
        if (!(document.body.hasAttribute("natsumi-compact-mode"))) {
            return;
        }

        if (document.body.hasAttribute("natsumi-compact-navbar-extend")) {
            document.body.removeAttribute("natsumi-compact-navbar-extend");
        } else {
            document.body.setAttribute("natsumi-compact-navbar-extend", "");
        }
    }

    static cycleWorkspaces(reverse = false) {
        if (!document.body.natsumiWorkspacesWrapper) {
            return;
        }

        if (!document.body.natsumiWorkspacesWrapper.properInit) {
            return;
        }

        const workspaceIds = document.body.natsumiWorkspacesWrapper.getAllWorkspaceIDs(true);
        const currentWorkspace = document.body.natsumiWorkspacesWrapper.getCurrentWorkspaceID();
        let currentWorkspaceIndex = workspaceIds.indexOf(currentWorkspace);

        if (reverse) {
            currentWorkspaceIndex--;
        } else {
            currentWorkspaceIndex++;
        }

        if (currentWorkspaceIndex < 0) {
            currentWorkspaceIndex = workspaceIds.length - 1;
        } else if (currentWorkspaceIndex >= workspaceIds.length) {
            currentWorkspaceIndex = 0;
        }

        const newWorkspaceId = workspaceIds[currentWorkspaceIndex];
        document.body.natsumiWorkspacesWrapper.setCurrentWorkspaceID(newWorkspaceId);
    }

    static closeGlimpse() {
        if (!window.natsumiGlimpse) {
            return;
        }

        if (window.natsumiGlimpse.currentGlimpseTab) {
            // Get Glimpse tab
            let glimpseParentTabId = window.natsumiGlimpse.currentGlimpseTab.linkedPanel;
            let glimpseData = window.natsumiGlimpse.glimpse[glimpseParentTabId];

            if (glimpseData) {
                let currentGlimpseIndex = glimpseData["index"];
                let currentGlimpseTab = glimpseData["tabs"][currentGlimpseIndex];

                if (glimpseData["tabs"].length <= 1) {
                    window.natsumiGlimpse.deactivateGlimpseWithAnim(currentGlimpseTab);
                } else {
                    window.natsumiGlimpse.deactivateGlimpse(currentGlimpseTab, true);
                }
            }
        }
    }

    static graduateGlimpse() {
        if (!window.natsumiGlimpse) {
            return;
        }

        if (window.natsumiGlimpse.currentGlimpseTab) {
            // Get Glimpse tab
            let glimpseParentTabId = window.natsumiGlimpse.currentGlimpseTab.linkedPanel;
            let glimpseData = window.natsumiGlimpse.glimpse[glimpseParentTabId];

            if (glimpseData) {
                let currentGlimpseIndex = glimpseData["index"];
                let currentGlimpseTab = glimpseData["tabs"][currentGlimpseIndex];
                window.natsumiGlimpse.graduateGlimpseWithAnim(currentGlimpseTab);
            }
        }
    }

    static cycleGlimpse(forward = true) {
        if (!window.natsumiGlimpse) {
            return;
        }

        if (window.natsumiGlimpse.currentGlimpseTab) {
            // Get Glimpse tab
            let glimpseParentTabId = window.natsumiGlimpse.currentGlimpseTab.linkedPanel;
            let glimpseData = window.natsumiGlimpse.glimpse[glimpseParentTabId];

            if (glimpseData) {
                window.natsumiGlimpse.cycleGlimpseTabs(glimpseParentTabId, forward);
            }
        }
    }

    static toggleGlimpseChain() {
        if (document.body.natsumiGlimpseChainer) {
            const chainActive = document.body.natsumiGlimpseChainer.chainingGlimpse;

            if (chainActive) {
                document.body.natsumiGlimpseChainer.cancelChain();
            } else {
                document.body.natsumiGlimpseChainer.activateChaining();
            }
        }
    }

    static releaseGlimpseChain() {
        if (document.body.natsumiGlimpseChainer) {
            const chainActive = document.body.natsumiGlimpseChainer.chainingGlimpse;

            if (chainActive) {
                document.body.natsumiGlimpseChainer.releaseChain();
            }
        }
    }

    static openNewTab() {
        let replaceNewTab = false;

        if (ucApi.Prefs.get("natsumi.tabs.replace-new-tab").exists()) {
            replaceNewTab = ucApi.Prefs.get("natsumi.tabs.replace-new-tab").value;
        }

        if (replaceNewTab) {
            let commandEvent = new Event("command", {bubbles: true, cancelable: true});
            document.body.natsumiURLBarController.openAsNewTab(commandEvent);
        } else {
            // Open new tab
            let keyElement = document.getElementById("key_newNavigatorTab");
            keyElement.doCommand();
        }
    }

    static clearUnpinnedTabs() {
        if (document.body.natsumiUnpinnedTabsClearer) {
            document.body.natsumiUnpinnedTabsClearer.clearTabs();
        }
    }

    static openGlimpseLauncher() {
        if (document.body.natsumiGlimpseLauncher) {
            document.body.natsumiGlimpseLauncher.activateLauncher();
        }
    }

    static splitTabs() {
        // Firefox can't split more than 2 tabs yet
        if (gBrowser.multiSelectedTabsCount > 2) {
            return;
        }

        let selectedTabs = gBrowser.selectedTabs;
        let unpinnedTabsNode = document.getElementById("tabbrowser-arrowscrollbox");
        let unpinnedTabs = Array.from(unpinnedTabsNode.querySelectorAll(".tabbrowser-tab:not([hidden])"));
        let firstTab = selectedTabs[0];
        let secondTab;
        let insertBefore = gBrowser.selectedTab;

        if (selectedTabs.length === 1) {
            // Get tab index
            let tabIndex = unpinnedTabs.indexOf(firstTab);

            if (tabIndex === unpinnedTabs.length - 1) {
                // Split with previous tab
                secondTab = unpinnedTabs[tabIndex - 1];
            } else {
                // Split with next tab
                secondTab = unpinnedTabs[tabIndex + 1];
            }
        } else {
            secondTab = selectedTabs[1];
        }

        // Check that tabs are not pinned and not in split view
        for (let tab of [firstTab, secondTab]) {
            if (tab.pinned || tab.splitview) {
                return;
            }
        }

        let additionalData = {};
        if (insertBefore) {
            additionalData = {insertBefore};
        }

        gBrowser.addTabSplitView([firstTab, secondTab], additionalData);
    }

    static unsplitTabs() {
        // Use current selected tab
        let selectedTab = gBrowser.selectedTab;

        if (selectedTab.splitview) {
            gBrowser.unsplitTabs(selectedTab.splitview);
        }
    }
}