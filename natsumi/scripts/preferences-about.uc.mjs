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
        <groupbox id="natsumiAboutGroup" class="subcategory" data-category="paneNatsumiAbout" hidden="true">
            <div id="natsumi-about-container">
                <div id="natsumi-about-icon"></div>
                <div id="natsumi-about-name">Natsumi Browser</div>
                <div id="natsumi-about-version-container">
                    <div id="natsumi-about-version"></div>
                    <div id="natsumi-about-stability-badge"></div>
                </div>
                <div class="natsumi-about-vertical-separator"></div>
                <div id="natsumi-about-mission-container">
                    <div id="natsumi-about-mission">
                        Natsumi is built to make your browser more beautiful and functional, yet remain as customizable
                        as possible.                        
                    </div>
                </div>
                <div class="natsumi-about-vertical-separator"></div>
                <div id="natsumi-about-links-container">
                    <html:a href="https://github.com/greeeen-dev/natsumi-browser" class="natsumi-about-link">Source code</html:a>
                </div>
            </div>
        </groupbox>
    `

    prefsView.insertBefore(convertToXUL(nodeString), homePane);

    // Set metadata
    let versionNode = document.getElementById("natsumi-about-version");
    if (forkedFox) {
        versionNode.textContent = `${version} on ${browserName} ${forkedVersion} (Firefox ${browserVersion})`;
    } else {
        versionNode.textContent = `${version} on Firefox ${browserVersion}`;
    }

    let stabilityBadge = document.getElementById("natsumi-about-stability-badge");
    if (isStable) {
        stabilityBadge.setAttribute("hidden", "true");
    }
}

function addToSidebar() {
    let nodeString = `
    <richlistitem id="natsumi-about" class="category" value="paneNatsumiAbout" data-l10n-id="category-natsumi-shortcuts" data-l10n-attrs="tooltiptext" align="center" tooltiptext="About Natsumi">
        <image class="category-icon"/>
        <label class="category-name" flex="1">
            About Natsumi
        </label>
    </richlistitem>
    `
    let sidebar = document.getElementById("categories");
    const generalPane = sidebar.querySelector("#category-general");
    sidebar.appendChild(convertToXUL(nodeString));

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