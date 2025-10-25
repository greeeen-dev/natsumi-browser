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

let wheelTimeout = null;

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

    // Get relative position of mouse within window
    const mouseRelativeX = event.pageX;
    const mouseRelativeY = event.pageY;

    // Get total movable area
    const movableX = screen.availWidth - window.innerWidth;
    const movableY = screen.availHeight - window.innerHeight;

    // Calculate movement based on scroll distance
    const movedX = Math.round(event.wheelDeltaX * movementMultiplier);
    const movedY = Math.round(event.wheelDeltaY * movementMultiplier);

    // Calculate new positions for window
    const newX = Math.min(
        Math.max(currentX + movedX, 0), movableX
    );
    const newY = Math.min(
        Math.max(currentY + movedY, 0), movableY
    );

    // Calculate new positions for mouse
    const nativePixelRatio = window.devicePixelRatio || 1;
    const nativeNewX = newX * nativePixelRatio + (mouseRelativeX * nativePixelRatio);
    let nativeNewY = newY * nativePixelRatio + (mouseRelativeY * nativePixelRatio);;

    // Move PiP window and mouse
    window.moveTo(newX, newY);

    // Ensure the new Y position has been applied correctly
    // Otherwise, move mouse based on that (this often happens due to certain OS behaviors)
    if (newY !== screenY) {
        nativeNewY = screenY * nativePixelRatio + (mouseRelativeY * nativePixelRatio);
    }

    // Move mouse position to allow further scrolling
    if (!(currentX === screenX && currentY === screenY)) {
        window.windowUtils.sendNativeMouseEvent(nativeNewX, nativeNewY, 3, 0, 0, null);
    }

    document.body.setAttribute("natsumi-scrolling", "true");

    if (wheelTimeout) {
        clearTimeout(wheelTimeout);
    }

    wheelTimeout = setTimeout(() => {
        document.body.removeAttribute("natsumi-scrolling");
    }, 100);
}

document.addEventListener("wheel", function (e) {
    // we only want to see how this works for now
    movePictureInPicture(e);
});