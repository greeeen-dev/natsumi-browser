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

import { NatsumiActorWrapper } from "./actors/js-actors.js";

function convertToXUL(node) {
    // noinspection JSUnresolvedReference
    return window.MozXULElement.parseXULToFragment(node);
}

let JSWindowActors = {
    NatsumiWeb: {
        parent: {
            esModuleURI: "chrome://natsumi/content/scripts/actors/NatsumiWebParent.sys.mjs"
        },
        child: {
            esModuleURI: "chrome://natsumi/content/scripts/actors/NatsumiWebChild.sys.mjs",
            events: {
                DOMContentLoaded: {},
                click: {
                    capture: true
                },
                mousedown: {
                    capture: true
                },
                mouseup: {
                    capture: true
                },
                drag: {
                    capture: true
                }
            },
        },
        allFrames: true,
        matches: [
            "https://natsumi.greeeen.dev/*"
        ]
    }
}

try {
    let actorWrapper = new NatsumiActorWrapper();
    actorWrapper.addWindowActors(JSWindowActors);
} catch (e) {
    console.error("Failed to add Natsumi JS Window Actors:", e);
}
