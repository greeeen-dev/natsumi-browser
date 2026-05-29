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

class NatsumiBrowserSeparationManager {
    constructor() {
        this.marginStyleNode = null;
    }

    init() {
        let browserSeparation = 6;
        if (ucApi.Prefs.get("natsumi.theme.browser-separation").exists()) {
            browserSeparation = ucApi.Prefs.get("natsumi.theme.browser-separation").value;
        }

        // Create browser separation style
        this.marginStyleNode = document.createElement("style");
        this.marginStyleNode.id = "natsumi-browser-separation"
        document.head.appendChild(this.marginStyleNode);

        // Apply initial separation
        this.updateSeparation(browserSeparation);

        // Update separation on change
        Services.prefs.addObserver("natsumi.theme.browser-separation", () => {
            let browserSeparation = ucApi.Prefs.get("natsumi.theme.browser-separation").value;
            this.updateSeparation(browserSeparation);
        });
    }

    updateSeparation(newSeparation) {
        if (typeof newSeparation !== "number") {
            newSeparation = 6;
        }

        this.marginStyleNode.innerHTML = `
            * {
                --natsumi-browser-separation: ${newSeparation}px;
            }
        `
    }
}

if (!document.body.natsumiBrowserSeparationManager) {
    document.body.natsumiBrowserSeparationManager = new NatsumiBrowserSeparationManager();
    document.body.natsumiBrowserSeparationManager.init();
}