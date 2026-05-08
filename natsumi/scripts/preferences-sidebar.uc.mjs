// ==UserScript==
// @include   about:preferences*
// @include   about:settings*
// @ignorecache
// @loadOrder 11
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

let categoryNode = document.getElementById("categories");
const hasRedesign = categoryNode.nodeName === "html:moz-page-nav";
let hasSubcategories = [];
let hasDynamic = [];

function getSubcategoryId(subcategory) {
    let subcategoryId;

    switch (subcategory.nodeName) {
        case "groupbox":
            subcategoryId = subcategory.id;
            break;
        case "moz-fieldset":
            subcategoryId = subcategory.getAttribute("data-l10n-id");
            break;
        default:
            subcategoryId = subcategory.id;
    }

    return subcategoryId;
}

function addSidebarSubcategory(categoryButton) {
    const categoryName = categoryButton.getAttribute("view");

    if (hasSubcategories.includes(categoryName)) {
        return;
    }

    // Get all subcategories
    const mainPrefPane = document.getElementById("mainPrefPane");
    const settingPane = mainPrefPane.querySelector(`setting-pane[data-category="${categoryName}"]`);
    let allSubcategories = mainPrefPane.querySelectorAll(`hbox.subcategory[data-category="${categoryName}"]`);
    let categoryShadowButton = categoryButton.shadowRoot.querySelector("button");

    if (allSubcategories.length <= 1) {
        // Detect by card headings
        if (settingPane) {
            // Use new setting-pane element
            allSubcategories = settingPane.querySelectorAll("moz-fieldset[hasheading]");
        } else {
            allSubcategories = mainPrefPane.querySelectorAll(`groupbox[data-category="${categoryName}"]`);
        }
    }

    if (allSubcategories.length <= 1 || categoryShadowButton === null || categoryShadowButton === undefined) {
        console.log(`Found no subcategories or shadow root for ${categoryName}.`);

        if (!hasDynamic.includes(categoryName)) {
            categoryButton.addEventListener("click", () => {
                addSidebarSubcategory(categoryButton);
            });
            hasDynamic.push(categoryName);
        }
        return;
    }

    // Remove existing subcategories container
    let existingSubcategoriesContainer = categoryButton.shadowRoot.querySelector(".natsumi-subcategory-container");
    if (existingSubcategoriesContainer) {
        existingSubcategoriesContainer.remove();
    }

    // Create subcategories container
    let subcategoriesContainer = document.createElement("div");
    subcategoriesContainer.classList.add("natsumi-subcategory-container");
    categoryButton.shadowRoot.appendChild(subcategoriesContainer);

    let firstSubcategory = false;
    let shouldReset = false;

    for (let subcategory of allSubcategories) {
        let subcategoryHeader;
        let subcategoryId = getSubcategoryId(subcategory);
        const subcategoryElementName = subcategory.nodeName;

        switch (subcategoryElementName) {
            case "groupbox":
                subcategoryHeader = subcategory.querySelector("h2").textContent;
                break;
            case "moz-fieldset":
                subcategoryHeader = subcategory.getAttribute("label");
                break;
            default:
                subcategoryHeader = subcategory.querySelector("h1").textContent;
        }

        // Create and add button
        let subcategoryButton = document.createElement("div");
        subcategoryButton.classList.add("natsumi-subcategory");
        subcategoryButton.setAttribute("subcategory", subcategoryId);
        subcategoryButton.textContent = subcategoryHeader;
        subcategoriesContainer.appendChild(subcategoryButton);

        // Add event listener
        subcategoryButton.addEventListener("click", () => {
            subcategory.scrollIntoView({behavior: "smooth"});

            // Set highlight
            const currentHighlight = subcategoriesContainer.querySelector(`.natsumi-subcategory[highlight="true"]`);
            currentHighlight.removeAttribute("highlight");
            subcategoryButton.setAttribute("highlight", "true");
        });

        if (!firstSubcategory) {
            firstSubcategory = true;
            subcategoryButton.setAttribute("highlight", "true");
        }

        if (!subcategoryHeader && subcategory.checkVisibility()) {
            // This doesn't seem right
            shouldReset = true;
        }

        if (!subcategoryHeader || !subcategory.checkVisibility()) {
            subcategoryButton.setAttribute("hidden", "true");
        }
    }

    // Add event handler for scrolling
    mainPrefPane.addEventListener("wheel", () => {
        let highestPos;
        let highestPosSubcategory;

        for (let subcategory of allSubcategories) {
            if (!subcategory.checkVisibility()) {
                continue;
            }

            let topPos = subcategory.getBoundingClientRect().top

            if (highestPos === undefined) {
                highestPos = topPos;
                highestPosSubcategory = subcategory;
            }

            if (topPos > highestPos && topPos <= 130) {
                highestPos = topPos;
                highestPosSubcategory = subcategory;
            }
        }

        const currentHighlight = subcategoriesContainer.querySelector(`.natsumi-subcategory[highlight="true"]`);

        if (highestPosSubcategory) {
            const toHighlight = subcategoriesContainer.querySelector(`.natsumi-subcategory[subcategory="${getSubcategoryId(highestPosSubcategory)}"]`)

            if (currentHighlight) {
                if (currentHighlight.getAttribute("subcategory") === toHighlight.getAttribute("subcategory")) {
                    return;
                }

                currentHighlight.removeAttribute("highlight");
            }

            toHighlight.setAttribute("highlight", "true");
        } else {
            if (currentHighlight) {
                currentHighlight.removeAttribute("highlight");
            }
        }
    })

    // Add mutation listener for button
    let categoryShadowObserver = new MutationObserver(() => {
        if (categoryShadowButton.hasAttribute("selected")) {
            subcategoriesContainer.removeAttribute("hidden");

            // Set highlight
            const firstSubcategory = subcategoriesContainer.querySelector(".natsumi-subcategory");
            firstSubcategory.setAttribute("highlight", "true");
        } else {
            subcategoriesContainer.setAttribute("hidden", "true");

            // Remove highlights
            const subcategories = subcategoriesContainer.querySelectorAll(".natsumi-subcategory");
            for (let existingSubcategory of subcategories) {
                existingSubcategory.removeAttribute("highlight");
            }
        }
    });
    categoryShadowObserver.observe(categoryShadowButton, {attributes: true, attributeFilter: ["selected"]});

    if (gLastCategory.category !== categoryName) {
        subcategoriesContainer.setAttribute("hidden", "true");
    }

    if (!shouldReset) {
        hasSubcategories.push(categoryName);
    }
}

function addSidebarSubcategories() {
    let sidebarCategories = document.getElementById("categories");
    let allCategories = sidebarCategories.querySelectorAll("moz-page-nav-button");

    for (let category of allCategories) {
        if (category.getAttribute("view") === "paneMoreFromMozilla") {
            continue;
        }

        addSidebarSubcategory(category);
    }

    // Add future categories
    let sidebarObserver = new MutationObserver(() => {
        let allCategories = sidebarCategories.querySelectorAll("moz-page-nav-button");

        for (let category of allCategories) {
            if (category.getAttribute("view") === "paneMoreFromMozilla") {
                continue;
            }

            addSidebarSubcategory(category);
        }
    });
    sidebarObserver.observe(sidebarCategories, {childList: true});
}

// Add subcategories
if (hasRedesign) {
    try {
        addSidebarSubcategories();
    } catch (e) {
        console.error(e);
    }
}