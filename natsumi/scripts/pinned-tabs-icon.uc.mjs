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

let observedTabs = [];

function copyTabIcon(tabObject) {
    if (tabObject.attributes["image"]) {
        // Get image and set it as a variable
        let image = tabObject.attributes["image"].value;
        tabObject.style.setProperty("--natsumi-tab-icon", `url("${image}")`);
    } else {
        // Use default icon
        tabObject.style.setProperty("--natsumi-tab-icon", `url("chrome://global/skin/icons/defaultFavicon.svg")`);
    }
}

function addMutatorObserver(tabObject) {
    const observer = new MutationObserver(function (mutations) {
        mutations.forEach(function (mutationRecord) {
            copyTabIcon(tabObject);
        });
    });

    observer.observe(tabObject, { attributes: true });
    observedTabs.push(observer);
}

// Usually pinned tabs should be here
let pinnedTabsContainer = document.querySelector("#pinned-tabs-container");

// But for some browsers (like Waterfox), it's in a different place
let verticalPinnedTabsContainer = document.querySelector("#vertical-pinned-tabs-container");

const pinnedTabsObserver = new MutationObserver(function (mutations) {
    mutations.forEach(function (mutationRecord) {
        mutationRecord.addedNodes.forEach(function (addedNode) {
            if (addedNode.nodeName === "tab") {
                // If the added node is a pinned tab, copy its icon
                copyTabIcon(addedNode);
                // Add observer to monitor changes in the tab
                addMutatorObserver(addedNode);
            }
        });
    })
});


if (pinnedTabsContainer) {
    // Initial copy of icons for already existing pinned tabs
    let pinnedTabs = pinnedTabsContainer.querySelectorAll("tab");

    pinnedTabs.forEach(function (tab) {
        copyTabIcon(tab);
        addMutatorObserver(tab);
    });

    pinnedTabsObserver.observe(pinnedTabsContainer, {childList: true});
}
if (verticalPinnedTabsContainer) {
    // Initial copy of icons for already existing vertical pinned tabs
    let verticalPinnedTabs = verticalPinnedTabsContainer.querySelectorAll("tab");

    verticalPinnedTabs.forEach(function (tab) {
        copyTabIcon(tab);
        addMutatorObserver(tab);
    });

    pinnedTabsObserver.observe(verticalPinnedTabsContainer, {childList: true});
}
