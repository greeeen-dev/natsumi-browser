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

// Create mutator listener

class natsumiURLBarController {
    constructor() {
        this.urlBarNode = document.getElementById("urlbar");
        this.urlbarMutationObserver = null;
        this.urlBarObject = gURLBar;
        this.sidebarMutationObserver = null;
        this.wasSelected = false;
        this.wasOpened = false;
        this.wasOpenInNewTab = false;
        this.replacingNewTab = false;
    }

    init() {
        this.urlbarMutationObserver = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                // Check if open attribute exists
                if (this.urlBarNode.hasAttribute("open") && !this.wasSelected && !this.wasOpened) {
                    this.selectUrlbarContents();
                }

                let shouldReset = this.wasOpened;

                this.wasOpened = this.urlBarNode.hasAttribute("open");
                this.wasSelected = this.urlBarNode.hasAttribute("usertyping");
                this.wasOpenInNewTab = this.urlBarNode.openLinkAsNewTab;

                if (!this.wasOpened && shouldReset) {
                    if (this.urlBarNode.openLinkAsNewTab) {
                        this.urlBarNode.openLinkAsNewTab = false;
                        this.urlBarObject.inputField.value = gBrowser.selectedBrowser.browsingContext.currentURI.spec;
                    }

                    ucApi.Prefs.set("browser.urlbar.openintab", false);
                }
            });
        });

        // Observe the URL bar for changes
        this.urlbarMutationObserver.observe(this.urlBarNode, {
            attributes: true,
            attributeFilter: ["open", "usertyping"]
        });

        // Add event listener for opening as new tab
        document.addEventListener("keydown", (event) => {
            if (event.key.toLowerCase() === "enter" && (
                this.urlBarNode.openLinkAsNewTab || this.wasOpenInNewTab
            ) && this.replacingNewTab) {
                // Due to difficulty intercepting the URL bar behavior, we're letting the configs
                // do the work for us
                // Not the best solution, but it works for now. If anyone has a more elegant
                // solution, please PR it in
                this.urlBarNode.openLinkAsNewTab = false;
                this.wasOpenInNewTab = false;

                // Disable browser.urlbar.openintab to prevent conflicts
                ucApi.Prefs.set("browser.urlbar.openintab", false);
            }
        });

        // Get replace new tab config
        if (ucApi.Prefs.get("natsumi.tabs.replace-new-tab").exists()) {
            this.replacingNewTab = ucApi.Prefs.get("natsumi.tabs.replace-new-tab").value;
        }

        // Observe changes to the replace new tab config
        Services.prefs.addObserver("natsumi.tabs.replace-new-tab", () => {
            let replaceNewTab = ucApi.Prefs.get("natsumi.tabs.replace-new-tab").value;
            this.replacingNewTab = replaceNewTab;

            // Disable browser.urlbar.openintab if replace new tab is disabled
            if (!replaceNewTab) {
                ucApi.Prefs.set("browser.urlbar.openintab", false);
            }
        });

        // Set observer to account for sidebar changes
        this.sidebarMutationObserver = new MutationObserver((mutations) => {
            // Check if new tab button exists
            let verticalNewTabButton = document.getElementById("tabs-newtab-button");

            if (verticalNewTabButton) {
                verticalNewTabButton.setAttribute("command", "NatsumiKBS:natsumiNewTab");
            }
        });

        let verticalTabsContainer = document.getElementById("vertical-tabs");
        if (verticalTabsContainer) {
            this.sidebarMutationObserver.observe(verticalTabsContainer, {
                childList: true
            });
        }

        // Intercept new tab buttons
        // We can't intercept the toolbar button otherwise it'd disable itself

        let verticalNewTabButton = document.getElementById("tabs-newtab-button");
        if (verticalNewTabButton) {
            verticalNewTabButton.setAttribute("command", "NatsumiKBS:natsumiNewTab");
        }
    }

    selectUrlbarContents() {
        // Check if floating URLbar is disabled
        if (ucApi.Prefs.get("natsumi.urlbar.do-not-float").exists()) {
            if (ucApi.Prefs.get("natsumi.urlbar.do-not-float").value) {
                return;
            }
        }

        let urlbarInput = document.getElementById("urlbar-input");
        urlbarInput.select();
    }

    openAsNewTab(event) {
        // Check if URL bar is open
        if (this.urlBarNode.hasAttribute("open")) {
            return;
        }

        window.openLocation(event);
        this.urlBarNode.openLinkAsNewTab = true;
        this.urlBarObject.inputField.value = this.urlBarObject.inputField.defaultValue;
        ucApi.Prefs.set("browser.urlbar.openintab", true);
    }
}

document.body.natsumiURLBarController = new natsumiURLBarController();
document.body.natsumiURLBarController.init();
