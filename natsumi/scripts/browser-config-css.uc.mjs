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

function updateSeparation(newSeparation) {
  document.documentElement.style.setProperty('--natsumi-browser-separation', newSeparation + "px");
}

class NatsumiConfigToCSSManager {
    constructor(watching, valueDefault, change) {
      this.watching = watching;
      this.value = valueDefault;
      this.change = change;
    }

    init() {
        const pref = ucApi.Prefs.get(this.watching);
        if (pref.exists()) {
            this.change(pref.value);
        }
        this.observer = () => {
            const newValue = ucApi.Prefs.get(this.watching).value;
            this.change(newValue);
        };
        Services.prefs.addObserver(this.watching, this.observer);
    }

}

if (!document.body.natsumiConfigToCSSManager) {
    document.body.natsumiConfigToCSSManager = new NatsumiConfigToCSSManager("natsumi.theme.browser-separation", 6, updateSeparation);
    document.body.natsumiConfigToCSSManager.init();
}
