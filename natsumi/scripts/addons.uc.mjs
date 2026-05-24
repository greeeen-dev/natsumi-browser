// ==UserScript==
// @include   about:addons*
// @ignorecache
// @loadOrder 10
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

// Get redesign status
const hasRedesign = document.getElementById("categories") === null;

if (hasRedesign) {
    document.body.setAttribute("natsumi-addons-redesign", "");
}

function applySidebarIcons() {
    const sidebarIconMapping = {
        "category-discover": "trophy",
        "category-extension": "addons",
        "category-theme": "paintbrush",
        "category-plugin": "plugin",
        "category-languages": "language",
        "category-mlmodel": "robot",
        "preferencesButton": "settings",
        "helpButton": "help"
    }
    const availablePacks = [
        "lucide",
        "fluent"
    ]

    let iconPack = "";

    if (ucApi.Prefs.get("natsumi.theme.icons").exists()) {
        iconPack = ucApi.Prefs.get("natsumi.theme.icons").value;
    }

    let revertIcons = !availablePacks.includes(iconPack);

    for (let sidebarCategory in sidebarIconMapping) {
        let sidebarIcon = sidebarIconMapping[sidebarCategory];

        let sidebarCategoryNode = document.getElementById(sidebarCategory);
        if (!sidebarCategoryNode) {
            continue;
        }

        if (revertIcons) {
            if (!sidebarCategoryNode.hasAttribute("original-icon")) {
                continue;
            }

            sidebarCategoryNode.setAttribute("iconsrc", sidebarCategoryNode.getAttribute("original-icon"));
        } else {
            const sidebarIconLink = `chrome://natsumi/content/icons/${iconPack}/${sidebarIcon}.svg`;

            if (!sidebarCategoryNode.hasAttribute("original-icon")) {
                sidebarCategoryNode.setAttribute("original-icon", sidebarCategoryNode.getAttribute("iconsrc"));
            }

            sidebarCategoryNode.setAttribute("iconsrc", sidebarIconLink);
        }
    }
}

// Add subcategories
if (hasRedesign) {
    try {
        applySidebarIcons();

        Services.prefs.addObserver("natsumi.theme.icons", () => {
            applySidebarIcons();
        })
    } catch (e) {
        console.error(e);
    }
}
