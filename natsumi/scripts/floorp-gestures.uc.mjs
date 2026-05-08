// ==UserScript==
// @include   main
// @loadOrder 11
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
import { applyCustomTheme } from "./custom-theme.sys.mjs";

function convertToXUL(node) {
    // noinspection JSUnresolvedReference
    return window.MozXULElement.parseXULToFragment(node);
}

class NatsumiGesturesWrapper {
    // A wrapper class for managing mouse gestures in Floorp.
    constructor() {
        this.gesturesModule = null;
        this.initialized = false;
    }

    async init() {
        let gesturesModulePath = "chrome://noraneko/content/assets/js/gestures.js";
        this.gesturesModule = await import(gesturesModulePath);

        // Set init to true
        this.initialized = true;
    }

    executeAction(gestureName) {
        if (!this.initialized) {
            return;
        }

        // Get gesture
        const gestures = this.gesturesModule.g();

        for (const gesture of gestures) {
            if (gesture.name === gestureName) {
                gesture.fn(window);
                return;
            }
        }

        console.warn("No gesture found: " + gestureName);
    }
}

let isFloorp = false;

if (ucApi.Prefs.get("natsumi.browser.type").exists) {
    isFloorp = ucApi.Prefs.get("natsumi.browser.type").value === "floorp";
}

if (isFloorp) {
    if (!document.body.natsumiGesturesWrapper) {
        document.body.natsumiGesturesWrapper = new NatsumiGesturesWrapper();
        document.body.natsumiGesturesWrapper.init();
    }
}
