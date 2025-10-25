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
import {NatsumiNotification} from "./notifications.sys.mjs";
import {resetTabStyleIfNeeded} from "./reset-tab-style.sys.mjs";

function resetTabStyleWithNotification() {
    let didReset = resetTabStyleIfNeeded();
    if (didReset) {
        // Send notification
        let notificationObject = new NatsumiNotification(
            "You can't use this tab style!",
            "We've reverted your tab style to Proton. To use other tab styles, switch to the Classic tab design in settings.",
            "chrome://natsumi/content/icons/lucide/warning.svg",
            10000,
            "warning"
        )
        notificationObject.addToContainer();
    }
}

let isFloorp = false;
if (ucApi.Prefs.get("natsumi.browser.type").exists) {
    isFloorp = ucApi.Prefs.get("natsumi.browser.type").value === "floorp";
}

if (isFloorp) {
    let browser = document.getElementById("browser");
    if (browser) {
        Services.prefs.addObserver("floorp.design.configs", resetTabStyleWithNotification);
    }

    // Check if we've been through the onboarding yet
    let didOnboarding = false;
    if (ucApi.Prefs.get("natsumi.welcome.viewed").exists) {
        didOnboarding = ucApi.Prefs.get("natsumi.welcome.viewed").value;
    }

    // If onboarding wasn't done yet, onboarding will handle this for us
    if (didOnboarding) {
        resetTabStyleWithNotification();
    }
}