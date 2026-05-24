// ==UserScript==
// @include   about:preferences*
// @include   about:settings*
// @ignorecache
// @loadOrder 11
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

let version;
let branch;
let codename;

let categoryNode = document.getElementById("categories");
const hasRedesign = categoryNode.nodeName === "html:moz-page-nav";
const hasRedesignV2 = document.getElementById("category-general").getAttribute("hidden") && hasRedesign;

// Get correct header
let categoryHeader = "h1";

if (hasRedesignV2) {
    categoryHeader = "h2"
}

let hasUpdate = false;

function convertToXUL(node) {
    // noinspection JSUnresolvedReference
    return window.MozXULElement.parseXULToFragment(node);
}

function updateBrowser() {
    // Get recently focused document
    const lastFocusedWindow = ucApi.Windows.getLastFocused();
    const primaryDocument = lastFocusedWindow.document;
    const updater = primaryDocument.body.natsumiUpdater;

    if (!updater.updaterAvailable) {
        // Updater disabled
        return;
    }
    if (!updater.lastAvailableUpdate) {
        // No updates available
        return;
    }

    // Set updater overlay
    updater.showUpdateOverlay();

    ucApi.Windows.forEach((browserDocument, browserWindow) => {
        browserDocument.body.natsumiUpdater.showUpdateOverlay(false);
    });

    // Run updater
    updater.userUpdate(updater.lastAvailableUpdate);
}

function checkForUpdates() {
    if (hasUpdate) {
        return;
    }

    // Get recently focused document
    const lastFocusedWindow = ucApi.Windows.getLastFocused();
    const primaryDocument = lastFocusedWindow.document;
    const updater = primaryDocument.body.natsumiUpdater;

    // Get updater button
    const updaterContainer = document.getElementById("natsumi-about-updater");
    const updaterStatus = document.getElementById("natsumi-about-updater-status");
    const updaterButton = document.getElementById("natsumi-about-updater-button");

    updaterContainer.removeAttribute("natsumi-update-failed");
    updaterContainer.setAttribute("natsumi-update-checking", "");
    updaterStatus.textContent = "Checking for updates...";

    // Induce artificial delay then check for updates
    // This is so that the updater doesn't look like it's broken
    setTimeout(() => {
        updater.checkForUpdates().then((data) => {
            updaterContainer.removeAttribute("natsumi-update-checking");

            if (!data.available) {
                hasUpdate = false;
                updaterStatus.textContent = "You're up to date!";
                return;
            }

            hasUpdate = true;
            updaterContainer.setAttribute("natsumi-update-available", "");
            updaterButton.textContent = `Update to ${data.data["version"]}`;
        }).catch((e) => {
            console.error("Failed to check for updates:", e);
            updaterContainer.removeAttribute("natsumi-update-checking");
            updaterContainer.setAttribute("natsumi-update-failed", "");
            updaterStatus.textContent = "Update check failed."
        });
    }, 100);
}

function addAboutPane() {
    let prefsView = document.getElementById("mainPrefPane");
    let homePane = prefsView.querySelector("#firefoxHomeCategory");

    const isStable = branch === "stable";
    const isStardust = branch === "alpha" || branch === "beta";
    let browserName = AppConstants.MOZ_APP_BASENAME;
    const forkedFox = browserName.toLowerCase() !== "firefox";
    let browserVersion = Services.appinfo.platformVersion ?? Services.appinfo.version;
    let forkedVersion = AppConstants.MOZ_APP_VERSION_DISPLAY;
    let isTor = false;

    if (browserName.toLowerCase() === "floorp") {
        // Browser version format: [Floorp version]@[Firefox version] (e.g. 12.3.0@144.0)
        forkedVersion = forkedVersion.split("@")[0];
    } else if (browserName.toLowerCase() === "mullvadbrowser") {
        browserName = AppConstants.MOZ_APP_DISPLAYNAME_DO_NOT_USE;
        forkedVersion = AppConstants.BASE_BROWSER_VERSION;
        isTor = true;
    } else if (browserName.toLowerCase() === "glide") {
        browserName = AppConstants.MOZ_APP_DISPLAYNAME_DO_NOT_USE;
        browserVersion = AppConstants.GLIDE_FIREFOX_VERSION;
    }

    let natsumiName = "Natsumi Browser";
    if (isStardust) {
        natsumiName = "Natsumi Stardust";
    }

    let nodeString = `
        <hbox id="natsumiAboutCategory" class="subcategory" data-category="paneNatsumiAbout" hidden="true">
            <html:${categoryHeader}>About Natsumi</html:${categoryHeader}>
        </hbox>
        <groupbox id="natsumiAboutExperimentalWarning" data-category="paneNatsumiAbout" hidden="true">
            <div class="natsumi-settings-info warning">
                <div class="natsumi-settings-info-icon"></div>
                <div class="natsumi-settings-info-text">
                    You're on an experimental version of Natsumi. Don't panic, and stay safe!
                </div>
            </div>
        </groupbox>
        <groupbox id="natsumiTorWarning" data-category="paneNatsumiAbout" hidden="true">
            <div class="natsumi-settings-info caution">
                <div class="natsumi-settings-info-icon"></div>
                <div class="natsumi-settings-info-text">
                    <html:strong>The Tor Project recommends against installing plugins onto Tor Browser, which your
                    browser is based on.</html:strong> You can continue to use Natsumi with this browser, but you
                    acknowledge the risks of doing so.<html:br/>
                    <html:br/>
                    Natsumi is provided "as is" without warranty of any kind. We will not assume any responsibility for
                    privacy or security issues caused by using Natsumi with Tor Browser, if any.<html:br/>
                    <html:br/>
                    The Natsumi Browser project is not affiliated with Tor Project in any way.
                </div>
            </div>
        </groupbox>
        <groupbox id="natsumiAboutGroup" class="subcategory" data-category="paneNatsumiAbout" hidden="true">
            <div id="natsumi-about-container" stardust="${isStardust}">
                <div id="natsumi-about-box">
                    <div id="natsumi-about-icon"></div>
                    <div id="natsumi-about-info-container">
                        <div id="natsumi-about-name"></div>
                        <div id="natsumi-about-updater">
                            <div id="natsumi-about-updater-icon"></div>
                            <div id="natsumi-about-updater-status">You're up to date!</div>
                            <div id="natsumi-about-updater-button">Check for updates</div>
                        </div>
                        <div id="natsumi-about-version-container">
                            <div id="natsumi-about-version"></div>
                            <div id="natsumi-about-stability-badge"></div>
                        </div>
                        <div id="natsumi-about-browser-container">
                            <div id="natsumi-about-browser-version"></div>
                        </div>
                    </div>
                </div>
                <div class="natsumi-about-vertical-separator"></div>
                <div id="natsumi-about-links-container">
                    <html:a href="https://github.com/greeeen-dev/natsumi-browser" class="natsumi-about-link">Source code</html:a>
                    <html:a href="https://natsumi.greeeen.dev" class="natsumi-about-link">Website</html:a>
                    <html:a href="https://natsumi.greeeen.dev/discord" class="natsumi-about-link">Discord</html:a>
                </div>
            </div>
        </groupbox>
    `

    prefsView.insertBefore(convertToXUL(nodeString), homePane);

    // Set metadata
    let nameNode = document.getElementById("natsumi-about-name");
    nameNode.textContent = natsumiName;

    let versionNode = document.getElementById("natsumi-about-version");
    versionNode.textContent = `Version ${version} (${codename})`;

    let browserVersionNode = document.getElementById("natsumi-about-browser-version");
    if (forkedFox) {
        browserVersionNode.textContent = `Running on ${browserName} ${forkedVersion} (Firefox ${browserVersion})`;
    } else {
        browserVersionNode.textContent = `Running on Firefox ${browserVersion}`;
    }

    let stabilityBadge = document.getElementById("natsumi-about-stability-badge");
    let experimentalWarning = document.getElementById("natsumiAboutExperimentalWarning");
    if (isStable) {
        stabilityBadge.setAttribute("hidden", "true");
        experimentalWarning.style.display = "none";
    }

    let torWarning = document.getElementById("natsumiTorWarning");
    if (!isTor) {
        torWarning.style.display = "none";
    }

    // Set updater
    let updaterButton = document.getElementById("natsumi-about-updater-button");
    updaterButton.addEventListener("click", () => {
        if (hasUpdate) {
            updateBrowser();
        } else {
            checkForUpdates();
        }
    })

    // Run initial check
    checkForUpdates();
}

function addToSidebar() {
    // noinspection JSUnresolvedReference
    gCategoryInits.set("paneNatsumiAbout", {
        _initted: true,
        init: () => {}
    });
}

// Get Natsumi version
let versionPath = "chrome://natsumi/content/version.json";
fetch(versionPath).then(response => response.json()).then(data => {
    version = data.version;
    branch = data.branch;
    codename = data.codename;
    addToSidebar();
    addAboutPane();
}).catch(error => {
    console.error("Failed to fetch Natsumi version:", error);
    version = "Unknown";
    branch = "stable";
    codename = "Unknown";
    addToSidebar();
    addAboutPane();
});