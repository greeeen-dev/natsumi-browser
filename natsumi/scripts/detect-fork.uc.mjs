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

function detectFork() {
    let browserTitle = "";

    try {
        browserTitle = document.body.parentNode.attributes["data-title-default"].nodeValue;
    } catch (e) {
        console.error("Error detecting fork:", e);
        return null;
    }

    let forkName = "firefox";

    console.log(browserTitle);

    if (browserTitle === "Ablaze Floorp") {
        forkName = "floorp";
    } else if (browserTitle === "Waterfox") {
        forkName = "waterfox";
    }

    return forkName;
}

let disableAutoFork = false;

if (ucApi.Prefs.get("natsumi.browser.disable-auto-detect").exists()) {
    disableAutoFork = ucApi.Prefs.get("natsumi.browser.disable-auto-detect").value;
}

if (disableAutoFork) {
    console.warn("Automatic fork detection is disabled.");
} else {
    let forkName = detectFork();

    if (forkName) {
        console.log(`Detected browser fork: ${forkName}`);
        ucApi.Prefs.set("natsumi.browser.type", forkName);
    } else {
        console.warn("Could not detect browser fork.");
    }
}