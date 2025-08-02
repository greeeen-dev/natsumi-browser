// ==UserScript==
// @include   main
// @ignorecache
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

function getCurrentWorkspaceData() {
    const tabsListNode = document.getElementById("tabbrowser-arrowscrollbox");
    const availableTabs = tabsListNode.querySelectorAll("tab:not([hidden])");
    const workspaceData = JSON.parse(ucApi.Prefs.get("floorp.workspaces.v4.store").value)
    let workspaceName = null;
    let workspaceIcon = null;
    let workspaceId = workspaceData["defaultID"];

    if (availableTabs.length > 0) {
        if ("floorpWorkspaceId" in availableTabs[0].attributes) {
            workspaceId = availableTabs[0].attributes["floorpWorkspaceId"].value;
        }
    }

    for (let workspaceIndex in workspaceData["data"]) {
        let workspace = workspaceData["data"][workspaceIndex];
        if (workspace[0] === workspaceId) {
            workspaceName = workspace[1]["name"]
            workspaceIcon = workspace[1]["icon"]

            if (!workspaceIcon) {
                workspaceIcon = `url("chrome://noraneko/content/assets/svg/fingerprint.svg")`;
            } else {
                workspaceIcon = `url("chrome://noraneko/content/assets/svg/${workspaceIcon}.svg")`;
            }

            break;
        }
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

    for (let index in workspaceData["data"]) {
        let workspace = workspaceData["data"][index];
        let workspaceId = workspace[0];
        let workspaceIcon = workspace[1]["icon"];

        if (!workspaceIcon) {
            workspaceIcon = `url('chrome://noraneko/content/assets/svg/fingerprint.svg')`;
        } else {
            workspaceIcon = `url('chrome://noraneko/content/assets/svg/${workspaceIcon}.svg')`;
        }

        let newButtonNode = document.createElement("div");
        newButtonNode.classList.add("natsumi-workspace-icon");
        newButtonNode.style.setProperty("--natsumi-workspace-icon", workspaceIcon);

        if (workspaceId === currentWorkspaceData["id"]) {
            newButtonNode.classList.add("natsumi-workspace-active");
        }

        workspacesButton.appendChild(newButtonNode);
    }
}

let tabsList = document.getElementById("tabbrowser-arrowscrollbox");
let isFloorp = false;

if (ucApi.Prefs.get("natsumi.browser.type").exists) {
    isFloorp = ucApi.Prefs.get("natsumi.browser.type").value === "floorp";
}

if (isFloorp) {
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
        mutations.forEach(function (mutationRecord) {
            copyWorkspaceName();
            copyAllWorkspaces();
            copyAllWorkspaces();
        });
    });
    tabsListObserver.observe(tabsList, {attributes: true, childList: true, subtree: true});
}