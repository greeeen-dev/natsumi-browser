// ==UserScript==
// @include   main
// @loadOrder 11
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

class NatsumiWorkspacesWrapper {
    // A wrapper class for managing workspaces in Floorp directly from the window
    constructor() {
        this.workspacesModule = null;
        this.workspacesContext = null;
        this.modalManager = null;
        this.tabManager = null;
        this.iconManager = null;
        this.initialized = false;
        this.properInit = false;
        this.initInterval = null;
        this.dataRetrieveQueue = [];
    }

    async init() {
        this.workspacesModule = await import("chrome://noraneko/content/assets/js/index22.js");
        let workspacesContext = this.workspacesModule._.getCtx();

        if (workspacesContext) {
            this.setManagers(workspacesContext);
        } else {
            console.warn("Workspaces context could not be retrieved, will do this later.");
            this.setInitInterval();
        }

        // Set init to true
        this.initialized = true;
    }

    setInitInterval() {
        if (this.properInit) {
            return;
        }

        this.initInterval = setInterval(() => {
            let workspacesContext = this.workspacesModule._.getCtx();
            if (workspacesContext) {
                console.log("Workspaces context retrieved, initializing now.");

                // Set managers and init status
                this.setManagers(workspacesContext);
                this.properInit = true;

                // Signal to all queued classes that they can retrieve data now
                for (let queuedFunction of this.dataRetrieveQueue) {
                    queuedFunction();
                }
                this.dataRetrieveQueue = [];

                // Clear interval
                clearInterval(this.initInterval);
                this.initInterval = null;
            }
        }, 100);
    }

    setManagers(workspacesContext) {
        this.workspacesContext = workspacesContext;
        this.modalManager = workspacesContext.modalCtx;
        this.tabManager = workspacesContext.tabManagerCtx;
        this.iconManager = workspacesContext.iconCtx;
    }

    getCurrentWorkspaceID() {
        if (!this.initialized) {
            return;
        }

        return this.workspacesContext.getSelectedWorkspaceID();
    }

    getAllWorkspaceIDs() {
        if (ucApi.Prefs.get("floorp.workspaces.v4.store").exists()) {
            let workspacesData = JSON.parse(ucApi.Prefs.get("floorp.workspaces.v4.store").value);
            let workspaceIDs = [];

            for (let index in workspacesData["data"]) {
                workspaceIDs.push(workspacesData["data"][index][0]);
            }

            return workspaceIDs;
        } else {
            return [];
        }
    }

    setCurrentWorkspaceID(workspaceId) {
        if (!this.initialized) {
            return;
        }

        return this.tabManager.changeWorkspace(workspaceId);
    }

    createWorkspace(workspaceName = null) {
        if (!this.initialized) {
            return;
        }

        if (!workspaceName) {
            return this.workspacesContext.createNoNameWorkspace();
        } else {
            return this.workspacesContext.createWorkspace(workspaceName);
        }
    }

    async showWorkspacesModal(workspaceId = null) {
        if (!this.initialized) {
            return;
        }

        // Get current workspace ID if none is provided
        if (!workspaceId) {
            workspaceId = this.getCurrentWorkspaceID();
        }

        // Show workspaces config modal
        await this.modalManager.showWorkspacesModal(workspaceId);
    }

    getWorkspaceIconUrl(icon) {
        return this.iconManager.getWorkspaceIconUrl(icon);
    }
}

function getCurrentWorkspaceData() {
    const tabsListNode = document.getElementById("tabbrowser-arrowscrollbox");
    const availableTabs = tabsListNode.querySelectorAll("tab:not([hidden])");
    const workspaceData = JSON.parse(ucApi.Prefs.get("floorp.workspaces.v4.store").value)
    let workspaceName = null;
    let workspaceIcon = null;
    let workspaceId = workspaceData["defaultID"];

    // Attempt to get workspace ID from workspaces wrapper if available
    if (document.body.natsumiWorkspacesWrapper && document.body.natsumiWorkspacesWrapper.properInit) {
        workspaceId = document.body.natsumiWorkspacesWrapper.getCurrentWorkspaceID();
    } else {
        // Use fallback method (fetch from tabs, not as accurate)
        if (availableTabs.length > 0) {
            if ("floorpWorkspaceId" in availableTabs[0].attributes) {
                workspaceId = availableTabs[0].attributes["floorpWorkspaceId"].value;
            }
        }
    }

    for (let workspaceIndex in workspaceData["data"]) {
        let workspace = workspaceData["data"][workspaceIndex];
        if (workspace[0] === workspaceId) {
            workspaceName = workspace[1]["name"]
            workspaceIcon = workspace[1]["icon"]

            if (!workspaceIcon) {
                workspaceIcon = `url(${document.body.natsumiWorkspacesWrapper.getWorkspaceIconUrl("fingerprint")})`;
            } else {
                workspaceIcon = `url(${document.body.natsumiWorkspacesWrapper.getWorkspaceIconUrl(workspaceIcon)})`;
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
            workspaceIcon = `url(${document.body.natsumiWorkspacesWrapper.getWorkspaceIconUrl("fingerprint")})`;
        } else {
            workspaceIcon = `url(${document.body.natsumiWorkspacesWrapper.getWorkspaceIconUrl(workspaceIcon)})`;
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

                    // Ensure workspace button is always visible
                    let isVerticalTabs = ucApi.Prefs.get("sidebar.verticalTabs").value;
                    if (isVerticalTabs && newWorkspacesButton.parentNode.id === "TabsToolbar-customization-target") {
                        // This shouldn't be here
                        let targetStatusbar = false;
                        if (ucApi.Prefs.get("natsumi.theme.patch-move-workspaces-to-statusbar").exists) {
                            targetStatusbar = ucApi.Prefs.get("natsumi.theme.patch-move-workspaces-to-statusbar").value;
                        }

                        if (targetStatusbar) {
                            let statusBar = document.getElementById("nora-statusbar");
                            let existingButtons = statusBar.querySelectorAll("toolbarbutton");

                            if (existingButtons.length === 2) {
                                statusBar.insertBefore(newWorkspacesButton, existingButtons[1]);
                            } else {
                                statusBar.appendChild(newWorkspacesButton);
                            }
                        } else {
                            let navbarTarget = document.getElementById("nav-bar-customization-target");
                            let sidebarNode = navbarTarget.querySelector("sidebar-button");

                            if (sidebarNode) {
                                navbarTarget.insertBefore(newWorkspacesButton, sidebarNode.nextSibling);
                            } else {
                                navbarTarget.insertBefore(newWorkspacesButton, navbarTarget.firstChild);
                            }
                        }
                    }

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
        // Prevent infinite loops
        if (mutations.length === 1) {
            let mutation = mutations[0];
            if (mutation.target.id === "natsumi-workspace-indicator-name") {
                return;
            }
        }

        copyWorkspaceName();
        copyAllWorkspaces();
        copyAllWorkspaces();
    });
    tabsListObserver.observe(tabsList, {attributes: true, childList: true, subtree: true});

    // Initialize workspaces wrapper
    document.body.natsumiWorkspacesWrapper = new NatsumiWorkspacesWrapper();
    document.body.natsumiWorkspacesWrapper.init().then(() => {
        // We don't really need to do anything here, but it's good to keep this just in case
    })
}