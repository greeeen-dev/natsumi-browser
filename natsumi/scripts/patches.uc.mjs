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

// Applies browser-specific CSS patches

class NatsumiPatch {
    constructor(patchId, browserName, browserVersion) {
        this.patchId = patchId;
        this.browserName = browserName;
        this.browserVersion = browserVersion;
    }
}

class NatsumiPatchesManager {
    static patches = [
        new NatsumiPatch("floorp-12-3-0-navbar", "floorp", "12.3.0"),
        new NatsumiPatch("floorp-12-3-0-undo-closed-tab", "floorp", "12.3.0"),
        new NatsumiPatch("floorp-12-3-1-undo-closed-tab", "floorp", "12.3.1"),
        new NatsumiPatch("floorp-12-3-2-undo-closed-tab", "floorp", "12.3.2"),
    ]

    static getPatches() {
        const browserName = AppConstants.MOZ_APP_BASENAME;
        const forkedFox = browserName.toLowerCase() !== "firefox";
        let browserVersion = Services.appinfo.version;
        let forkedVersion = AppConstants.MOZ_APP_VERSION_DISPLAY;

        if (browserName.toLowerCase() === "floorp") {
            // Browser version format: [Floorp version]@[Firefox version] (e.g. 12.3.0@144.0)
            forkedVersion = forkedVersion.split("@")[0];
        }

        if (forkedFox) {
            browserVersion = forkedVersion;
        }

        let patchesToApply = [];

        for (let patch of this.patches) {
            if (patch.browserName.toLowerCase() === browserName.toLowerCase() && patch.browserVersion === browserVersion) {
                patchesToApply.push(patch.patchId);
            }
        }

        return patchesToApply;
    }

    static applyPatches() {
        const patchesToApply = this.getPatches();

        if (patchesToApply.length === 0) {
            return;
        }

        let patchesString = patchesToApply.join(" ");
        document.body.setAttribute("natsumi-patches", patchesString);
    }
}

NatsumiPatchesManager.applyPatches();