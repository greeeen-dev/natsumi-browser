// ==UserScript==
// @include   about:preferences*
// @include   about:settings*
// @ignorecache
// ==/UserScript==

/*

Natsumi Browser - A userchrome for Firefox and more that makes things flow.

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

function convertToXUL(node) {
    // noinspection JSUnresolvedReference
    return window.MozXULElement.parseXULToFragment(node);
}

function testAlert() {
    console.log("nya :3");
}

function setStringPreference(preference, value) {
    // noinspection JSUnresolvedReference
    ucApi.Prefs.set(preference, value);
}

class CheckboxChoice {
    constructor(preference, id, label, description = "", opposite = false) {
        this.preference = preference;
        this.id = id;
        this.label = label;
        this.description = description;
        this.opposite = opposite;
    }

    getSelected() {
        let value = false;

        // noinspection JSUnresolvedReference
        if (ucApi.Prefs.get(this.preference).exists()) {
            // noinspection JSUnresolvedReference
            value = ucApi.Prefs.get(this.preference).value;
        }

        if (this.opposite) {
            return !value;
        }

        return value;
    }

    generateNode() {
        const selected = this.getSelected();
        let descriptionNodeString = "";

        if (this.description.length > 0) {
            descriptionNodeString = `
                <description class="indent tip-caption">
                    ${this.description}
                </description>
            `;
        }

        let nodeString = `
            <checkbox id="${this.id}" preference="${this.preference}" opposite="${this.opposite}" checked="${selected}" label="${this.label}">
                <image class="checkbox-check" checked="${selected}"/>
                <label class="checkbox-label-box" flex="1">
                    <image class="checkbox-icon"/>
                    <label class="checkbox-label" flex="1">
                        ${this.label}
                    </label>
                </label>
            </checkbox>
            ${descriptionNodeString}
        `;
        return convertToXUL(nodeString);
    }
}

class MCChoice {
    constructor(value, label, description, imageXUL, color = "") {
        this.value = value;
        this.label = label;
        this.description = description;
        this.imageXUL = imageXUL;
        this.color = color;
    }

    generateNode(selected = false, color = false) {
        let colorString = "";

        if (color) {
            colorString = `--natsumi-primary-color: ${this.color};`;
        }

        let nodeString = `
            <div class="natsumi-mc-choice" style="${colorString}" title="${this.description}" value="${this.value}">
                <div class="natsumi-mc-choice-image-container" style="${colorString}">
                    ${this.imageXUL}
                </div>
                <div class="natsumi-mc-choice-label">
                    ${this.label}
                </div>
            </div>
        `;
        let node = convertToXUL(nodeString);
        let choiceButton = node.querySelector(".natsumi-mc-choice");

        if (selected) {
            choiceButton.classList.add("selected");
        }

        return node;
    }
}

const layouts = {
    "default": new MCChoice(
        false,
        "Multiple Toolbars",
        "Keeps both the navbar and sidebar separate.",
        "<div id='multiple-toolbars' class='natsumi-mc-choice-image-browser'></div>"
    ),
    "single": new MCChoice(
        true,
        "Single Toolbar (Zen-like)",
        "Merges everything into the sidebar for simplicity.",
        "<div id='single-toolbar' class='natsumi-mc-choice-image-browser'></div>"
    )
}

const themes = {
    "default": new MCChoice(
        "default",
        "Default",
        "No changes, just the default look.",
        "<div id='default' class='natsumi-mc-choice-image-browser'></div>"
    ),
    "gradient": new MCChoice(
        "gradient",
        "Gradient",
        "A light gradient of your accent color.",
        "<div id='gradient' class='natsumi-mc-choice-image-browser'></div>"
    ),
    "gradient-complementary": new MCChoice(
        "gradient-complementary",
        "Complementary Gradient",
        "A gradient of the accent color and its opposite color.",
        "<div id='gradient-complementary' class='natsumi-mc-choice-image-browser'><div class='natsumi-mc-choice-image-browser-additional'></div></div>"
    ),
    "colorful": new MCChoice(
        "colorful",
        "Colorful Solid",
        "A solid color with a tint of the accent color.",
        "<div id='colorful' class='natsumi-mc-choice-image-browser'></div>"
    ),
    "playful": new MCChoice(
        "playful",
        "Playful Solid",
        "A higher contrast version of Colorful Solid.",
        "<div id='playful' class='natsumi-mc-choice-image-browser'></div>"
    ),
    "lucid": new MCChoice(
        "lucid",
        "Lucid",
        "A recreation of the Zen Dream and Zen Galaxy themes.",
        "<div id='lucid' class='natsumi-mc-choice-image-browser'></div>"
    ),
    "oled": new MCChoice(
        "oled",
        "OLED",
        "A completely black and white theme for the minimalists.",
        "<div id='oled' class='natsumi-mc-choice-image-browser'></div>"
    ),
    "lgbtq": new MCChoice(
        "lgbtq",
        "LGBTQ+",
        "Browsing with pride!",
        "<div id='lgbtq' class='natsumi-mc-choice-image-browser'></div>"
    ),
    "transgender": new MCChoice(
        "transgender",
        "Transgender",
        "Trans rights are human rights!",
        "<div id='transgender' class='natsumi-mc-choice-image-browser'></div>"
    )
}

const materials = {
    "haze": new MCChoice(
        "default",
        "Haze",
        "",
        "<div id='mat-hz' class='natsumi-mc-choice-image-browser'></div>"
    ),
    "tinted-haze": new MCChoice(
        "tinted-haze",
        "Tinted Haze",
        "",
        "<div id='mat-hz-tinted' class='natsumi-mc-choice-image-browser'></div>"
    )
}

const colors = {
    "default": new MCChoice(
        "default",
        "Light Green",
        "",
        "",
        "#a0d490"
    ),
    "sky-blue": new MCChoice(
        "sky-blue",
        "Sky Blue",
        "",
        "",
        "#aac7ff"
    ),
    "turquoise": new MCChoice(
        "turquoise",
        "Turquoise",
        "",
        "",
        "#74d7cb"
    ),
    "yellow": new MCChoice(
        "yellow",
        "Yellow",
        "",
        "",
        "#dec663"
    ),
    "peach-orange": new MCChoice(
        "peach-orange",
        "Peach Orange",
        "",
        "",
        "#ffb787"
    ),
    "warmer-pink": new MCChoice(
        "warmer-pink",
        "Warmer Pink",
        "",
        "",
        "#ff9eb3"
    ),
    "beige": new MCChoice(
        "beige",
        "Beige",
        "",
        "",
        "#dec1b1"
    ),
    "light-red": new MCChoice(
        "light-red",
        "Light Red",
        "",
        "",
        "#ffb1c0"
    ),
    "muted-pink": new MCChoice(
        "muted-pink",
        "Muted Pink",
        "",
        "",
        "#ddbcf3"
    ),
    "pink": new MCChoice(
        "pink",
        "Pink",
        "",
        "",
        "#f6b0ea"
    ),
    "lavender-purple": new MCChoice(
        "lavender-purple",
        "Lavender Purple",
        "",
        "",
        "#d4bbff"
    ),
    "system": new MCChoice(
        "system",
        "System Accent",
        "Use the system accent color.",
        "",
        "AccentColor"
    )
}

const urlbarLayouts = {
    "floating": new MCChoice (
        false,
        "Floating",
        "Lets the URL bar float above the browser window.",
        "<div id='urlbar-floating' class='natsumi-mc-choice-image-browser'></div>"
    ),
    "classic": new MCChoice (
        true,
        "Classic",
        "Keeps the URL bar on the navbar.",
        "<div id='urlbar-classic' class='natsumi-mc-choice-image-browser'></div>"
    )
}

class OptionsGroup {
    constructor(id, label, description) {
        this.id = id;
        this.label = label;
        this.description = description;
        this.options = {};
    }

    registerOption(option, choiceObject) {
        this.options[option] = choiceObject;
    }

    generateNode(subgroup = false) {
        let nodeString = `
            <groupbox id="${this.id}Group" data-category="paneNatsumiSettings" hidden="true">
                <html:h2>${this.label}</html:h2>
                <description class="description-deemphasized">
                    ${this.description}
                </description>
            </groupbox>
        `
        let node = convertToXUL(nodeString);
        let groupNode = node.querySelector(`#${this.id}Group`);

        if (subgroup) {
            nodeString = `
                <vbox class="indent"></vbox>
            `
            node = convertToXUL(nodeString);
            groupNode = node.querySelector(".indent");
        }

        for (let option in this.options) {
            let choice = this.options[option];

            let choiceNode = null;

            if (choice instanceof OptionsGroup) {
                choiceNode = choice.generateNode(true);
            } else {
                choiceNode = choice.generateNode();
            }
            groupNode.appendChild(choiceNode);
        }

        return node;
    }
}

class MultipleChoicePreference {
    constructor(id, preference, label, description) {
        this.id = id;
        this.preference = preference;
        this.label = label;
        this.description = description;
        this.options = {};
        this.extras = {}
    }

    registerOption(option, choiceObject) {
        this.options[option] = choiceObject;
    }

    registerExtras(id, checkBoxObject) {
        this.extras[id] = checkBoxObject;
    }

    getSelected() {
        // noinspection JSUnresolvedReference
        if (ucApi.Prefs.get(this.preference).exists()) {
            // noinspection JSUnresolvedReference
            return ucApi.Prefs.get(this.preference).value;
        } else {
            // Natsumi's default string value is always "default", so we return that here
            return "default";
        }
    }

    generateNode(color = false) {
        let nodeString = `
            <groupbox id="${this.id}Group" data-category="paneNatsumiSettings" hidden="true">
                <html:h2>${this.label}</html:h2>
                <html:div id="${this.id}Settings">
                    <description class="description-deemphasized">
                        ${this.description}
                    </description>
                    <div class="natsumi-mc-chooser">
                    </div>
                </html:div>
            </groupbox>
        `
        let node = convertToXUL(nodeString);
        let groupNode = node.querySelector(`#${this.id}Group`);

        for (let extra in this.extras) {
            let extraNode = convertToXUL(`<vbox id="${extra}"></vbox>`)
            let extraBox = extraNode.querySelector(`#${extra}`);
            extraBox.appendChild(this.extras[extra].generateNode());
            groupNode.appendChild(extraNode);
        }

        let form = node.querySelector(".natsumi-mc-chooser");
        for (let option in this.options) {
            let choice = this.options[option];
            const selected = (this.getSelected() === choice.value);
            let choiceNode = choice.generateNode(selected, color);
            form.appendChild(choiceNode);
        }
        return node;
    }
}

function addToSidebar() {
    let nodeString = `
    <richlistitem id="natsumi-settings" class="category" value="paneNatsumiSettings" data-l10n-id="category-natsumi-settings" data-l10n-attrs="tooltiptext" align="center" tooltiptext="Customize Natsumi">
        <image class="category-icon"/>
        <label class="category-name" flex="1">
            Customize Natsumi
        </label>
    </richlistitem>
    `
    let sidebar = document.getElementById("categories");
    const generalPane = sidebar.querySelector("#category-general");
    sidebar.insertBefore(convertToXUL(nodeString), generalPane.nextSibling);

    // noinspection JSUnresolvedReference
    gCategoryInits.set("paneNatsumiSettings", {
        _initted: true,
        init: () => {}
    });
}

function addLayoutPane() {
    let prefsView = document.getElementById("mainPrefPane");
    let homePane = prefsView.querySelector("#firefoxHomeCategory");

    // Create theme selection
    let layoutSelection = new MultipleChoicePreference(
        "natsumiLayout",
        "natsumi.theme.single-toolbar",
        "Layout",
        "Choose the layout you want for your browser."
    );

    let menuButtonCheckbox = new CheckboxChoice(
        "natsumi.theme.single-toolbar-show-menu-button",
        "natsumiShowMenuButton",
        "Replace Extensions button with Menu button on Single Toolbar"
    )

    layoutSelection.registerExtras("natsumiTranslucencyBox", menuButtonCheckbox);

    for (let layout in layouts) {
        layoutSelection.registerOption(layout, layouts[layout]);
    }

    let layoutNode = layoutSelection.generateNode();

    // Set listeners for each button
    let layoutButtons = layoutNode.querySelectorAll(".natsumi-mc-choice");
    layoutButtons.forEach(button => {
        console.log("Adding listener to button:", button);
        button.addEventListener("click", () => {
            let selectedValue = button.getAttribute("value") === "true";
            console.log("Changing layout:", selectedValue);
            setStringPreference("natsumi.theme.single-toolbar", selectedValue);
            layoutButtons.forEach(btn => btn.classList.remove("selected"));
            button.classList.add("selected");
        });
    });

    // Set listeners for each checkbox
    let checkboxes = layoutNode.querySelectorAll("checkbox");
    checkboxes.forEach(checkbox => {
        console.log("Adding listener to checkbox:", checkbox);
        checkbox.addEventListener("command", () => {
            let prefName = checkbox.getAttribute("preference");
            let isChecked = checkbox.checked;

            if (checkbox.getAttribute("opposite") === "true") {
                isChecked = !isChecked;
            }

            console.log(`Checkbox ${prefName} changed to ${isChecked}`);

            // noinspection JSUnresolvedReference
            ucApi.Prefs.set(prefName, isChecked);
        });
    });

    prefsView.insertBefore(layoutNode, homePane);
}

function addThemesPane() {
    let prefsView = document.getElementById("mainPrefPane");
    let homePane = prefsView.querySelector("#firefoxHomeCategory");

    // Create theme selection
    let themeSelection = new MultipleChoicePreference(
        "natsumiThemes",
        "natsumi.theme.type",
        "Background Theme",
        "Choose the type of background you want for your browser."
    );

    let translucencyCheckbox = new CheckboxChoice(
        "natsumi.theme.disable-translucency",
        "natsumiTranslucencyToggle",
        "Enable translucency effect",
        "This may not work as intended if your Desktop Environment does not support translucency.",
        true
    )

    let grayOutCheckbox = new CheckboxChoice(
        "natsumi.theme.gray-out-when-inactive",
        "natsumiGrayOutWhenInactive",
        "Gray out background when the browser window is inactive"
    )

    themeSelection.registerExtras("natsumiTranslucencyBox", translucencyCheckbox);
    themeSelection.registerExtras("natsumiInactiveBox", grayOutCheckbox);

    for (let theme in themes) {
        themeSelection.registerOption(theme, themes[theme]);
    }

    let themeNode = themeSelection.generateNode();

    // Set listeners for each button
    let themeButtons = themeNode.querySelectorAll(".natsumi-mc-choice");
    themeButtons.forEach(button => {
        console.log("Adding listener to button:", button);
        button.addEventListener("click", () => {
            let selectedValue = button.getAttribute("value");
            console.log("Changing theme:", selectedValue);
            setStringPreference("natsumi.theme.type", selectedValue);
            themeButtons.forEach(btn => btn.classList.remove("selected"));
            button.classList.add("selected");
        });
    });

    // Set listeners for each checkbox
    let checkboxes = themeNode.querySelectorAll("checkbox");
    checkboxes.forEach(checkbox => {
        console.log("Adding listener to checkbox:", checkbox);
        checkbox.addEventListener("command", () => {
            let prefName = checkbox.getAttribute("preference");
            let isChecked = checkbox.checked;

            if (checkbox.getAttribute("opposite") === "true") {
                isChecked = !isChecked;
            }

            console.log(`Checkbox ${prefName} changed to ${isChecked}`);

            // noinspection JSUnresolvedReference
            ucApi.Prefs.set(prefName, isChecked);
        });
    });

    prefsView.insertBefore(themeNode, homePane);
}

function addColorsPane() {
    let prefsView = document.getElementById("mainPrefPane");
    let homePane = prefsView.querySelector("#firefoxHomeCategory");

    // Create color selection
    let colorSelection = new MultipleChoicePreference(
        "natsumiColors",
        "natsumi.theme.accent-color",
        "Accent Color",
        "Choose the accent color you want to use. This will be applied to various aspects of the browser Natsumi modifies."
    );

    let checkBoxExtraColor = new CheckboxChoice(
        "natsumi.theme.force-natsumi-color",
        "natsumiUseThemeAccentColor",
        "Use your Firefox theme's accent color where possible",
        true
    )

    colorSelection.registerExtras("natsumiThemeColorBox", checkBoxExtraColor);

    for (let color in colors) {
        colorSelection.registerOption(color, colors[color]);
    }

    let colorNode = colorSelection.generateNode(true);

    // Set listeners for each button
    let colorButtons = colorNode.querySelectorAll(".natsumi-mc-choice");
    colorButtons.forEach(button => {
        console.log("Adding listener to button:", button);
        button.addEventListener("click", () => {
            let selectedValue = button.getAttribute("value");
            console.log("Changing color:", selectedValue);
            setStringPreference("natsumi.theme.accent-color", selectedValue);
            colorButtons.forEach(btn => btn.classList.remove("selected"));
            button.classList.add("selected");
        });
    });

    let checkboxesColor = colorNode.querySelectorAll("checkbox");
    checkboxesColor.forEach(checkbox => {
        console.log("Adding listener to checkbox:", checkbox);
        checkbox.addEventListener("command", () => {
            let prefName = checkbox.getAttribute("preference");
            let isChecked = checkbox.checked;

            if (checkbox.getAttribute("opposite") === "true") {
                isChecked = !isChecked;
            }

            console.log(`Checkbox ${prefName} changed to ${isChecked}`);

            // noinspection JSUnresolvedReference
            ucApi.Prefs.set(prefName, isChecked);
        });
    });

    prefsView.insertBefore(colorNode, homePane);
}

function addSidebarWorkspacesPane() {
    if (ucApi.Prefs.get("natsumi.browser.type").exists()) {
        if (!(ucApi.Prefs.get("natsumi.browser.type").value === "floorp")) {
            return;
        }
    }

    let prefsView = document.getElementById("mainPrefPane");
    let homePane = prefsView.querySelector("#firefoxHomeCategory");

    // Create choices group
    let workspacesGroup = new OptionsGroup(
        "natsumiSidebarWorkspaces",
        "Workspaces",
        "Tweak how your Floorp Workspaces affect the Sidebar."
    );

    workspacesGroup.registerOption("natsumiSidebarHideWorkspaceIndicator", new CheckboxChoice(
        "natsumi.sidebar.hide-workspace-indicator",
        "natsumiSidebarHideWorkspaceIndicator",
        "Show current Workspace indicator",
        "",
        true
    ));

    workspacesGroup.registerOption("natsumiSidebarWorkspacesAsIcons", new CheckboxChoice(
        "natsumi.sidebar.workspaces-as-icons",
        "natsumiSidebarWorkspacesAsIcons",
        "Display Workspaces as an icon strip",
        "This does not make each icon clickable to switch Workspaces (for now)."
    ));

    let sidebarWorkspacesNode = workspacesGroup.generateNode();

    // Set listeners for each checkbox
    let checkboxes = sidebarWorkspacesNode.querySelectorAll("checkbox");
    checkboxes.forEach(checkbox => {
        console.log("Adding listener to checkbox:", checkbox);
        checkbox.addEventListener("command", () => {
            let prefName = checkbox.getAttribute("preference");
            let isChecked = checkbox.checked;

            if (checkbox.getAttribute("opposite") === "true") {
                isChecked = !isChecked;
            }

            console.log(`Checkbox ${prefName} changed to ${isChecked}`);

            // noinspection JSUnresolvedReference
            ucApi.Prefs.set(prefName, isChecked);
        });
    });

    prefsView.insertBefore(sidebarWorkspacesNode, homePane);
}

function addSidebarButtonsPane() {
    let prefsView = document.getElementById("mainPrefPane");
    let homePane = prefsView.querySelector("#firefoxHomeCategory");

    // Create choices group
    let buttonsGroup = new OptionsGroup(
        "natsumiSidebarButtons",
        "Buttons",
        "Tweak the buttons visible in the sidebar."
    );

    if (ucApi.Prefs.get("natsumi.browser.type").exists()) {
        if (
            ucApi.Prefs.get("natsumi.browser.type").value === "floorp" ||
            ucApi.Prefs.get("natsumi.browser.type").value === "waterfox"
        ) {
            buttonsGroup.registerOption("natsumiSidebarEnableToolbar", new CheckboxChoice(
                "natsumi.sidebar.use-statusbar-in-sidebar",
                "natsumiSidebarEnableToolbar",
                "Use Status Bar in the Sidebar when the Status Bar is &#34;hidden&#34;",
                "This will allow you to add toolbar buttons (e.g. Bookmarks menu, New tab) to the Sidebar just like Zen."
            ));
        }
    }

    buttonsGroup.registerOption("natsumiSidebarHideControls", new CheckboxChoice(
        "natsumi.sidebar.hide-sidebar-controls",
        "natsumiSidebarHideControls",
        "Hide Sidebar controls"
    ));

    buttonsGroup.registerOption("natsumiSidebarHideNewTab", new CheckboxChoice(
        "natsumi.tabs.hide-new-tab-button",
        "natsumiSidebarHideNewTab",
        "Show New Tab button",
        "",
        true
    ));

    let hideNewTabSubgroup = new OptionsGroup(
        "natsumiSidebarNewTabOptions",
        "",
        ""
    );

    hideNewTabSubgroup.registerOption("natsumiSidebarNewTabPosition", new CheckboxChoice(
        "natsumi.tabs.new-tab-on-top",
        "natsumiSidebarNewTabPosition",
        "Move the New Tab button to the top",
    ));

    buttonsGroup.registerOption("natsumiSidebarNewTabOptions", hideNewTabSubgroup);

    let sidebarButtonsNode = buttonsGroup.generateNode();

    let newTabPositionCheckbox = sidebarButtonsNode.querySelector("#natsumiSidebarNewTabPosition");

    if (ucApi.Prefs.get("natsumi.tabs.hide-new-tab-button").exists()) {
        newTabPositionCheckbox.setAttribute("disabled", `${ucApi.Prefs.get("natsumi.tabs.hide-new-tab-button").value}`);
    }

    // Set listeners for each checkbox
    let checkboxes = sidebarButtonsNode.querySelectorAll("checkbox");
    checkboxes.forEach(checkbox => {
        console.log("Adding listener to checkbox:", checkbox);
        checkbox.addEventListener("command", () => {
            let prefName = checkbox.getAttribute("preference");
            let isChecked = checkbox.checked;

            if (checkbox.getAttribute("opposite") === "true") {
                isChecked = !isChecked;
            }

            if (checkbox.id === "natsumiSidebarHideNewTab") {
                newTabPositionCheckbox.setAttribute("disabled", `${isChecked}`);
            }

            console.log(`Checkbox ${prefName} changed to ${isChecked}`);

            // noinspection JSUnresolvedReference
            ucApi.Prefs.set(prefName, isChecked);
        });
    });

    prefsView.insertBefore(sidebarButtonsNode, homePane);
}

function addPipMaterialPane() {
    let prefsView = document.getElementById("mainPrefPane");
    let homePane = prefsView.querySelector("#firefoxHomeCategory");

    // Create theme selection
    let materialSelection = new MultipleChoicePreference(
        "natsumiPipMaterial",
        "natsumi.pip.material",
        "Material",
        "Choose the material to use for the controls and scrubber."
    );

    for (let material in materials) {
        if (material === "glass") {
            continue; // PiP doesn't use Haze
        }

        materialSelection.registerOption(material, materials[material]);
    }

    let materialNode = materialSelection.generateNode();

    // Set listeners for each button
    let materialButtons = materialNode.querySelectorAll(".natsumi-mc-choice");
    materialButtons.forEach(button => {
        console.log("Adding listener to button:", button);
        button.addEventListener("click", () => {
            let selectedValue = button.getAttribute("value");
            console.log("Changing theme:", selectedValue);
            setStringPreference("natsumi.pip.material", selectedValue);
            materialButtons.forEach(btn => btn.classList.remove("selected"));
            button.classList.add("selected");
        });
    });

    prefsView.insertBefore(materialNode, homePane);
}

function addPipBehaviorPane() {
    let prefsView = document.getElementById("mainPrefPane");
    let homePane = prefsView.querySelector("#firefoxHomeCategory");

    // Create choices group
    let pipBehaviorGroup = new OptionsGroup(
        "natsumiPipBehavior",
        "Behavior",
        "Tweak how you want Natsumi's Picture-in-Picture window to behave."
    );

    pipBehaviorGroup.registerOption("natsumiPipScrollToMove", new CheckboxChoice(
        "natsumi.pip.disable-scroll-to-move",
        "natsumiPipScrollToMove",
        "Scroll-to-move",
        "Scroll-to-move allows you to move the Picture-in-Picture window by scrolling on it.",
        true
    ));

    let pipBehaviorNode = pipBehaviorGroup.generateNode();

    // Set listeners for each checkbox
    let checkboxes = pipBehaviorNode.querySelectorAll("checkbox");
    checkboxes.forEach(checkbox => {
        console.log("Adding listener to checkbox:", checkbox);
        checkbox.addEventListener("command", () => {
            let prefName = checkbox.getAttribute("preference");
            let isChecked = checkbox.checked;

            if (checkbox.getAttribute("opposite") === "true") {
                isChecked = !isChecked;
            }

            console.log(`Checkbox ${prefName} changed to ${isChecked}`);

            // noinspection JSUnresolvedReference
            ucApi.Prefs.set(prefName, isChecked);
        });
    });

    prefsView.insertBefore(pipBehaviorNode, homePane);
}

function addPDFMaterialPane() {
    let prefsView = document.getElementById("mainPrefPane");
    let homePane = prefsView.querySelector("#firefoxHomeCategory");

    // Create theme selection
    let materialSelection = new MultipleChoicePreference(
        "natsumiPDFMaterial",
        "natsumi.pdfjs.material",
        "Material",
        "Choose the material to use for the sidebar and toolbar."
    );

    for (let material in materials) {
        materialSelection.registerOption(material, materials[material]);
    }

    let materialNode = materialSelection.generateNode();

    // Set listeners for each button
    let materialButtons = materialNode.querySelectorAll(".natsumi-mc-choice");
    materialButtons.forEach(button => {
        console.log("Adding listener to button:", button);
        button.addEventListener("click", () => {
            let selectedValue = button.getAttribute("value");
            console.log("Changing theme:", selectedValue);
            setStringPreference("natsumi.pdfjs.material", selectedValue);
            materialButtons.forEach(btn => btn.classList.remove("selected"));
            button.classList.add("selected");
        });
    });

    prefsView.insertBefore(materialNode, homePane);
}

function addPDFCompactPane() {
    let prefsView = document.getElementById("mainPrefPane");
    let homePane = prefsView.querySelector("#firefoxHomeCategory");

    // Create choices group
    let compactGroup = new OptionsGroup(
        "natsumiPDFCompact",
        "Compact Mode",
        "Compact Mode lets you focus on the document at hand by hiding the sidebar and toolbar when you don't need it."
    );

    compactGroup.registerOption("natsumiPDFEnableCompact", new CheckboxChoice(
        "natsumi.pdfjs.compact",
        "natsumiPDFEnableCompact",
        "Enable Compact Mode"
    ));

    let compactSubgroup = new OptionsGroup(
        "natsumiPDFCompactOptions",
        "",
        ""
    );

    compactSubgroup.registerOption("natsumiPDFDynamicCompact", new CheckboxChoice(
        "natsumi.pdfjs.compact-dynamic",
        "natsumiPDFDynamicCompact",
        "Dynamic Compact Mode",
        "Compact Mode will automatically disable if the sidebar is open."
    ));

    compactGroup.registerOption("natsumiPDFCompactOptions", compactSubgroup);

    let compactNode = compactGroup.generateNode();

    let dynamicCheckbox = compactNode.querySelector("#natsumiPDFDynamicCompact");

    if (ucApi.Prefs.get("natsumi.pdfjs.compact").exists()) {
        dynamicCheckbox.setAttribute("disabled", `${!ucApi.Prefs.get("natsumi.pdfjs.compact").value}`);
    }

    // Set listeners for each checkbox
    let checkboxes = compactNode.querySelectorAll("checkbox");
    checkboxes.forEach(checkbox => {
        console.log("Adding listener to checkbox:", checkbox);
        checkbox.addEventListener("command", () => {
            let prefName = checkbox.getAttribute("preference");
            let isChecked = checkbox.checked;

            if (checkbox.getAttribute("opposite") === "true") {
                isChecked = !isChecked;
            }

            if (checkbox.id === "natsumiPDFEnableCompact") {
                dynamicCheckbox.setAttribute("disabled", `${!isChecked}`);
            }

            console.log(`Checkbox ${prefName} changed to ${isChecked}`);

            // noinspection JSUnresolvedReference
            ucApi.Prefs.set(prefName, isChecked);
        });
    });

    prefsView.insertBefore(compactNode, homePane);
}

function addURLbarLayoutPane() {
    let prefsView = document.getElementById("mainPrefPane");
    let homePane = prefsView.querySelector("#firefoxHomeCategory");

    // Create theme selection
    let layoutSelection = new MultipleChoicePreference(
        "natsumiURLbarLayout",
        "natsumi.urlbar.do-not-float",
        "Layout",
        "Choose the layout to use for Natsumi's URL bar when opened."
    );

    for (let urlbarLayout in urlbarLayouts) {
        layoutSelection.registerOption(urlbarLayout, urlbarLayouts[urlbarLayout]);
    }

    let layoutNode = layoutSelection.generateNode();

    // Set listeners for each button
    let layoutButtons = layoutNode.querySelectorAll(".natsumi-mc-choice");
    layoutButtons.forEach(button => {
        console.log("Adding listener to button:", button);
        button.addEventListener("click", () => {
            let selectedValue = button.getAttribute("value") === "true";
            console.log("Changing theme:", selectedValue);
            setStringPreference("natsumi.urlbar.do-not-float", selectedValue);
            layoutButtons.forEach(btn => btn.classList.remove("selected"));
            button.classList.add("selected");
        });
    });

    prefsView.insertBefore(layoutNode, homePane);
}

function addURLbarBehaviorPane() {
    let prefsView = document.getElementById("mainPrefPane");
    let homePane = prefsView.querySelector("#firefoxHomeCategory");

    // Create choices group
    let behaviorGroup = new OptionsGroup(
        "natsumiURLBarBehavior",
        "Behavior",
        "Tweak how you want Natsumi's URL bar to behave."
    );

    behaviorGroup.registerOption("natsumiURLbarAlwaysExpanded", new CheckboxChoice(
        "natsumi.urlbar.always-expanded",
        "natsumiURLbarAlwaysExpanded",
        "Shrink URL bar width when not focused",
        "",
        true
    ));

    behaviorGroup.registerOption("natsumiURLbarSingleToolbarActions", new CheckboxChoice(
        "natsumi.urlbar.single-toolbar-display-actions",
        "natsumiURLbarSingleToolbarActions",
        "Show actions buttons on hover when Single Toolbar is active",
        "",
        false
    ));

    let behaviorNode = behaviorGroup.generateNode();

    // Set listeners for each checkbox
    let checkboxes = behaviorNode.querySelectorAll("checkbox");
    checkboxes.forEach(checkbox => {
        console.log("Adding listener to checkbox:", checkbox);
        checkbox.addEventListener("command", () => {
            let prefName = checkbox.getAttribute("preference");
            let isChecked = checkbox.checked;

            if (checkbox.getAttribute("opposite") === "true") {
                isChecked = !isChecked;
            }

            console.log(`Checkbox ${prefName} changed to ${isChecked}`);

            // noinspection JSUnresolvedReference
            ucApi.Prefs.set(prefName, isChecked);
        });
    });

    prefsView.insertBefore(behaviorNode, homePane);
}

function addPreferencesPanes() {
    // Category nodes
    let appearanceNode = convertToXUL(`
        <hbox id="natsumiAppearanceCategory" class="subcategory" data-category="paneNatsumiSettings" hidden="true">
            <html:h1>Browser Appearance</html:h1>
        </hbox>
    `);
    let sidebarNode = convertToXUL(`
        <hbox id="natsumiSidebarCategory" class="subcategory" data-category="paneNatsumiSettings" hidden="true">
            <html:h1>Sidebar &amp; Tabs</html:h1>
        </hbox>
    `);
    let pipNode = convertToXUL(`
        <hbox id="natsumiPipCategory" class="subcategory" data-category="paneNatsumiSettings" hidden="true">
            <html:h1>Picture-in-Picture</html:h1>
        </hbox>
    `);
    let pdfjsNode = convertToXUL(`
        <hbox id="natsumiPDFCategory" class="subcategory" data-category="paneNatsumiSettings" hidden="true">
            <html:h1>PDF Viewer</html:h1>
        </hbox>
    `);
    let urlbarNode = convertToXUL(`
        <hbox id="natsumiUrlbarCategory" class="subcategory" data-category="paneNatsumiSettings" hidden="true">
            <html:h1>URL Bar</html:h1>
        </hbox>
    `);

    let prefsView = document.getElementById("mainPrefPane");
    let homePane = prefsView.querySelector("#firefoxHomeCategory");
    prefsView.insertBefore(appearanceNode, homePane);
    addLayoutPane();
    addThemesPane();
    addColorsPane();

    prefsView.insertBefore(sidebarNode, homePane);
    addSidebarWorkspacesPane();
    addSidebarButtonsPane();

    let pipDisabled = false;
    if (ucApi.Prefs.get("natsumi.pip.disabled").exists()) {
        pipDisabled = ucApi.Prefs.get("natsumi.pip.disabled").value;
    }
    if (!pipDisabled) {
        prefsView.insertBefore(pipNode, homePane);
        addPipMaterialPane();
        addPipBehaviorPane();
    }

    let pdfjsDisabled = false;
    if (ucApi.Prefs.get("natsumi.pdfjs.disabled").exists()) {
        pdfjsDisabled = ucApi.Prefs.get("natsumi.pdfjs.disabled").value;
    }
    if (!pdfjsDisabled) {
        prefsView.insertBefore(pdfjsNode, homePane);
        addPDFMaterialPane();
        addPDFCompactPane();
    }

    let urlbarDisabled = false;
    if (ucApi.Prefs.get("natsumi.urlbar.disabled").exists()) {
        urlbarDisabled = ucApi.Prefs.get("natsumi.urlbar.disabled").value;
    }
    if (!urlbarDisabled) {
        prefsView.insertBefore(urlbarNode, homePane);
        addURLbarLayoutPane();
        addURLbarBehaviorPane();
    }
}

console.log("Loading prefs panes...");
addToSidebar();
addPreferencesPanes();
