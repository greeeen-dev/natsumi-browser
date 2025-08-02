// ==UserScript==
// @include   main
// @loadOrder 11
// @ignorecache
// ==/UserScript==

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

    pinnedTabsObserver.observe(pinnedTabsContainer, {childList: true, subtree: true});
}
if (verticalPinnedTabsContainer) {
    // Initial copy of icons for already existing vertical pinned tabs
    let verticalPinnedTabs = verticalPinnedTabsContainer.querySelectorAll("tab");

    verticalPinnedTabs.forEach(function (tab) {
        copyTabIcon(tab);
        addMutatorObserver(tab);
    });

    pinnedTabsObserver.observe(verticalPinnedTabsContainer, {childList: true, subtree: true});
}
