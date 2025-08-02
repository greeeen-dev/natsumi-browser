// ==UserScript==
// @include   main
// @ignorecache
// @loadOrder 11
// ==/UserScript==

/*

Natsumi Browser - A userchrome for Firefox and more that makes things flow.

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

function copySidebarWidth() {
    // Only run this if vertical tabs are enabled
    if (!ucApi.Prefs.get("sidebar.verticalTabs").value) {
        return;
    }

    let sidebar = document.querySelector("#sidebar-main");

    // Usually the sidebar should always exist, but if it doesn't, we can just return
    if (!sidebar) {
        return;
    }

    let width = sidebar.style.width;

    if (!width || width.length === 0) {
        width = "242px";
    }

    document.body.style.setProperty("--natsumi-sidebar-width", width);
}

function copySidebarOptionsHeight() {
    // The buttons strip is in a shadow root, so we'll need to do some more work here
    let sidebarNode = document.querySelector("#sidebar-main").querySelector("sidebar-main");
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

function copyStatusBarHeight() {
    let sidebarNode = document.querySelector("#sidebar-main");

    // Set a variable to the status bar height
    let statusBarFloorp = document.querySelector("#nora-statusbar");
    let statusBarWaterfox = document.querySelector("#status-bar");

    if (!statusBarFloorp && !statusBarWaterfox) {
        return;
    }

    // For some reason, offsetHeight is null but scrollHeight is correct.
    // Probably due to nora-statusbar having absolute position
    let height = null;

    if (statusBarFloorp) {
        height = statusBarFloorp.scrollHeight;
    } else if (statusBarWaterfox) {
        height = statusBarWaterfox.scrollHeight;
    }

    sidebarNode.style.setProperty("--natsumi-statusbar-height", `${height}px`);
}

function copyWindowButtonsWidth() {
    let windowButtonsNode = document.querySelector("#nav-bar .titlebar-buttonbox-container");

    if (!windowButtonsNode) {
        return;
    }

    const width = windowButtonsNode.getClientRects()[0].width + "px";

    let navBar = document.querySelector("#navigator-toolbox");

    if (navBar) {
        navBar.style.setProperty("--natsumi-window-buttons-width", width);
    }
}

let sidebar = document.querySelector("#sidebar-main");
let isFloorp = false;

if (ucApi.Prefs.get("natsumi.browser.type").exists) {
    isFloorp = ucApi.Prefs.get("natsumi.browser.type").value === "floorp";
}

if (!sidebar) {
    console.warn("Sidebar not found, trying to find it...");
    for (let i = 0; i < 10; i++) {
        sidebar = document.querySelector("#sidebar-main");

        // If the sidebar exists, we can stop searching
        if (sidebar) {
            break;
        }

        // Wait for 1s before trying again
        await new Promise(resolve => setTimeout(resolve, 1000));
    }
}

console.log("Sidebar found!", sidebar);

if (sidebar) {
    // If the sidebar exists (and the browser is Floorp), copy its width

    copySidebarWidth();
    copyStatusBarHeight();
    copyWindowButtonsWidth();

    let sidebarObserver = new MutationObserver(function (mutations) {
        mutations.forEach(function (mutationRecord) {
            copySidebarWidth();

            // Also copy sidebar toolbar heights in case things change
            copyStatusBarHeight();

            // And window buttons, too
            copyWindowButtonsWidth();

            // Copy sidebar options height if the shadow root exists
            let sidebarNodeSR = mutationRecord.target.querySelector("sidebar-main").shadowRoot;
            if (sidebarNodeSR) {
                copySidebarOptionsHeight();
            }
        });
    });
    sidebarObserver.observe(sidebar, {attributes: true, attributeFilter: ["style"]});

    if (isFloorp) {
        let statusBarFloorp = document.querySelector("#nora-statusbar");
        let statusBarWaterfox = document.querySelector("#status-bar");
        let statusBarObserver = new MutationObserver(function (mutations) {
            mutations.forEach(function (mutationRecord) {
                copyStatusBarHeight();
            });
        });

        if (statusBarFloorp) {
            statusBarObserver.observe(statusBarFloorp, {attributes: true, childList: true, subtree: true});
        }
        if (statusBarWaterfox) {
            statusBarObserver.observe(statusBarWaterfox, {attributes: true, childList: true, subtree: true});
        }
    }
}