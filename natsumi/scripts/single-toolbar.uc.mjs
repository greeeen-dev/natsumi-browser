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

let hoverTimeout = null;
let hoveredElements = 0;

function setHover(isWindowButton = false) {
    let singleToolbarEnabled = false;
    if (ucApi.Prefs.get("natsumi.theme.single-toolbar").exists()) {
        singleToolbarEnabled = ucApi.Prefs.get("natsumi.theme.single-toolbar").value;
    }

    if (!singleToolbarEnabled) {
        hoveredElements = 0;
        document.body.removeAttribute("natsumi-bookmarks-hover");
        return;
    }

    if (isWindowButton) {
        let isMac = Services.appinfo.OS.toLowerCase() !== "darwin";
        let forcedLeft = false;

        if (ucApi.Prefs.get("natsumi.theme.force-window-controls-to-left").exists()) {
            forcedLeft = ucApi.Prefs.get("natsumi.theme.force-window-controls-to-left").value;
        }

        if ((isMac || forcedLeft) && isWindowButton) {
            return;
        }
    }

    if (hoverTimeout) {
        clearTimeout(hoverTimeout);
    }

    hoveredElements++;
    document.body.setAttribute("natsumi-bookmarks-hover", "");
}

function removeHover(isWindowButton = false) {
    let singleToolbarEnabled = false;
    if (ucApi.Prefs.get("natsumi.theme.single-toolbar").exists()) {
        singleToolbarEnabled = ucApi.Prefs.get("natsumi.theme.single-toolbar").value;
    }

    if (!singleToolbarEnabled) {
        hoveredElements = 0;
        document.body.removeAttribute("natsumi-bookmarks-hover");
        return;
    }

    if (isWindowButton) {
        let isMac = Services.appinfo.OS.toLowerCase() !== "darwin";
        let forcedLeft = false;

        if (ucApi.Prefs.get("natsumi.theme.force-window-controls-to-left").exists()) {
            forcedLeft = ucApi.Prefs.get("natsumi.theme.force-window-controls-to-left").value;
        }

        if ((isMac || forcedLeft) && isWindowButton) {
            return;
        }
    }

    hoveredElements--;
    if (hoveredElements > 0) {
        return;
    } else if (hoveredElements < 0) {
        hoveredElements = 0;
    }

    hoverTimeout = setTimeout(() => {
        document.body.removeAttribute("natsumi-bookmarks-hover");
    }, 1000);
}

function detectBookmarkHover() {
    let bookmarksToolbar = document.getElementById("PersonalToolbar");
    let windowButtonsContainer = document.querySelector("#PersonalToolbar .titlebar-buttonbox-container");

    if (!windowButtonsContainer) {
        let originalWindowButtonsContainer = document.querySelector(".titlebar-buttonbox-container");
        console.log(originalWindowButtonsContainer);
        windowButtonsContainer = originalWindowButtonsContainer.cloneNode(true);
        bookmarksToolbar.appendChild(windowButtonsContainer);
    }

    if (bookmarksToolbar) {
        bookmarksToolbar.addEventListener("mouseover", (event) => {
            setHover();
        });
        bookmarksToolbar.addEventListener("mouseout", (event) => {
            removeHover();
        });
    }

    if (windowButtonsContainer) {
        windowButtonsContainer.addEventListener("mouseover", (event) => {
            console.log(event);
            setHover(true);
        });
        windowButtonsContainer.addEventListener("mouseout", (event) => {
            removeHover(true);
        });
    }
}

detectBookmarkHover();