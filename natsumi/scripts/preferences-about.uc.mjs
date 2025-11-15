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

let version;
let branch;

function convertToXUL(node) {
    // noinspection JSUnresolvedReference
    return window.MozXULElement.parseXULToFragment(node);
}

function addAboutPane() {
    let prefsView = document.getElementById("mainPrefPane");
    let homePane = prefsView.querySelector("#firefoxHomeCategory");

    const isStable = branch === "stable";
    const browserName = AppConstants.MOZ_APP_BASENAME;
    const forkedFox = browserName.toLowerCase() !== "firefox";
    let browserVersion = Services.appinfo.version;
    let forkedVersion = AppConstants.MOZ_APP_VERSION_DISPLAY;

    if (browserName.toLowerCase() === "floorp") {
        // Browser version format: [Floorp version]@[Firefox version] (e.g. 12.3.0@144.0)
        forkedVersion = forkedVersion.split("@")[0];
    }

    let nodeString = `
        <hbox id="natsumiAboutCategory" class="subcategory" data-category="paneNatsumiAbout" hidden="true">
            <html:h1>About Natsumi</html:h1>
        </hbox>
        <groupbox id="natsumiAboutExperimentalWarning" data-category="paneNatsumiAbout" hidden="true">
            <div class="natsumi-settings-info warning">
                <div class="natsumi-settings-info-icon"></div>
                <div class="natsumi-settings-info-text">
                    You're on an experimental version of Natsumi. Don't panic, and stay safe!
                </div>
            </div>
        </groupbox>
        <groupbox id="natsumiAboutGroup" class="subcategory" data-category="paneNatsumiAbout" hidden="true">
            <div id="natsumi-about-container">
                <div id="natsumi-about-box">
                    <div id="natsumi-about-icon"></div>
                    <div id="natsumi-about-info-container">
                        <div id="natsumi-about-name">Natsumi Browser</div>
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
    let versionNode = document.getElementById("natsumi-about-version");
    versionNode.textContent = `Version ${version}`;

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
    addToSidebar();
    addAboutPane();
}).catch(error => {
    console.error("Failed to fetch Natsumi version:", error);
    version = "Unknown";
    branch = "stable";
    addToSidebar();
    addAboutPane();
});