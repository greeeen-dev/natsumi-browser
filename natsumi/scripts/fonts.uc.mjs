// ==UserScript==
// @include   main
// @include   chrome://global/content/pictureinpicture/player.xhtml*
// @include   about:preferences*
// @include   about:settings*
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

class NatsumiFontManager {
    constructor() {}

    init() {
        if (ucApi.Prefs.get("natsumi.theme.font").exists()) {
            this.setFont(ucApi.Prefs.get("natsumi.theme.font").value);
        }

        Services.prefs.addObserver("natsumi.theme.font", () => {
            if (ucApi.Prefs.get("natsumi.theme.font").exists()) {
                this.setFont(ucApi.Prefs.get("natsumi.theme.font").value);
            }
        })
    }

    setFont(newFont) {
        if (newFont === "default") {
            document.body.style.removeProperty("--natsumi-custom-font");
            return;
        }

        document.body.style.setProperty("--natsumi-custom-font", newFont);
    }
}

if (!document.body.natsumiFontManager) {
    document.body.natsumiFontManager = new NatsumiFontManager();
    document.body.natsumiFontManager.init();
}