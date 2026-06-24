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

export let workspacesModulePath = "chrome://noraneko/content/assets/js/index28.js";

// Get Floorp version
let floorpVersion = AppConstants.MOZ_APP_VERSION_DISPLAY.split("@")[0];

// Get minor version
let minorVersion = parseInt(floorpVersion.split(".")[1]);
let patchVersion = parseInt(floorpVersion.split(".")[2]);

// Get Firedragon status
let isFiredragon = AppConstants.MOZ_APP_BASENAME.toLowerCase() === "firedragon";

if (minorVersion >= 14) {
    // Floorp 12.14.0+ (do nothing)
} else if (minorVersion >= 12) {
    // Floorp 12.12.0+
    workspacesModulePath = "chrome://noraneko/content/assets/js/index27.js";
} else if (minorVersion > 9 || minorVersion === 9 && patchVersion >= 2) {
    // Floorp 12.9.2+
    workspacesModulePath = "chrome://noraneko/content/assets/js/index26.js";
} else if (minorVersion === 9 && patchVersion < 2) {
    // Floorp 12.9.0 and 12.9.1
    workspacesModulePath = "chrome://noraneko/content/assets/js/index25.js";
} else if (minorVersion >= 8) {
    // Floorp 12.8.0+
    workspacesModulePath = "chrome://noraneko/content/assets/js/index25.js";
} else if (minorVersion >= 4) {
    // Floorp 12.4.0+
    workspacesModulePath = "chrome://noraneko/content/assets/js/index23.js";
} else {
    // Everything else
    workspacesModulePath = "chrome://noraneko/content/assets/js/index22.js";
}

if (isFiredragon) {
    // Firedragon 12.3.0+ (overrides Floorp module path)
    workspacesModulePath = "chrome://noraneko/content/assets/js/modules/workspaces.js";
}
