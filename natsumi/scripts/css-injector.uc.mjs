// ==UserScript==
// @include      main
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

import {NatsumiCSSInjector} from "./injector.sys.mjs";

const dialogUrls = [
    "chrome://global/content/commonDialog.xhtml",
    "chrome://browser/content/sanitize_v2.xhtml"
]

if (!window.natsumiCSSInjector) {
    try {
        window.natsumiCSSInjector = new NatsumiCSSInjector();
        window.natsumiCSSInjector.inject("linux-border-radius.css");
        window.natsumiCSSInjector.inject("macos-menus.css");
        window.natsumiCSSInjector.inject("tabs-fixes.css");
        window.natsumiCSSInjector.inject("theme-builder.css");
        window.natsumiCSSInjector.inject("file-picker.css");
        window.natsumiCSSInjector.inject("pinned-tabs.css");
        window.natsumiCSSInjector.inject("mute-button.css");

        window.addEventListener("DOMContentLoaded", (event) => {
            let targetDoc = event.target;
            console.log(dialogUrls, targetDoc.URL, dialogUrls.includes(targetDoc.URL));
            if (dialogUrls.includes(targetDoc.URL)) {
                console.log(`Creating injector for ${targetDoc.URL}`);
                targetDoc.natsumiCSSInjector = new NatsumiCSSInjector(targetDoc);

                // Add style
                let dialogSR = targetDoc.querySelector("dialog").shadowRoot;
                targetDoc.natsumiCSSInjector.inject("dialog-buttons.css", dialogSR);
            }
        });
    } catch(e) {
        console.error(e);
    }
}
