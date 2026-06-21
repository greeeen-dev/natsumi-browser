// ==UserScript==
// @include   chrome://global/content/pictureinpicture/player.xhtml*
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

// Adjust this as needed
const movementMultiplier = 0.7;
const zoomMultiplier = 8;

let wheelTimeout = null;

// Window and mouse tracking for window scaling
let originalWidth;
let originalHeight;
let originalMouseX;
let originalMouseY;
let originalMouseRelativeX;
let originalMouseRelativeY;

// Mouse tracking for window movement
let reportedMouseX = null;
let reportedMouseY = null;
let reportedRelativeMouseX = null;
let reportedRelativeMouseY = null;

function setScrollAttribute(timeout = 100) {
    document.body.setAttribute("natsumi-scrolling", "true");

    if (wheelTimeout) {
        clearTimeout(wheelTimeout);
    }

    wheelTimeout = setTimeout(() => {
        document.body.removeAttribute("natsumi-scrolling");

        // Reset movement data
        reportedMouseX = null;
        reportedMouseY = null;
        reportedRelativeMouseX = null;
        reportedRelativeMouseY = null;
    }, timeout);
}

function zoomPictureInPicture(event) {
    let scrollToMoveDisabled = false;
    if (ucApi.Prefs.get("natsumi.pip.disable-scroll-to-move").exists()) {
        scrollToMoveDisabled = ucApi.Prefs.get("natsumi.pip.disable-scroll-to-move").value;
    }

    if (scrollToMoveDisabled) {
        return;
    }

    // Get zoom amount
    let zoomAmount = event.deltaY * -1;

    // Calculate height zoom
    if (!originalWidth || !originalHeight) {
        originalWidth = window.innerWidth;
        originalHeight = window.innerHeight;
    } else {
        // Ensure the ratio hasn't changed significantly
        const currentRatio = window.innerWidth / window.innerHeight;
        const originalRatio = originalWidth / originalHeight;

        if (Math.abs(currentRatio - originalRatio) > 0.1) {
            originalWidth = window.innerWidth;
            originalHeight = window.innerHeight;
        }
    }

    // Calculate new width
    const newWidth = window.innerWidth + (zoomAmount * zoomMultiplier);

    // Calculate new height
    const newHeight = originalHeight * (newWidth / originalWidth);

    // Ensure width and height are above 120px
    if (newWidth < 120 || newHeight < 120) {
        return;
    }

    // Get rounded widths and heights
    const flooredNewWidth = Math.floor(newWidth);
    const flooredNewHeight = Math.floor(newHeight);

    // Is there any actual change?
    if (flooredNewWidth === window.innerWidth || flooredNewHeight === window.innerHeight) {
        return;
    }

    // Get relative position of mouse within window
    const mouseRelativeX = event.pageX;
    const mouseRelativeY = event.pageY;

    // Calculate relative position ratio
    const mouseRelativeRatioX = mouseRelativeX / window.innerWidth;
    const mouseRelativeRatioY = mouseRelativeY / window.innerHeight;

    // Check if mouse position has changed
    if (!originalMouseX || !originalMouseY) {
        originalMouseX = event.screenX;
        originalMouseY = event.screenY;
        originalMouseRelativeX = mouseRelativeRatioX;
        originalMouseRelativeY = mouseRelativeRatioY;
    }
    if (originalMouseX !== event.screenX || originalMouseY !== event.screenY) {
        originalMouseX = event.screenX;
        originalMouseY = event.screenY;
        originalMouseRelativeX = mouseRelativeRatioX;
        originalMouseRelativeY = mouseRelativeRatioY;
    }

    // Calculate movement amount
    let newX = event.screenX - (flooredNewWidth * originalMouseRelativeX);
    let newY = event.screenY - (flooredNewHeight * originalMouseRelativeY);

    let shouldCenter = false;
    if (ucApi.Prefs.get("natsumi.pip.center-scale").exists()) {
        shouldCenter = ucApi.Prefs.get("natsumi.pip.center-scale").value;
    }

    if (shouldCenter) {
        newX = ((flooredNewWidth - window.innerWidth) / -2) + screenX;
        newY = ((flooredNewHeight - window.innerHeight) / -2) + screenY;
    }

    // Resize window
    window.resizeTo(newWidth, newHeight);
    window.moveTo(newX, newY);

    setScrollAttribute(300);
}

function movePictureInPicture(event) {
    let scrollToMoveDisabled = false;
    if (ucApi.Prefs.get("natsumi.pip.disable-scroll-to-move").exists()) {
        scrollToMoveDisabled = ucApi.Prefs.get("natsumi.pip.disable-scroll-to-move").value;
    }

    if (scrollToMoveDisabled) {
        return;
    }

    // Get current screen position
    const currentX = screenX;
    const currentY = screenY;

    // Get current mouse position
    const currentMouseX = event.screenX;
    const currentMouseY = event.screenY;

    // Get relative position of mouse within window
    const mouseRelativeX = event.pageX;
    const mouseRelativeY = event.pageY;

    // Get total movable area
    const movableX = screen.availWidth - window.innerWidth;
    const movableY = screen.availHeight - window.innerHeight;
    const minimumX = screen.availLeft;
    const minimumY = screen.availTop;

    // Account for inverted scroll
    let localMovementMulitplier = movementMultiplier;
    if (ucApi.Prefs.get("natsumi.browser.invert-scroll").exists) {
        if (ucApi.Prefs.get("natsumi.browser.invert-scroll").value) {
            localMovementMulitplier = movementMultiplier * -1;
        }
    }

    // Calculate movement based on scroll distance
    const movedX = Math.round(event.wheelDeltaX * localMovementMulitplier);
    const movedY = Math.round(event.wheelDeltaY * localMovementMulitplier);

    // Calculate new positions for window
    const newX = Math.floor(Math.min(
        Math.max(currentX + movedX, 0), movableX + minimumX
    ));
    const newY = Math.floor(Math.min(
        Math.max(currentY + movedY, 0), movableY + minimumY
    ));

    // Move PiP window and mouse
    window.moveTo(newX, newY);

    // Calculate new positions for mouse
    const nativePixelRatio = window.devicePixelRatio || 1;
    const nativeNewX = (currentMouseX * nativePixelRatio) + ((screenX - currentX) * nativePixelRatio);
    let nativeNewY = (currentMouseY * nativePixelRatio) + ((screenY - currentY) * nativePixelRatio);

    // Store reported and relative positions if not set
    if (reportedMouseX === null || reportedMouseY === null) {
        reportedMouseX = currentMouseX;
        reportedMouseY = currentMouseY;
        reportedRelativeMouseX = mouseRelativeX;
        reportedRelativeMouseY = mouseRelativeY;
    }

    // Did the mouse move on the previous movement as expected?
    let relativeDifferenceX = 0;
    let relativeDifferenceY = 0;
    if (reportedRelativeMouseX !== mouseRelativeX) {
        relativeDifferenceX = (reportedRelativeMouseX - mouseRelativeX) * nativePixelRatio;
    }
    if (reportedRelativeMouseY !== mouseRelativeY) {
        relativeDifferenceY = (reportedRelativeMouseY - mouseRelativeY) * nativePixelRatio;
    }

    // Ensure relative positions are sane
    let brokenRelative = (
        mouseRelativeX < 0 || mouseRelativeX > window.innerWidth ||
        mouseRelativeY < 0 || mouseRelativeY > window.innerHeight
    );

    // Move mouse position to allow further scrolling
    if (!(currentX === screenX && currentY === screenY) && !brokenRelative) {
        window.windowUtils.sendNativeMouseEvent(nativeNewX + relativeDifferenceX, nativeNewY + relativeDifferenceY, 3, 0, 0, null);
    }

    // Store current mouse data
    reportedMouseX = currentMouseX;
    reportedMouseY = currentMouseY;

    setScrollAttribute();
}

function addLiveIndicator() {
    let startControls = document.querySelector(".start-controls");
    let liveIndicator = document.createElement("div");
    liveIndicator.id = "natsumi-live-indicator";
    liveIndicator.textContent = "LIVE";
    startControls.appendChild(liveIndicator);
}

document.addEventListener("wheel", function (e) {
    if (window.windowState === window.STATE_FULLSCREEN) {
        // Do not move or resize in fullscreen
        return;
    }

    if (e.ctrlKey) {
        // Resize window
        zoomPictureInPicture(e);
    } else {
        // Move window
        movePictureInPicture(e);
    }
});

addLiveIndicator();