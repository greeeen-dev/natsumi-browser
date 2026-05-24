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
import {NatsumiNotification} from "./notifications.sys.mjs";

const chromePath = PathUtils.join(PathUtils.profileDir, "chrome");
const natsumiDownloadPath = PathUtils.join(PathUtils.profileDir, "natsumi-updater-downloads");
const natsumiPath = PathUtils.join(chromePath, "natsumi");
const natsumiOldPath = PathUtils.join(chromePath, "natsumi-old");
const natsumiNewPath = PathUtils.join(chromePath, "natsumi-new");

function convertToXUL(node) {
    // noinspection JSUnresolvedReference
    return window.MozXULElement.parseXULToFragment(node);
}

class NatsumiUpdater {
    constructor() {
        this.updaterAvailable = true;
        this.lastUpdated = 0;
        this.lastAvailableUpdate = null;
        this.successfulUpdateCheck = false;
        this.updateUrl = "https://natsumi-updates.greeeen.dev"
        this.keepOldVersions = false;

        if (ucApi.Prefs.get("natsumi.updater.last-update").exists()) {
            this.lastUpdated = ucApi.Prefs.get("natsumi.updater.last-update").value;
        }
        if (ucApi.Prefs.get("natsumi.updater.keep-old-versions").exists()) {
            this.keepOldVersions = ucApi.Prefs.get("natsumi.updater.keep-old-versions").value;
        }
    }

    async checkForUpdates() {
        if (!this.updaterAvailable) {
            // Updater is unavailable
            throw new Error("Updater is not available");
        }

        // Set allowed branches
        const allowedBranches = [
            "stable",
            "rc",
            "beta",
            "alpha"
        ]

        // Get branch
        let updateBranch = "stable";
        if (ucApi.Prefs.get("natsumi.updater.branch").exists()) {
            updateBranch = ucApi.Prefs.get("natsumi.updater.branch").value;
        }

        if (!allowedBranches.includes(updateBranch)) {
            throw new Error("Invalid branch");
        }

        // Check for updates
        let updaterResponse;

        try {
            updaterResponse = await fetch(`${this.updateUrl}/${updateBranch}.json`);
        } catch(e) {
            this.successfulUpdateCheck = false;
            this.lastAvailableUpdate = null;
            throw e;
        }

        const updateData = await updaterResponse.json();

        // Can we update?
        let canUpdate = updateData["releasedAt"] > this.lastUpdated;

        if (canUpdate) {
            this.lastAvailableUpdate = updateData;
        } else {
            this.lastAvailableUpdate = null;
        }

        // Return update data
        return {
            "available": canUpdate,
            "data": updateData
        }
    }

    notifyNewUpdate() {
        this.checkForUpdates().then((updateData) => {
            if (updateData.available) {
                let notificationObject = new NatsumiNotification(
                    "Update available",
                    `Natsumi ${updateData.data["version"]} is available to install.`,
                    "chrome://natsumi/content/icons/lucide/update.svg",
                    10000
                )
                notificationObject.addToContainer();
            }
        })
    }

    async downloadZip(url, fileName) {
        // Get file
        const zipResponse = await fetch(url);
        const zipName = zipResponse.headers.get('content-disposition').split("filename=")[1];

        // Is this a zip file?
        if (!zipName.endsWith(".zip")) {
            throw new Error("Not a zip file");
        }

        // Get file data
        const zipBlob = await zipResponse.blob();
        const zipBytes = await zipBlob.bytes();

        // Write file data
        const toWritePath = PathUtils.join(natsumiDownloadPath, fileName);
        await IOUtils.makeDirectory(natsumiDownloadPath, {
            createAncestors: false,
        });
        await IOUtils.write(toWritePath, zipBytes);
    }

    async extractZip(fileName) {
        // Open zip file
        const zipReader = Cc["@mozilla.org/libjar/zip-reader;1"].createInstance(Ci.nsIZipReader);
        const zipFile = await IOUtils.getFile(PathUtils.join(natsumiDownloadPath, fileName))
        zipReader.open(zipFile);

        // Extract file
        let entries = zipReader.findEntries(`natsumi-browser-*/natsumi/*`);

        for (let entryName of entries) {
            const entry = zipReader.getEntry(entryName);
            if (!entry.isDirectory) {
                // Get components
                let filePathComponents = entryName.split("/");

                // First two components should be ignored
                filePathComponents.shift();
                filePathComponents.shift();

                // Create directories
                let fileName = filePathComponents.pop();
                let toCreatePath = PathUtils.join(natsumiNewPath, ...filePathComponents);
                await IOUtils.makeDirectory(toCreatePath, {
                    createAncestors: true,
                });

                // Push filename back
                filePathComponents.push(fileName);

                // Get output file
                let finalFilePath = PathUtils.join(natsumiNewPath, ...filePathComponents);
                let finalFile = await IOUtils.getFile(finalFilePath);

                // Copy file
                zipReader.extract(entryName, finalFile);

                // Set file permissions
                await IOUtils.setPermissions(finalFilePath, 0o644);
            }
        }
    }

    async downloadUpdate(updateData) {
        let versionTag = updateData["tag"];

        // Download zip file
        await this.downloadZip(`https://github.com/greeeen-dev/natsumi-browser/archive/refs/tags/${versionTag}.zip`, "update.zip")

        // Extract zip file
        await this.extractZip("update.zip");
    }

    async installUpdate() {
        // Check if update is downloaded
        const hasUpdate = await IOUtils.exists(natsumiNewPath);
        if (!hasUpdate) {
            throw new Error("No update downloaded")
        }

        // Backup old version
        await IOUtils.move(natsumiPath, natsumiOldPath);

        // Install new code
        await IOUtils.move(natsumiNewPath, natsumiPath);

        // Delete old Natsumi code
        if (!this.keepOldVersions) {
            await IOUtils.remove(natsumiOldPath, {recursive: true});
        }
    }

    async runUpdate(updateData) {
        const totalSteps = 3;
        const statusElement = document.getElementById("natsumi-updater-body-2");

        // Step 1: Download update
        statusElement.textContent = `Downloading update (Step 1 of ${totalSteps})`
        await this.downloadUpdate(updateData);

        // Step 2: Extract update
        statusElement.textContent = `Extracting update (Step 2 of ${totalSteps})`
        await this.extractZip("update.zip");

        // Step 3: Install update
        statusElement.textContent = `Installing update (Step 3 of ${totalSteps})`
        await this.installUpdate();

        // Set last update time
        ucApi.Prefs.set("natsumi.updater.last-update", updateData["releasedAt"]);

        // Restart browser
        Services.startup.quit(
            Ci.nsIAppStartup.eRestart | Ci.nsIAppStartup.eAttemptQuit
        );
    }

    showUpdateOverlay(isUpdating = true) {
        if (document.getElementById("natsumi-updater")) {
            // Silently stop execution
            return;
        }

        let updaterNode = convertToXUL(`
            <div id="natsumi-updater">
                <div id="natsumi-updater-content">
                    <image id="natsumi-updater-icon"></image>
                    <div id="natsumi-updater-header">
                        Updating Natsumi
                    </div>
                    <div id="natsumi-updater-body-1">Once the update's done, your browser will restart automatically.</div>
                    <div id="natsumi-updater-body-2">Preparing update</div>
                </div>
            </div>
        `);

        document.body.appendChild(updaterNode);
        document.body.setAttribute("natsumi-updater-updating", "")

        if (!isUpdating) {
            const statusElement = document.getElementById("natsumi-updater-body-2");
            statusElement.textContent = "Updating on another window";
        }
    }

    async userUpdate(updateData) {
        if (!document.getElementById("natsumi-updater")) {
            throw new Error("Updater overlay is not showing");
        }

        try {
            await this.runUpdate(updateData);
        } catch(e) {
            console.error("Update failed:",e);

            // Get elements
            const updaterElement = document.getElementById("natsumi-updater");
            const headerElement = document.getElementById("natsumi-updater-header");
            const bodyElement1 = document.getElementById("natsumi-updater-body-1");
            const bodyElement2 = document.getElementById("natsumi-updater-body-2");

            // Set update failed status
            updaterElement.setAttribute("natsumi-update-failed", "true");
            headerElement.textContent = "Update failed";
            bodyElement1.textContent = "The update failed. Please restart your browser."
            bodyElement2.remove();
        }
    }
}

if (!document.body.natsumiUpdater) {
    document.body.natsumiUpdater = new NatsumiUpdater();
    if (document.body.natsumiUpdater.updaterAvailable) {
        document.body.natsumiUpdater.notifyNewUpdate();
    }
}