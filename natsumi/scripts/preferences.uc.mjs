// ==UserScript==
// @include   about:preferences*
// @include   about:settings*
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
import { NatsumiNotification } from "./notifications.sys.mjs";
import {FileUpload} from "./files.sys.mjs";
import {
    customThemeLoader,
    applyCustomTheme,
    CustomThemePicker
} from "./custom-theme.sys.mjs";
import { resetTabStyleIfNeeded } from "./reset-tab-style.sys.mjs";

// Get redesign status
let categoryNode = document.getElementById("categories");
const hasRedesign = categoryNode.nodeName === "html:moz-page-nav";
const hasRedesignV2 = document.getElementById("category-general").getAttribute("hidden") && hasRedesign;

if (hasRedesign) {
    document.body.setAttribute("natsumi-preferences-redesign", "");
}
if (hasRedesignV2) {
    document.body.setAttribute("natsumi-preferences-redesign-v2", "");
}

// Get correct header
let categoryHeader = "h1";

if (hasRedesignV2) {
    categoryHeader = "h2"
}

// Pride easter egg!
let lgbtqThemeClicked = 0;

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
    constructor(preference, id, label, description = "", opposite = false, beta = false,
                dependsOn = null, dependsOpposite = false) {
        this.preference = preference;
        this.id = id;
        this.label = label;
        this.description = description;
        this.opposite = opposite;
        this.beta = beta;
        this.dependsOn = dependsOn;
        this.dependsOpposite = dependsOpposite;

        // States
        this.node = null;
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

    toggleSelection() {
        let initialValue = this.getSelected();

        if (this.opposite) {
            initialValue = !initialValue;
        }

        ucApi.Prefs.set(this.preference, !initialValue);
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

        let checkedAttribute = ""
        if (selected) {
            checkedAttribute = ` checked=""`
        }

        let nodeString = `
            <checkbox id="${this.id}" preference="${this.preference}" opposite="${this.opposite}"${checkedAttribute} label="${this.label}" beta="${this.beta}">
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
        let nodeFragment = convertToXUL(nodeString);
        let checkbox = nodeFragment.querySelector("checkbox");

        if (this.dependsOn) {
            const dependsOnToggle = () => {
                let isAvailable = ucApi.Prefs.get(this.dependsOn).value;
                if (this.dependsOpposite) {
                    isAvailable = !isAvailable;
                }

                if (isAvailable) {
                    checkbox.removeAttribute("disabled");
                } else {
                    checkbox.setAttribute("disabled", "true");
                }
            }

            if (ucApi.Prefs.get(this.dependsOn).exists) {
                dependsOnToggle();
            }

            Services.prefs.addObserver(this.dependsOn, () => {
                dependsOnToggle();
            });
        }

        checkbox.addEventListener("command", () => {
            this.toggleSelection();
            checkbox.checked = this.getSelected();
        })

        return nodeFragment;
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

        if (this.description !== null) {
            let descriptionNode = document.createElement("div");
            descriptionNode.classList.add("natsumi-mc-choice-description");
            descriptionNode.textContent = this.description;
            choiceButton.appendChild(descriptionNode);
        }

        return node;
    }
}

class RadioChoice extends MCChoice {
    constructor(value, label, description) {
        super(value, label, description, "", "");
    }

    generateNode(selected = false, color = false) {
        let nodeString = `
            <radio class="natsumi-radio-choice" title="${this.description}" value="${this.value}">
                <image class="radio-check"></image>
                <hbox class="radio-label-box" align="center" flex="1">
                    <image class="radio-icon"></image>
                    <label class="radio-label" flex="1">${this.label}</label>
                </hbox>
            </radio>
        `;
        let node = convertToXUL(nodeString);
        let choiceButton = node.querySelector(".natsumi-radio-choice");

        if (selected) {
            choiceButton.setAttribute("selected", "true");
            let checkNode = choiceButton.querySelector(".radio-check");
            checkNode.setAttribute("selected", "true");
        }

        return node;
    }
}

class SelectChoice extends MCChoice {
    constructor(value, label) {
        super(value, label, "", "", "");
    }

    generateNode(selected = false) {
        let nodeString = `
            <html:option class="natsumi-select-choice" value="${this.value}">
                ${this.label}
            </html:option>
        `;
        let node = convertToXUL(nodeString);
        let choiceButton = node.querySelector(".natsumi-select-choice");

        if (selected) {
            choiceButton.setAttribute("selected", "selected");
        }

        return node;
    }
}

class SliderChoice {
    constructor(valueMin, valueMax, value, label, description, affect) {
        this.valueMin = valueMin;
        this.valueMax = valueMax;
        this.label = label;
        this.description = description;
        this.affect = affect;
        this.value = value;
    }

    generateNode() {
        const prefObj = ucApi.Prefs.get(this.affect);
        if (prefObj && prefObj.exists()) {
            this.value = prefObj.value;
        }

        let nodeString = `
        <label class="natsumi-mc-choice-label">
        ${this.label}
        </label>
        <html:input class="natsumi-slider-choice" type="range"
        title="${this.description}"
        min="${this.valueMin}" max="${this.valueMax}"
        value="${this.value}" />
        `;

        let node = convertToXUL(nodeString);
        let choiceButton = node.querySelector(".natsumi-slider-choice");

        choiceButton.addEventListener('input', () => {
            ucApi.Prefs.set(this.affect, parseInt(choiceButton.value));
        });

        return node;
    }
}

const layouts = {
    "default": new MCChoice(
        false,
        "Multiple Toolbars",
        "Iconic utilitarian design",
        "<div id='multiple-toolbars' class='natsumi-mc-choice-image-browser'></div>"
    ),
    "single": new MCChoice(
        true,
        "Single Toolbar",
        "More space for web content",
        "<div id='single-toolbar' class='natsumi-mc-choice-image-browser'></div>"
    )
}

const themes = {
    "default": new MCChoice(
        "default",
        "Default",
        "Just the default look",
        "<div id='default' class='natsumi-mc-choice-image-browser'></div>"
    ),
    "gradient": new MCChoice(
        "gradient",
        "Gradient",
        "Light and simple",
        "<div id='gradient' class='natsumi-mc-choice-image-browser'></div>"
    ),
    "gradient-complementary": new MCChoice(
        "gradient-complementary",
        "Complementary",
        "Combo of two opposites",
        "<div id='gradient-complementary' class='natsumi-mc-choice-image-browser'></div>"
    ),
    "colorful": new MCChoice(
        "colorful",
        "Colorful",
        "Straightforward yet colorful",
        "<div id='colorful' class='natsumi-mc-choice-image-browser'></div>"
    ),
    "playful": new MCChoice(
        "playful",
        "Playful",
        "Vibrant, popping colors",
        "<div id='playful' class='natsumi-mc-choice-image-browser'></div>"
    ),
    "lucid": new MCChoice(
        "lucid",
        "Lucid",
        "Dreamy and serene",
        "<div id='lucid' class='natsumi-mc-choice-image-browser'></div>"
    ),
    "frutiger-aero": new MCChoice(
        "frutiger-aero",
        "Aero",
        "Bright and nostalgic",
        "<div id='frutiger-aero' class='natsumi-mc-choice-image-browser'></div>"
    ),
    "oled": new MCChoice(
        "oled",
        "OLED",
        "Black and white",
        "<div id='oled' class='natsumi-mc-choice-image-browser'></div>"
    ),
    "lgbtq": new MCChoice(
        "lgbtq",
        "LGBTQ+",
        "Browsing with pride 🏳️‍🌈",
        "<div id='lgbtq' class='natsumi-mc-choice-image-browser'></div>"
    ),
    "transgender": new MCChoice(
        "transgender",
        "Transgender",
        "Trans rights 🏳️‍⚧️",
        "<div id='transgender' class='natsumi-mc-choice-image-browser'></div>"
    ),
    "custom": new MCChoice(
        "custom",
        "Custom",
        "Build your own",
        "<div id='custom' class='natsumi-mc-choice-image-browser'></div>"
    )
}

const windowMaterialsMac = {
    "sidebar": new RadioChoice(
        false,
        "Sidebar",
        ""
    ),
    "titlebar": new RadioChoice(
        true,
        "Titlebar",
        ""
    )
}

const windowMaterialsWindows = {
    "auto": new RadioChoice(
        0,
        "Automatic",
        ""
    ),
    "mica": new RadioChoice(
        1,
        "Mica",
        ""
    ),
    "acrylic": new RadioChoice(
        2,
        "Acrylic",
        ""
    ),
    "micaalt": new RadioChoice(
        3,
        "Mica Alt",
        ""
    )
}

const materials = {
    "haze": new MCChoice(
        "default",
        "Haze",
        null,
        "<div id='mat-hz' class='natsumi-mc-choice-image-browser'></div>"
    ),
    "tinted-haze": new MCChoice(
        "tinted-haze",
        "Tinted Haze",
        null,
        "<div id='mat-hz-tinted' class='natsumi-mc-choice-image-browser'></div>"
    )
}

const colors = {
    "default": new MCChoice(
        "default",
        "Light Green",
        null,
        "",
        "#a0d490"
    ),
    "sky-blue": new MCChoice(
        "sky-blue",
        "Sky Blue",
        null,
        "",
        "#aac7ff"
    ),
    "turquoise": new MCChoice(
        "turquoise",
        "Turquoise",
        null,
        "",
        "#74d7cb"
    ),
    "yellow": new MCChoice(
        "yellow",
        "Yellow",
        null,
        "",
        "#dec663"
    ),
    "peach-orange": new MCChoice(
        "peach-orange",
        "Peach Orange",
        null,
        "",
        "#ffb787"
    ),
    "warmer-pink": new MCChoice(
        "warmer-pink",
        "Warmer Pink",
        null,
        "",
        "#ff9eb3"
    ),
    "beige": new MCChoice(
        "beige",
        "Beige",
        null,
        "",
        "#dec1b1"
    ),
    "light-red": new MCChoice(
        "light-red",
        "Light Red",
        null,
        "",
        "#ffb1c0"
    ),
    "muted-pink": new MCChoice(
        "muted-pink",
        "Muted Pink",
        null,
        "",
        "#ddbcf3"
    ),
    "pink": new MCChoice(
        "pink",
        "Pink",
        null,
        "",
        "#f6b0ea"
    ),
    "lavender-purple": new MCChoice(
        "lavender-purple",
        "Lavender Purple",
        null,
        "",
        "#d4bbff"
    ),
    "system": new MCChoice(
        "system",
        "System Accent",
        null,
        "",
        "oklch(from AccentColor 0.825 0.1 h)"
    ),
    /*"custom": new MCChoice(
        "custom",
        "Custom",
        "Pick a color of your choice!",
        ""
    )*/
}

const icons = {
    "default": new MCChoice(
        "default",
        "Acorn",
        "Standard Firefox icons",
        `
            <div id='icons-default' class='natsumi-mc-choice-image-browser'>
                <div class="natsumi-mc-choice-icon icon-sidebar"></div>
                <div class="natsumi-mc-choice-icon icon-bookmarks"></div>
                <div class="natsumi-mc-choice-icon icon-back"></div>
                <div class="natsumi-mc-choice-icon icon-reload"></div>
            </div>
        `
    ),
    "lucide": new MCChoice(
        "lucide",
        "Lucide",
        "Based on Lucide",
        `
            <div id='icons-lucide' class='natsumi-mc-choice-image-browser'>
                <div class="natsumi-mc-choice-icon icon-sidebar"></div>
                <div class="natsumi-mc-choice-icon icon-bookmarks"></div>
                <div class="natsumi-mc-choice-icon icon-back"></div>
                <div class="natsumi-mc-choice-icon icon-reload"></div>
            </div>
        `
    ),
    "fluent": new MCChoice(
        "fluent",
        "Fluent",
        "Based on Microsoft Fluent UI",
        `
            <div id='icons-fluent' class='natsumi-mc-choice-image-browser'>
                <div class="natsumi-mc-choice-icon icon-sidebar"></div>
                <div class="natsumi-mc-choice-icon icon-bookmarks"></div>
                <div class="natsumi-mc-choice-icon icon-back"></div>
                <div class="natsumi-mc-choice-icon icon-reload"></div>
            </div>
        `
    )
}

const compactStyles = {
    "default": new MCChoice(
        "default",
        "Hide both",
        null,
        "<div id='compact-both' class='natsumi-mc-choice-image-browser'></div>"
    ),
    "toolbar": new MCChoice(
        "toolbar",
        "Hide toolbar",
        null,
        "<div id='compact-toolbar' class='natsumi-mc-choice-image-browser'></div>"
    ),
    "sidebar": new MCChoice(
        "sidebar",
        "Hide sidebar",
        null,
        "<div id='compact-sidebar' class='natsumi-mc-choice-image-browser'></div>"
    )
}

const glimpseKeys = {
    "alt": new RadioChoice(
        "alt",
        "Alt (Option)",
        ""
    ),
    "ctrl": new RadioChoice(
        "ctrl",
        "Control",
        ""
    ),
    "meta": new RadioChoice(
        "meta",
        "Meta (Super/Command)",
        ""
    ),
    "shift": new RadioChoice(
        "shift",
        "Shift",
        ""
    ),
    "hold": new RadioChoice(
        "hold",
        "Hold click",
        ""
    )
}

const tabDesigns = {
    "default": new MCChoice(
        "default",
        "Blade",
        "Modern, sleek and dynamic",
        `
            <div id='tab-blade' class='natsumi-mc-choice-image-browser'>
                <div class='natsumi-mc-tab'>
                    <div class='natsumi-mc-tab-icon'></div>
                    <div class='natsumi-mc-tab-text'></div>
                </div>
            </div>
        `
    ),
    "origin": new MCChoice(
        "origin",
        "Origin",
        "Box-like design",
        `
            <div id='tab-origin' class='natsumi-mc-choice-image-browser'>
                <div class='natsumi-mc-tab'>
                    <div class='natsumi-mc-tab-icon'></div>
                    <div class='natsumi-mc-tab-text'></div>
                </div>
            </div>
        `
    ),
    "curve": new MCChoice(
        "curve",
        "Curve",
        "Curve-like design",
        `
            <div id='tab-curve' class='natsumi-mc-choice-image-browser'>
                <div class='natsumi-mc-tab'>
                    <div class='natsumi-mc-tab-icon'></div>
                    <div class='natsumi-mc-tab-text'></div>
                </div>
            </div>
        `
    ),
    "fusion": new MCChoice(
        "fusion",
        "Fusion",
        "'Combines' tab and web content",
        `
            <div id='tab-fusion' class='natsumi-mc-choice-image-browser'>
                <div class='natsumi-mc-tab'>
                    <div class='natsumi-mc-tab-icon'></div>
                    <div class='natsumi-mc-tab-text'></div>
                </div>
            </div>
        `
    ),
    "material": new MCChoice(
        "material",
        "Material",
        "Solid colors",
        `
            <div id='tab-material' class='natsumi-mc-choice-image-browser'>
                <div class='natsumi-mc-tab'>
                    <div class='natsumi-mc-tab-icon'></div>
                    <div class='natsumi-mc-tab-text'></div>
                </div>
            </div>
        `
    ),
    "hexagonal": new MCChoice(
        "hexagonal",
        "Hexagonal",
        "Inspired by Floorp's logo",
        `
            <div id='tab-hexagonal' class='natsumi-mc-choice-image-browser'>
                <div class='natsumi-mc-tab'>
                    <div class='natsumi-mc-tab-icon'></div>
                    <div class='natsumi-mc-tab-text'></div>
                </div>
            </div>
        `
    ),
    "bubble": new MCChoice(
        "bubble",
        "Bubble",
        "Glassmorphism for tabs",
        `
            <div id='tab-bubble' class='natsumi-mc-choice-image-browser'>
                <div class='natsumi-mc-tab'>
                    <div class='natsumi-mc-tab-icon'></div>
                    <div class='natsumi-mc-tab-text'></div>
                </div>
            </div>
        `
    ),
    "clicky": new MCChoice(
        "clicky",
        "Clicky",
        "Playful and interactive",
        `
            <div id='tab-clicky' class='natsumi-mc-choice-image-browser'>
                <div class='natsumi-mc-tab'>
                    <div class='natsumi-mc-tab-icon'></div>
                    <div class='natsumi-mc-tab-text'></div>
            </div>
        </div>
        `,
    ),
    "neutron": new MCChoice(
        "neutron",
        "Neutron",
        "Proton design for Nova",
        `
            <div id='tab-neutron' class='natsumi-mc-choice-image-browser'>
                <div class='natsumi-mc-tab'>
                    <div class='natsumi-mc-tab-icon'></div>
                    <div class='natsumi-mc-tab-text'></div>
                </div>
            </div>
        `
    ),
    "classic": new MCChoice(
        "classic",
        "Classic",
        "Standard Firefox tabs",
        `
            <div id='tab-classic' class='natsumi-mc-choice-image-browser'>
                <div class='natsumi-mc-tab'>
                    <div class='natsumi-mc-tab-icon'></div>
                    <div class='natsumi-mc-tab-text'></div>
                </div>
            </div>
        `
    )
}

const urlbarLayouts = {
    "floating": new MCChoice(
        false,
        "Floating",
        "Floats on web content",
        "<div id='urlbar-floating' class='natsumi-mc-choice-image-browser'></div>"
    ),
    "classic": new MCChoice(
        true,
        "Classic",
        "Anchored to navigation bar",
        "<div id='urlbar-classic' class='natsumi-mc-choice-image-browser'></div>"
    )
}

const miniplayerLayouts = {
    "stacked": new MCChoice(
        false,
        "Stacked",
        "List-like layout",
        "<div id='miniplayer-stacked' class='natsumi-mc-choice-image-browser'></div>"
    ),
    "side-by-side": new MCChoice(
        true,
        "Side-by-side",
        "Scrollable compact layout",
        "<div id='miniplayer-side-by-side' class='natsumi-mc-choice-image-browser'></div>"
    )
}

const startupAnimations = {
    "default": new MCChoice(
        "default",
        "Disabled",
        null,
        "<div id='startup-none' class='natsumi-mc-choice-image-browser'></div>"
    ),
    "simple": new MCChoice(
        "simple",
        "Simple",
        null,
        "<div id='startup-simple' class='natsumi-mc-choice-image-browser'></div>"
    ),
    "nostalgic": new MCChoice(
        "nostalgic",
        "Nostalgic",
        null,
        "<div id='startup-nostalgic' class='natsumi-mc-choice-image-browser'></div>"
    )
}

const startupSounds = {
    "default": new RadioChoice(
        "default",
        "None",
        ""
    ),
    "borealis": new RadioChoice(
        "borealis",
        "Borealis",
        ""
    ),
    "custom": new RadioChoice(
        "custom",
        "Custom",
        ""
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
    constructor(id, preference, label, description, overrideDefault = null, additional = null, additionalOpposite = false) {
        this.id = id;
        this.preference = preference;
        this.label = label;
        this.description = description;
        this.options = {};
        this.extras = {}
        this.overrideDefault = overrideDefault;
        this.additional = additional;
        this.additionalOpposite = additionalOpposite;
    }

    registerOption(option, choiceObject) {
        this.options[option] = choiceObject;
    }

    registerExtras(id, checkBoxObject) {
        this.extras[id] = checkBoxObject;
    }

    getSelected() {
        // noinspection JSUnresolvedReference
        if (this.overrideDefault !== null) {
            return this.overrideDefault;
        }

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
            if (this.extras[extra] instanceof OptionsGroup) {
                groupNode.appendChild(this.extras[extra].generateNode(true));
                continue;
            }

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

            // Register event handlers
            let choiceButton = choiceNode.querySelector(".natsumi-mc-choice");
            choiceButton.addEventListener("click", () => {
                if (this.additional) {
                    if (choice.value === "default") {
                        ucApi.Prefs.set(this.additional, this.additionalOpposite);
                    } else {
                        ucApi.Prefs.set(this.additional, !this.additionalOpposite);
                    }
                }

                let otherChoices = form.querySelectorAll(".natsumi-mc-choice");

                for (let otherChoice of otherChoices) {
                    otherChoice.classList.remove("selected");
                }

                choiceButton.classList.add("selected");

                ucApi.Prefs.set(this.preference, choice.value);
            })

            form.appendChild(choiceNode);
        }
        return node;
    }
}

class RadioPreference extends MultipleChoicePreference {
    constructor(id, preference, label, description, overrideDefault = null) {
        super(id, preference, label, description, overrideDefault);
    }

    generateNode(color = false) {
        let nodeString = `
            <groupbox id="${this.id}Group" data-category="paneNatsumiSettings" hidden="true">
                <html:h2>${this.label}</html:h2>
                <html:div id="${this.id}Settings">
                    <description class="description-deemphasized">
                        ${this.description}
                    </description>
                    <radiogroup class="natsumi-radio-chooser">
                    </radiogroup>
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

        let form = node.querySelector(".natsumi-radio-chooser");
        for (let option in this.options) {
            let choice = this.options[option];
            const selected = (this.getSelected() === choice.value);
            let choiceNode = choice.generateNode(selected, color);
            form.appendChild(choiceNode);
        }
        return node;
    }
}

class SelectPreference extends MultipleChoicePreference {
    constructor(id, preference, label, description, overrideDefault = null) {
        super(id, preference, label, description, overrideDefault);
    }

    generateNode(color = false) {
        let nodeString = `
            <groupbox id="${this.id}Group" data-category="paneNatsumiSettings" hidden="true">
                <html:h2>${this.label}</html:h2>
                <html:div id="${this.id}Settings">
                    <description class="description-deemphasized">
                        ${this.description}
                    </description>
                    <html:select class="natsumi-select-chooser">
                    </html:select>
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

        let form = node.querySelector(".natsumi-select-chooser");
        for (let option in this.options) {
            let choice = this.options[option];
            const selected = (this.getSelected() === choice.value);
            let choiceNode = choice.generateNode(selected, color);
            form.appendChild(choiceNode);
        }
        return node;
    }
}

function addToSidebarLegacy() {
    // FF150 and below
    let customizeNodeString = `
        <richlistitem id="natsumi-settings" class="category" value="paneNatsumiSettings" data-l10n-id="category-natsumi-settings" data-l10n-attrs="tooltiptext" align="center" tooltiptext="Customize Natsumi">
            <image class="category-icon"/>
            <label class="category-name" flex="1">
                Customize Natsumi
            </label>
        </richlistitem>
    `
    let shortcutsNodeString = `
        <richlistitem id="natsumi-shortcuts" class="category" value="paneNatsumiShortcuts" data-l10n-id="category-natsumi-shortcuts" data-l10n-attrs="tooltiptext" align="center" tooltiptext="Keyboard Shortcuts">
            <image class="category-icon"/>
            <label class="category-name" flex="1">
                Keyboard Shortcuts
            </label>
        </richlistitem>
    `
    let aboutNodeString = `
        <richlistitem id="natsumi-about" class="category" value="paneNatsumiAbout" data-l10n-id="category-natsumi-shortcuts" data-l10n-attrs="tooltiptext" align="center" tooltiptext="About Natsumi">
            <image class="category-icon"/>
            <label class="category-name" flex="1">
                About Natsumi
            </label>
        </richlistitem>
    `
    let sidebar = document.getElementById("categories");
    let generalPane = sidebar.querySelector("#category-general");

    if (hasRedesign) {
        generalPane = sidebar.querySelector("#category-home");
    }

    // Add entries to sidebar all in one go to ensure consistent ordering
    sidebar.insertBefore(convertToXUL(customizeNodeString), generalPane.nextSibling);
    sidebar.insertBefore(convertToXUL(shortcutsNodeString), generalPane.nextSibling.nextSibling);
    sidebar.appendChild(convertToXUL(aboutNodeString));

    // noinspection JSUnresolvedReference
    gCategoryInits.set("paneNatsumiSettings", {
        _initted: true,
        init: () => {}
    });
}

function addToSidebar() {
    if (!hasRedesign) {
        // Use legacy method
        return addToSidebarLegacy();
    }

    // We'll clone the home settings button here instead of making our own
    let homeNode = document.getElementById("category-home");

    // Create Customize Natsumi button
    let customizeNode = homeNode.cloneNode(true);
    customizeNode.id = "natsumi-settings";
    customizeNode.setAttribute("view", "paneNatsumiSettings");
    customizeNode.setAttribute("iconsrc", "chrome://natsumi/content/icons/lucide/paintbrush.svg");
    customizeNode.setAttribute("original-icon", "chrome://natsumi/content/icons/lucide/paintbrush.svg");
    customizeNode.setAttribute("data-l10n-id", "category-natsumi-settings");
    customizeNode.innerHTML = "Customize Natsumi";

    // Create Keyboard Shortcuts button
    let shortcutsNode = homeNode.cloneNode(true);
    shortcutsNode.id = "natsumi-shortcuts";
    shortcutsNode.setAttribute("view", "paneNatsumiShortcuts");
    shortcutsNode.setAttribute("iconsrc", "chrome://natsumi/content/icons/lucide/meta.svg");
    shortcutsNode.setAttribute("original-icon", "chrome://natsumi/content/icons/lucide/meta.svg");
    shortcutsNode.setAttribute("data-l10n-id", "category-natsumi-shortcuts");
    shortcutsNode.innerHTML = "Keyboard Shortcuts";

    // Create About Natsumi button
    let aboutNode = homeNode.cloneNode(true);
    aboutNode.id = "natsumi-about";
    aboutNode.setAttribute("view", "paneNatsumiAbout");
    aboutNode.setAttribute("iconsrc", "chrome://natsumi/content/icons/lucide/info.svg");
    aboutNode.setAttribute("original-icon", "chrome://natsumi/content/icons/lucide/info.svg");
    aboutNode.setAttribute("data-l10n-id", "category-natsumi-about");
    aboutNode.innerHTML = "About Natsumi";

    // Set icon if needed
    let iconPack = "";

    if (ucApi.Prefs.get("natsumi.theme.icons").exists()) {
        iconPack = ucApi.Prefs.get("natsumi.theme.icons").value;
    }

    if (iconPack === "fluent") {
        customizeNode.setAttribute("iconsrc", "chrome://natsumi/content/icons/fluent/paintbrush.svg");
        shortcutsNode.setAttribute("iconsrc", "chrome://natsumi/content/icons/fluent/meta.svg");
        aboutNode.setAttribute("iconsrc", "chrome://natsumi/content/icons/fluent/info.svg");
    }

    let sidebar = document.getElementById("categories");
    let generalPane = sidebar.querySelector("#category-general");

    if (hasRedesign) {
        generalPane = sidebar.querySelector("#category-home");
    }

    // Add entries to sidebar all in one go to ensure consistent ordering
    sidebar.insertBefore(customizeNode, generalPane.nextSibling);
    sidebar.insertBefore(shortcutsNode, generalPane.nextSibling.nextSibling);
    sidebar.appendChild(aboutNode);

    // noinspection JSUnresolvedReference
    gCategoryInits.set("paneNatsumiSettings", {
        _initted: true,
        init: () => {}
    });
}

function addOptionStyles() {
    let styleNode = document.createElement("style");
    styleNode.id = "natsumi-options-style";
    styleNode.textContent = `
        moz-checkbox::part(label) {
            --natsumi-checkbox-appearance: none;
            --natsumi-checkbox-border: 1px solid light-dark(rgba(0, 0, 0, 0.3), rgba(255, 255, 255, 0.3));;
            --natsumi-checkbox-border-radius: 4px;
            --natsumi-checkbox-transition: border 0.3s ease, background-color 0.3s ease;
        }

        moz-checkbox[checked]::part(label) {
            --natsumi-checkbox-border: none !important;
            --natsumi-checkbox-background-color: light-dark(var(--natsumi-colors-primary), var(--natsumi-primary-color));
            --natsumi-checkbox-background-image: url("chrome://natsumi/content/icons/lucide/check.svg");
        }

        moz-checkbox[disabled]::part(label) {
            --natsumi-checkbox-filter: grayscale(1);
            --natsumi-checkbox-opacity: 0.4;
        }

        moz-radio::part(label) {
            --natsumi-radio-appearance: none;
            --natsumi-radio-width: var(--input-height);
            --natsumi-radio-height: var(--input-height);
            --natsumi-radio-border: 1px solid light-dark(rgba(0, 0, 0, 0.3), rgba(255, 255, 255, 0.3));
            --natsumi-radio-border-radius: 50%;
            --natsumi-radio-background-color: light-dark(rgba(0, 0, 0, 0.1), rgba(255, 255, 255, 0.1));
            --natsumi-radio-transition: border 0.3s ease, outline 0.3s ease, background-color 0.3s ease;
            --natsumi-radio-before-content: "";
            --natsumi-radio-before-display: flex;
            --natsumi-radio-before-width: 10px;
            --natsumi-radio-before-height: 10px;
            --natsumi-radio-before-margin: calc(calc(var(--input-height) - 12px) / 2);
            --natsumi-radio-before-background: light-dark(var(--natsumi-colors-primary), var(--natsumi-primary-color));
            --natsumi-radio-before-opacity: 0;
            --natsumi-radio-before-transition: opacity 0.3s ease;
        }

        moz-radio[checked]::part(label) {
            --natsumi-radio-border: 1px solid light-dark(var(--natsumi-colors-primary), var(--natsumi-primary-color)) !important;
            --natsumi-radio-background-color: transparent;
            --natsumi-radio-before-opacity: 1;
        }

        moz-radio[disabled]::part(label) {
            --natsumi-radio-filter: grayscale(1);
            --natsumi-radio-opacity: 0.4;
        }
    `
    document.head.appendChild(styleNode);
}

function addLayoutPane() {
    let prefsView = document.getElementById("mainPrefPane");
    let homePane = prefsView.querySelector("#firefoxHomeCategory");
    const osName = Services.appinfo.OS.toLowerCase();

    let windowControlsDescription = "";
    if (osName === "darwin") {
        windowControlsDescription = "On macOS, this will move the window controls to the sidebar only when the sidebar is on the right."
    }

    // Create theme selection
    let layoutSelection = new MultipleChoicePreference(
        "natsumiLayout",
        "natsumi.theme.single-toolbar",
        "Layout",
        "Choose the layout you want for your browser."
    );

    let novaIslandsCheckbox = new CheckboxChoice(
        "natsumi.theme.islands",
        "natsumiIslandsButton",
        "Enable Islands view",
        "This will change the layout to look closer to the Firefox Nova design."
    );

    let noGapsCheckbox = new CheckboxChoice(
        "natsumi.theme.no-margin",
        "natsumiNoGapsButton",
        "Remove browser separation where possible"
    );

    let menuButtonCheckbox = new CheckboxChoice(
        "natsumi.theme.single-toolbar-show-menu-button",
        "natsumiShowMenuButton",
        "Show Menu button"
    );

    let addonsButtonCheckbox = new CheckboxChoice(
        "natsumi.theme.single-toolbar-hide-extensions-button",
        "natsumiShowAddonsButton",
        "Show Extensions button",
        "",
        true
    );

    let bookmarksOnHoverCheckbox = new CheckboxChoice(
        "natsumi.theme.show-bookmarks-on-hover",
        "natsumiShowBookmarksOnHover",
        "Show Bookmarks on hover",
        "When the Bookmarks bar is expanded, the bar will stay hidden until hovered."
    );

    let windowControlsCheckbox = new CheckboxChoice(
        "natsumi.theme.force-window-controls-to-left",
        "natsumiForceWinControlsToLeft",
        "Display window controls on the sidebar in Single Toolbar",
        windowControlsDescription
    );

    let separationSlider = new SliderChoice(
        "6",
        "30",
        "6",
        "Browser Separation",
        "Change the separation of the web page",
        "natsumi.theme.browser-separation",
    )

    layoutSelection.registerExtras("natsumiIslandsButtonBox", novaIslandsCheckbox);
    layoutSelection.registerExtras("natsumiNoGapsButtonBox", noGapsCheckbox);
    layoutSelection.registerExtras("natsumiShowMenuButtonBox", menuButtonCheckbox);
    layoutSelection.registerExtras("natsumiShowAddonsButtonBox", addonsButtonCheckbox);
    layoutSelection.registerExtras("natsumiShowBookmarksOnHoverBox", bookmarksOnHoverCheckbox);
    layoutSelection.registerExtras("natsumiForceWinControlsToLeftBox", windowControlsCheckbox);
    layoutSelection.registerExtras("natsumiBrowserSeparationSlider", separationSlider);

    for (let layout in layouts) {
        layoutSelection.registerOption(layout, layouts[layout]);
    }

    let layoutNode = layoutSelection.generateNode();

    // Add notice if Vertical Tabs is disabled
    let verticalTabsDisabledNotice = convertToXUL(`
        <div id="natsumiVerticalTabsDisabledWarning" class="natsumi-settings-info warning">
            <div class="natsumi-settings-info-icon"></div>
            <div class="natsumi-settings-info-text">
                You need to enable Vertical Tabs to customize these settings.
            </div>
        </div>
    `);
    let layoutSelector = layoutNode.querySelector(".natsumi-mc-chooser");
    layoutSelector.parentNode.insertBefore(verticalTabsDisabledNotice, layoutSelector);

    prefsView.insertBefore(layoutNode, homePane);
}

function addThemesPane() {
    let prefsView = document.getElementById("mainPrefPane");
    let homePane = prefsView.querySelector("#firefoxHomeCategory");
    const osName = Services.appinfo.OS.toLowerCase();

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

    let softGlowCheckbox = new CheckboxChoice(
        "natsumi.theme.soft-glow",
        "natsumiSoftGlowToggle",
        "Add a soft glow to your web page",
    )

    let grayOutCheckbox = new CheckboxChoice(
        "natsumi.theme.gray-out-when-inactive",
        "natsumiGrayOutWhenInactive",
        "Gray out background when the browser window is inactive"
    )

    let customThemePickerUi = new CustomThemePicker("natsumiCustomThemePicker", customThemeLoader, applyCustomTheme, "natsumi.theme.custom-theme-data");

    themeSelection.registerExtras("natsumiCustomThemePickerBox", customThemePickerUi);
    themeSelection.registerExtras("natsumiTranslucencyBox", translucencyCheckbox);
    themeSelection.registerExtras("softGlowBox", softGlowCheckbox);
    themeSelection.registerExtras("natsumiInactiveBox", grayOutCheckbox);

    for (let theme in themes) {
        themeSelection.registerOption(theme, themes[theme]);
    }

    let themeNode = themeSelection.generateNode();

    let unfortunateTypo = false;
    if (ucApi.Prefs.get("natsumi.theme.vowels-empty").exists()) {
        unfortunateTypo = ucApi.Prefs.get("natsumi.theme.vowels-empty").value;
    }

    if (unfortunateTypo) {
        // i'm sorry. (thankfully i took EXTRA CAUTION to avoid this typo)
        console.warn("Vowel movement...");
        const playfulDesc = themeNode.querySelector(`.natsumi-mc-choice[value="playful"] .natsumi-mc-choice-description`);
        playfulDesc.textContent = playfulDesc.textContent.replace("op", "oo");
    }

    // Set listeners for each button
    let themeButtons = themeNode.querySelectorAll(".natsumi-mc-choice");
    themeButtons.forEach(button => {
        button.addEventListener("click", () => {
            let selectedValue = button.getAttribute("value");

            if (selectedValue === "lgbtq") {
                lgbtqThemeClicked++;
            } else {
                lgbtqThemeClicked = 0;
            }

            if (lgbtqThemeClicked === 5) {
                lgbtqThemeClicked = 0;

                // Enable pride theme
                let prideEnabled = false;
                if (ucApi.Prefs.get("natsumi.theme.pride").exists()) {
                    prideEnabled = ucApi.Prefs.get("natsumi.theme.pride").value;
                }

                ucApi.Prefs.set("natsumi.theme.pride", !prideEnabled);

                if (!prideEnabled) {
                    let tabStyleResetObject = new NatsumiNotification(
                        "Pride mode activated!",
                        "You can click the LGBTQ+ theme 5 times in a row to disable this again.",
                        "chrome://natsumi/content/icons/lucide/heart.svg",
                        10000
                    )
                    tabStyleResetObject.addToContainer();
                } else {
                    let tabStyleResetObject = new NatsumiNotification(
                        "Pride mode deactivated!",
                        "You can click the LGBTQ+ theme 5 times in a row to enable this again.",
                        "chrome://natsumi/content/icons/lucide/luminosity-0.svg",
                        10000
                    )
                    tabStyleResetObject.addToContainer();
                }
            }
        });
    });

    prefsView.insertBefore(themeNode, homePane);
    customThemePickerUi.init().catch((error) => {
        console.error(error);
    });
}

function addWindowMaterialPane() {
    let prefsView = document.getElementById("mainPrefPane");
    let homePane = prefsView.querySelector("#firefoxHomeCategory");

    // Create theme selection
    let windowMaterialSelectionMac = new RadioPreference(
        "natsumiWindowMaterialMac",
        "natsumi.theme.use-legacy-translucency",
        "Window material",
        "Choose which material to use for the window background.",
    );
    let windowMaterialSelectionWindows = new RadioPreference(
        "natsumiWindowMaterialWindows",
        "widget.windows.mica.toplevel-backdrop",
        "Window material",
        "Choose which material to use for the window background.",
    );

    for (let windowMaterial in windowMaterialsMac) {
        windowMaterialSelectionMac.registerOption(windowMaterial, windowMaterialsMac[windowMaterial]);
    }
    for (let windowMaterial in windowMaterialsWindows) {
        windowMaterialSelectionWindows.registerOption(windowMaterial, windowMaterialsWindows[windowMaterial]);
    }

    let windowMaterialsNode;

    // Set listeners for each button
    let windowMaterialButtons = [];
    let targetPref = "natsumi.theme.use-legacy-translucency";

    if (Services.appinfo.OS.toLowerCase() === "darwin") {
        windowMaterialsNode = windowMaterialSelectionMac.generateNode();
        windowMaterialButtons = windowMaterialsNode.querySelectorAll(".natsumi-radio-choice");
    } else if (Services.appinfo.OS.toLowerCase() === "winnt") {
        windowMaterialsNode = windowMaterialSelectionWindows.generateNode();
        windowMaterialButtons = windowMaterialsNode.querySelectorAll(".natsumi-radio-choice");
        targetPref = "widget.windows.mica.toplevel-backdrop";

        // Add DWMBlurGlass/MicaForEveryone warning
        let windowsExternalMaterialNotice = convertToXUL(`
            <div id="natsumiWindowsExternalMaterialWarning" class="natsumi-settings-info warning">
                <div class="natsumi-settings-info-icon"></div>
                <div class="natsumi-settings-info-text">
                    If you use something like DWMBlurGlass or MicaForEveryone to enable translucency, you may need to
                    manage window materials for your browser there.
                </div>
            </div>
        `)
        let firstRadio = windowMaterialsNode.querySelector(".natsumi-radio-choice");
        firstRadio.parentNode.insertBefore(windowsExternalMaterialNotice, firstRadio);
    } else {
        // We're not on Windows or macOS
        return;
    }

    windowMaterialButtons.forEach(button => {
        button.addEventListener("click", () => {
            let selectedValue = button.getAttribute("value");
            console.log("Changing key:", selectedValue === "true");

            if (targetPref === "natsumi.theme.use-legacy-translucency") {
                ucApi.Prefs.set(targetPref, selectedValue === "true");
            } else {
                setStringPreference(targetPref, parseInt(selectedValue));
            }
            windowMaterialButtons.forEach((btn) => {
                btn.removeAttribute("selected")
                let radioCheck = btn.querySelector(".radio-check");
                radioCheck.removeAttribute("selected");
            });
            button.setAttribute("selected", "true");
            let radioCheck = button.querySelector(".radio-check");
            radioCheck.setAttribute("selected", "true");
        });
    });

    prefsView.insertBefore(windowMaterialsNode, homePane);
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
        "",
        true
    )

    //let customColorPickerUi = new CustomThemePicker("natsumiCustomColorPicker", customColorLoader, applyCustomColor, "natsumi.theme.custom-color-data", true, false);

    //colorSelection.registerExtras("natsumiCustomColorPickerBox", customColorPickerUi);
    colorSelection.registerExtras("natsumiThemeColorBox", checkBoxExtraColor);

    for (let color in colors) {
        colorSelection.registerOption(color, colors[color]);
    }

    let colorNode = colorSelection.generateNode(true);

    prefsView.insertBefore(colorNode, homePane);
    //customColorPickerUi.init();
}

function addIconsPane() {
    let prefsView = document.getElementById("mainPrefPane");
    let homePane = prefsView.querySelector("#firefoxHomeCategory");

    // Create icons selection
    let iconSelection = new MultipleChoicePreference(
        "natsumiIcons",
        "natsumi.theme.icons",
        "Icons",
        "Choose the icon pack you want to use."
    );

    for (let iconPack in icons) {
        iconSelection.registerOption(iconPack, icons[iconPack]);
    }

    // Alt back forward icons
    iconSelection.registerExtras("natsumiIconsAltBackForward", new CheckboxChoice(
        "natsumi.theme.icons-alt-back-forward",
        "natsumiIconsAltBackForward",
        "Use alternative Back/Forward icons"
    ));

    // Context menu icons
    iconSelection.registerExtras("natsumiIconsContextMenu", new CheckboxChoice(
        "natsumi.theme.context-menu-icons",
        "natsumiIconsContextMenu",
        "Show icons in context menu",
        "This may not show for some operating systems."
    ));

    let iconNode = iconSelection.generateNode();

    prefsView.insertBefore(iconNode, homePane);
}

function addFontsPane() {
    let prefsView = document.getElementById("mainPrefPane");
    let homePane = prefsView.querySelector("#firefoxHomeCategory");

    let availableFonts = [
        new SelectChoice(
            "default",
            "System font"
        )
    ]

    // Get fonts list
    const enumerator = Cc["@mozilla.org/gfx/fontenumerator;1"].createInstance(
        Ci.nsIFontEnumerator
    );
    const fonts = enumerator.EnumerateFonts(Services.locale.fontLanguageGroup, "");

    for (const font of fonts) {
        availableFonts.push(new SelectChoice(font, font))
    }

    // Create icons selection
    let fontSelection = new SelectPreference(
        "natsumiFonts",
        "natsumi.theme.font",
        "Font",
        "Choose the font you want to use."
    );

    for (let availableFont of availableFonts) {
        fontSelection.registerOption(availableFont.value, availableFont);
    }

    let fontNode = fontSelection.generateNode();

    // Set listeners for select
    let fontSelect = fontNode.querySelector("select");
    fontSelect.addEventListener("change", (event) => {
        setStringPreference("natsumi.theme.font", event.target.value);
    })

    prefsView.insertBefore(fontNode, homePane);
}

function addSDL2Pane() {
    let prefsView = document.getElementById("mainPrefPane");
    let homePane = prefsView.querySelector("#firefoxHomeCategory");

    // Create choices group
    let sdl2Group = new OptionsGroup(
        "natsumiSDL2",
        "Starlight Design 2",
        "Starlight Design 2 is an extension to Starlight Design aimed at enhancing visuals and contrast."
    );

    sdl2Group.registerOption("natsumiEnableSDL2", new CheckboxChoice(
        "natsumi.theme.disable-sdl2",
        "natsumiEnableSDL2",
        "Enable Starlight Design 2 (SDL2)",
        "",
        true
    ));

    let sdl2Node = sdl2Group.generateNode();

    prefsView.insertBefore(sdl2Node, homePane);
}

function addSidebarTabsPane() {
    let prefsView = document.getElementById("mainPrefPane");
    let homePane = prefsView.querySelector("#firefoxHomeCategory");

    // Ensure Blade is always used when custom styles is off
    let selectedOverride = null;
    if (ucApi.Prefs.get("natsumi.tabs.use-custom-type").exists()) {
        if (!(ucApi.Prefs.get("natsumi.tabs.use-custom-type").value)) {
            selectedOverride = "default";
        }
    }

    // Create theme selection
    let tabDesignSelection = new MultipleChoicePreference(
        "natsumiTabDesign",
        "natsumi.tabs.type",
        "Tab design",
        "Choose the design you want for your tabs.",
        selectedOverride,
        "natsumi.tabs.use-custom-type"
    );

    for (let style in tabDesigns) {
        tabDesignSelection.registerOption(style, tabDesigns[style]);
    }

    // Blade options
    tabDesignSelection.registerExtras("natsumiTabBladeLegacyColor", new CheckboxChoice(
        "natsumi.tabs.blade-legacy-color",
        "natsumiTabBladeLegacyColor",
        "Use legacy Blade highlight color"
    ));
    tabDesignSelection.registerExtras("natsumiTabBrokenScaling", new CheckboxChoice(
        "natsumi.theme.buggy-scaling",
        "natsumiTabBrokenScaling",
        "My desktop environment can't scale properly",
        "Applies a 0.5px offset to Blade highlight to account for scaling issues."
    ));

    // Fusion options
    tabDesignSelection.registerExtras("natsumiTabFusionHighlight", new CheckboxChoice(
        "natsumi.tabs.fusion-highlight",
        "natsumiTabFusionHighlight",
        "Enable Fusion tab highlight",
        "This will add a Photon (Firefox Quantum)-like highlight to Fusion."
    ));

    // Material options
    tabDesignSelection.registerExtras("natsumiTabMaterialAlternate", new CheckboxChoice(
        "natsumi.tabs.material-alt-design",
        "natsumiTabMaterialAlternate",
        "Use alternative design for Material tabs",
        "This will make tabs have a similar design to toolbar buttons."
    ));

    // Global tab options
    tabDesignSelection.registerExtras("natsumiTabGrayout", new CheckboxChoice(
        "natsumi.tabs.disable-grayout-unloaded",
        "natsumiTabGrayout",
        "Gray out unloaded tabs",
        "",
        true
    ));

    let tabGrayoutSubgroup = new OptionsGroup(
        "natsumiTabGrayoutOptions",
        "",
        ""
    );

    tabGrayoutSubgroup.registerOption("natsumiTabsCrossout", new CheckboxChoice(
        "natsumi.tabs.disable-crossout-title",
        "natsumiTabsCrossout",
        "Cross out labels for unloaded tabs",
        "",
        true,
        false,
        "natsumi.tabs.disable-grayout-unloaded",
        true
    ));

    tabDesignSelection.registerExtras("natsumiTabGrayoutOptions", tabGrayoutSubgroup);

    // Tab font size offset slider
    let fontOffsetSlider = new SliderChoice(
        "0",
        "12",
        "0",
        "Tab font size offset",
        "",
        "natsumi.theme.font-size-offset",
    )

    tabDesignSelection.registerExtras("natsumiTabFontSizeOffset", fontOffsetSlider);

    let tabDesignNode = tabDesignSelection.generateNode();

    // Set listeners for each button
    let tabDesignButtons = tabDesignNode.querySelectorAll(".natsumi-mc-choice");
    tabDesignButtons.forEach(button => {
        button.addEventListener("click", () => {
            let selectedValue = button.getAttribute("value");

            // Reset Floorp tab styles if needed
            if (selectedValue !== "classic") {
                // Check if we're on Floorp
                if (ucApi.Prefs.get("natsumi.browser.type").exists()) {
                    if (ucApi.Prefs.get("natsumi.browser.type").value !== "floorp") {
                        return;
                    }
                } else {
                    // Assume we're on Firefox
                    return;
                }

                let resetStyle = resetTabStyleIfNeeded();
                if (resetStyle) {
                    let tabStyleResetObject = new NatsumiNotification(
                        "Heads up: your tab style was reset to Proton.",
                        "If you want to use other tab styles, simply enable the Classic tab design in settings.",
                        "chrome://natsumi/content/icons/lucide/info.svg",
                        10000
                    )
                    tabStyleResetObject.addToContainer();
                }
            }
        });
    });

    prefsView.insertBefore(tabDesignNode, homePane);
}

function addSidebarWorkspacesPane() {
    // Note: This is a Floorp-only feature, it shouldn't be seen on other browsers
    if (ucApi.Prefs.get("natsumi.browser.type").exists()) {
        if (!(ucApi.Prefs.get("natsumi.browser.type").value === "floorp")) {
            return;
        }
    } else {
        // Assume we're on Firefox
        return;
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

    let workspacesIndicatorSubgroup = new OptionsGroup(
        "natsumiSidebarWorkspaceIndicatorOptions",
        "",
        ""
    );

    workspacesIndicatorSubgroup.registerOption("natsumiSidebarLegacyWorkspaceIndicator", new CheckboxChoice(
        "natsumi.sidebar.legacy-workspace-indicator",
        "natsumiSidebarLegacyWorkspaceIndicator",
        "Use legacy Workspace indicator style",
        "Use this if the new Workspaces indicator causes issues.",
        false,
        false,
        "natsumi.sidebar.hide-workspace-indicator",
        true
    ));

    workspacesGroup.registerOption("natsumiSidebarWorkspaceIndicatorOptions", workspacesIndicatorSubgroup);

    workspacesGroup.registerOption("natsumiSidebarWorkspacesAsIcons", new CheckboxChoice(
        "natsumi.sidebar.workspaces-as-icons",
        "natsumiSidebarWorkspacesAsIcons",
        "Display Workspaces as an icon strip"
    ));

    let workspacesIconStripSubgroup = new OptionsGroup(
        "natsumiSidebarWorkspaceIconStripOptions",
        "",
        ""
    );

    workspacesIconStripSubgroup.registerOption("natsumiSidebarDisableWorkspaceIconClick", new CheckboxChoice(
        "natsumi.sidebar.disable-clickable-workspace-icons",
        "natsumiSidebarDisableWorkspaceIconClick",
        "Disable clickable Workspace icons",
        "This will restore the old behavior for when a Workspace icon is clicked.",
        false,
        false,
        "natsumi.sidebar.workspaces-as-icons",
        false
    ));

    workspacesGroup.registerOption("natsumiSidebarWorkspaceIconStripOptions", workspacesIconStripSubgroup);

    workspacesGroup.registerOption("natsumiSidebarWorkspaceSpecificPins", new CheckboxChoice(
        "natsumi.tabs.workspace-specific-pins",
        "natsumiSidebarWorkspaceSpecificPins",
        "Enable Workspace-specific pinned tabs"
    ));

    let sidebarWorkspacesNode = workspacesGroup.generateNode();

    prefsView.insertBefore(sidebarWorkspacesNode, homePane);
}

function addSidebarPanelSidebarPane() {
    // Note: This is a Floorp-only feature, it shouldn't be seen on other browsers
    if (ucApi.Prefs.get("natsumi.browser.type").exists()) {
        if (!(ucApi.Prefs.get("natsumi.browser.type").value === "floorp")) {
            return;
        }
    } else {
        // Assume we're on Firefox
        return;
    }

    let prefsView = document.getElementById("mainPrefPane");
    let homePane = prefsView.querySelector("#firefoxHomeCategory");

    // Create choices group
    let panelSidebarGroup = new OptionsGroup(
        "natsumiSidebarPanelSidebar",
        "Panel Sidebar",
        "Tweak Floorp's Panel Sidebar."
    );

    panelSidebarGroup.registerOption("natsumiSidebarFloatingPanelSidebar", new CheckboxChoice(
        "natsumi.sidebar.floorp-floating-panel",
        "natsumiSidebarFloatingPanelSidebar",
        "Floating Panel Sidebar",
        "When enabled, the Panel Sidebar selection box will hide and float over the browser similarly to the main sidebar in Compact Mode.",
    ));

    panelSidebarGroup.registerOption("natsumiSidebarOverlayPanelSidebar", new CheckboxChoice(
        "natsumi.sidebar.floorp-overlay-panel",
        "natsumiSidebarOverlayPanelSidebar",
        "Overlay Panel Sidebar on top of web content",
        "When enabled, the Panel Sidebar box will overlay on top of web content.",
    ));

    panelSidebarGroup.registerOption("natsumiSidebarEscapePanelSidebar", new CheckboxChoice(
        "natsumi.sidebar.floorp-escape-panel",
        "natsumiSidebarEscapePanelSidebar",
        "Use Escape key to close Panel Sidebar"
    ));

    let panelSidebarNode = panelSidebarGroup.generateNode();

    // Add notice if Panel Sidebar is disabled
    let panelSidebarDisabledNotice = convertToXUL(`
        <div id="natsumiPanelSidebarDisabledWarning" class="natsumi-settings-info warning">
            <div class="natsumi-settings-info-icon"></div>
            <div class="natsumi-settings-info-text">
                You need to enable Panel Sidebar in <html:a href="about:hub#/features/sidebar">Floorp Hub</html:a> to
                customize these settings.
            </div>
        </div>
    `)
    let firstCheckbox = panelSidebarNode.querySelector("checkbox");
    firstCheckbox.parentNode.insertBefore(panelSidebarDisabledNotice, firstCheckbox);

    prefsView.insertBefore(panelSidebarNode, homePane);
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

    buttonsGroup.registerOption("natsumiSidebarPinnedToolbarTop", new CheckboxChoice(
        "natsumi.theme.pinned-toolbar-on-top",
        "natsumiSidebarPinnedToolbarTop",
        "Display Pinned Toolbar above pinned tabs"
    ));

    buttonsGroup.registerOption("natsumiSidebarHideClearTabs", new CheckboxChoice(
        "natsumi.sidebar.hide-clear-tabs",
        "natsumiSidebarHideClearTabs",
        "Show clear unpinned tabs button",
        "Clear your unpinned tabs all in one go.",
        true
    ));

    let clearTabsSubgroup = new OptionsGroup(
        "natsumiSidebarClearTabsOptions",
        "",
        ""
    );

    clearTabsSubgroup.registerOption("natsumiSidebarClearKeepSelected", new CheckboxChoice(
        "natsumi.sidebar.clear-keep-selected",
        "natsumiSidebarClearKeepSelected",
        "Keep selected tabs on clear",
        "Any selected tabs will be kept when using the clear unpinned tabs button.",
        false,
        false,
        "natsumi.sidebar.hide-clear-tabs",
        true
    ));

    clearTabsSubgroup.registerOption("natsumiSidebarClearOpenTab", new CheckboxChoice(
        "natsumi.sidebar.clear-open-newtab",
        "natsumiSidebarClearOpenTab",
        "Open new tab on clear",
        "This will open a new tab if all tabs have been cleared.",
        false,
        false,
        "natsumi.sidebar.hide-clear-tabs",
        true
    ));

    if (ucApi.Prefs.get("natsumi.browser.type").exists()) {
        if (ucApi.Prefs.get("natsumi.browser.type").value === "floorp") {
            clearTabsSubgroup.registerOption("natsumiSidebarClearMergeWithWorkspaces", new CheckboxChoice(
                "natsumi.sidebar.clear-merge-with-workspaces",
                "natsumiSidebarClearMergeWithWorkspaces",
                "Merge button with Workspaces indicator",
                "",
                false,
                false,
                "natsumi.sidebar.hide-clear-tabs",
                true
            ));
        }
    }

    buttonsGroup.registerOption("natsumiSidebarClearTabsOptions", clearTabsSubgroup);

    buttonsGroup.registerOption("natsumiSidebarReplaceNewTab", new CheckboxChoice(
        "natsumi.tabs.replace-new-tab",
        "natsumiSidebarReplaceNewTab",
        "Replace New Tab",
        "This will let you open new tabs through the URL bar instead. Warning: This will override browser.urlbar.openintab."
    ));

    if (ucApi.Prefs.get("natsumi.experiments.top-toolbar").exists()) {
        if (ucApi.Prefs.get("natsumi.experiments.top-toolbar").value) {
            buttonsGroup.registerOption("natsumiSidebarTopToolbar", new CheckboxChoice(
                "natsumi.sidebar.top-toolbar",
                "natsumiSidebarTopToolbar",
                "Top toolbar",
                "Creates a new top toolbar in the sidebar.",
                false,
                true
            ));
        }
    }

    buttonsGroup.registerOption("natsumiSidebarShowControls", new CheckboxChoice(
        "natsumi.sidebar.disable-bottom-toolbar",
        "natsumiSidebarShowControls",
        "Show Sidebar controls",
        "This will disable the bottom toolbar."
    ));

    buttonsGroup.registerOption("natsumiSidebarAutohideBottomToolbar", new CheckboxChoice(
        "natsumi.sidebar.autohide-bottom-toolbar",
        "natsumiSidebarAutohideBottomToolbar",
        "Hide Bottom Toolbar when empty"
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
        "",
        false,
        false,
        "natsumi.tabs.hide-new-tab-button",
        true
    ));

    buttonsGroup.registerOption("natsumiSidebarNewTabOptions", hideNewTabSubgroup);

    let sidebarButtonsNode = buttonsGroup.generateNode();

    prefsView.insertBefore(sidebarButtonsNode, homePane);
}

function addTabsBehaviorPane() {
    let prefsView = document.getElementById("mainPrefPane");
    let homePane = prefsView.querySelector("#firefoxHomeCategory");

    // Create choices group
    let tabsBehaviorGroup = new OptionsGroup(
        "natsumiTabsBehavior",
        "Tabs behavior",
        "Tweak how you want tabs to behave."
    );

    tabsBehaviorGroup.registerOption("natsumiTabsSwitcherUnpinnedOnly", new CheckboxChoice(
        "natsumi.tabs.tab-switcher-unpinned-only",
        "natsumiTabsSwitcherUnpinnedOnly",
        "Only use unpinned tabs for tab switching keyboard shortcuts"
    ));

    let tabsBehaviorNode = tabsBehaviorGroup.generateNode();

    prefsView.insertBefore(tabsBehaviorNode, homePane);
}

function addCompactStylesPane() {
    let prefsView = document.getElementById("mainPrefPane");
    let homePane = prefsView.querySelector("#firefoxHomeCategory");

    // Create theme selection
    let styleSelection = new MultipleChoicePreference(
        "natsumiCompactStyle",
        "natsumi.theme.compact-style",
        "Style",
        "Customize how Compact Mode should look."
    );

    for (let style in compactStyles) {
        styleSelection.registerOption(style, compactStyles[style]);
    }

    styleSelection.registerExtras("natsumiCompactBlur", new CheckboxChoice(
        "natsumi.theme.compact-blur",
        "natsumiCompactBlur",
        "Make sidebar and toolbar translucent in Compact Mode",
        "This adds a blur effect to the sidebar and toolbar when in Compact Mode."
    ));

    styleSelection.registerExtras("natsumiCompactAccent", new CheckboxChoice(
        "natsumi.theme.compact-sidebar-accent",
        "natsumiCompactAccent",
        "Use accent color for sidebar and toolbar",
        "This will revert the sidebar and toolbar background to the old accent color instead of the background gradient."
    ));

    styleSelection.registerExtras("natsumiCompactMarginless", new CheckboxChoice(
        "natsumi.theme.compact-marginless",
        "natsumiCompactMarginless",
        "Marginless Compact Mode",
        "Removes the borders around the website content when in Compact Mode."
    ));

    styleSelection.registerExtras("natsumiCompactMiniSidebar", new CheckboxChoice(
        "natsumi.theme.compact-smaller-sidebar",
        "natsumiCompactMiniSidebar",
        "Smaller compact sidebar",
        "Reduces the height of the sidebar when in compact mode."
    ));

    let styleNode = styleSelection.generateNode();

    let compactSingleToolbarNotice = convertToXUL(`
        <div id="natsumiCompactSingleToolbarWarning" class="natsumi-settings-info warning">
            <div class="natsumi-settings-info-icon"></div>
            <div class="natsumi-settings-info-text">
                You need to use Multiple Toolbars layout to change which elements Compact Mode hides.
            </div>
        </div>
    `);
    let styleSelector = styleNode.querySelector(".natsumi-mc-chooser");
    styleSelector.parentNode.insertBefore(compactSingleToolbarNotice, styleSelector);

    prefsView.insertBefore(styleNode, homePane);
}

function addCompactBehaviorPane() {
    let prefsView = document.getElementById("mainPrefPane");
    let homePane = prefsView.querySelector("#firefoxHomeCategory");

    // Create choices group
    let compactBehaviorGroup = new OptionsGroup(
        "natsumiCompactBehavior",
        "Behavior",
        "Tweak how you want Compact Mode to behave."
    );

    compactBehaviorGroup.registerOption("natsumiCompactNewWindow", new CheckboxChoice(
        "natsumi.theme.compact-on-new-window",
        "natsumiCompactNewWindow",
        "Enable Compact Mode by default",
        "If enabled, new windows will open with Compact Mode active."
    ));
    compactBehaviorGroup.registerOption("natsumiCompactLongVisibility", new CheckboxChoice(
        "natsumi.theme.compact-long-visibility",
        "natsumiCompactLongVisibility",
        "Display sidebar/toolbar for longer on hover"
    ));

    if (ucApi.Prefs.get("natsumi.browser.type").exists()) {
        if (ucApi.Prefs.get("natsumi.browser.type").value === "floorp") {
            compactBehaviorGroup.registerOption("natsumiCompactInterceptZenMode", new CheckboxChoice(
                "natsumi.theme.compact-keep-zen-mode",
                "natsumiCompactInterceptZenMode",
                "Use Floorp's Zen Mode as a toggle",
                "Enabling Zen Mode will toggle Compact Mode instead.",
                true
            ));
        }
    }

    let compactBehaviorNode = compactBehaviorGroup.generateNode();

    prefsView.insertBefore(compactBehaviorNode, homePane);
}

function addGlimpseBehaviorPane() {
    let prefsView = document.getElementById("mainPrefPane");
    let homePane = prefsView.querySelector("#firefoxHomeCategory");

    // Create choices group
    let glimpseBehaviorGroup = new OptionsGroup(
        "natsumiGlimpseBehavior",
        "Behavior",
        "Tweak how you want Glimpse to behave."
    );

    glimpseBehaviorGroup.registerOption("natsumiGlimpseEnabled", new CheckboxChoice(
        "natsumi.glimpse.enabled",
        "natsumiGlimpseEnabled",
        "Enable Glimpse"
    ));

    glimpseBehaviorGroup.registerOption("natsumiGlimpseMulti", new CheckboxChoice(
        "natsumi.glimpse.multi",
        "natsumiGlimpseMulti",
        "Allow Multi Glimpse",
        "This will let you open multiple Glimpse tabs at once for one tab."
    ));

    glimpseBehaviorGroup.registerOption("natsumiGlimpseRightControls", new CheckboxChoice(
        "natsumi.glimpse.controls-on-right",
        "natsumiGlimpseRightControls",
        "Move Glimpse controls to the right"
    ));

    let glimpseBehaviorNode = glimpseBehaviorGroup.generateNode();

    prefsView.insertBefore(glimpseBehaviorNode, homePane);
}

function addGlimpseKeyPane() {
    let prefsView = document.getElementById("mainPrefPane");
    let homePane = prefsView.querySelector("#firefoxHomeCategory");

    // Check if glimpse key exists
    let defaultOverride = null;
    if (ucApi.Prefs.get("natsumi.glimpse.key").exists()) {
        defaultOverride = ucApi.Prefs.get("natsumi.glimpse.key").value;
    }

    // Create theme selection
    let glimpseKeySelection = new RadioPreference(
        "natsumiGlimpseKey",
        "natsumi.glimpse.key",
        "Activation method",
        "Choose how Glimpse should be activated.",
        defaultOverride
    );

    for (let activationKey in glimpseKeys) {
        glimpseKeySelection.registerOption(activationKey, glimpseKeys[activationKey]);
    }

    let glimpseKeyNode = glimpseKeySelection.generateNode();

    // Set listeners for each button
    let glimpseKeyButtons = glimpseKeyNode.querySelectorAll(".natsumi-radio-choice");
    glimpseKeyButtons.forEach(button => {
        button.addEventListener("click", () => {
            let selectedValue = button.getAttribute("value");
            console.log("Changing key:", selectedValue);
            setStringPreference("natsumi.glimpse.key", selectedValue);
            glimpseKeyButtons.forEach((btn) => {
                btn.removeAttribute("selected")
                let radioCheck = btn.querySelector(".radio-check");
                radioCheck.removeAttribute("selected");
            });
            button.setAttribute("selected", "true");
            let radioCheck = button.querySelector(".radio-check");
            radioCheck.setAttribute("selected", "true");
        });
    });

    prefsView.insertBefore(glimpseKeyNode, homePane);
}

function addGlimpseAccessibilityPane() {
    let prefsView = document.getElementById("mainPrefPane");
    let homePane = prefsView.querySelector("#firefoxHomeCategory");

    // Create choices group
    let glimpseAccessibilityGroup = new OptionsGroup(
        "natsumiGlimpseAccessibility",
        "Accessibility",
        "Tweak Glimpse to make it easier to use."
    );

    glimpseAccessibilityGroup.registerOption("natsumiGlimpseIndicator", new CheckboxChoice(
        "natsumi.glimpse.show-indicator",
        "natsumiGlimpseIndicator",
        "Show Glimpse indicator above content"
    ));

    glimpseAccessibilityGroup.registerOption("natsumiGlimpseBorder", new CheckboxChoice(
        "natsumi.glimpse.alt-border",
        "natsumiGlimpseBorder",
        "Use an alternate border color for Glimpse",
        "This may help as a quick way to identify Glimpse tabs."
    ));

    let glimpseAccessibilityNode = glimpseAccessibilityGroup.generateNode();

    prefsView.insertBefore(glimpseAccessibilityNode, homePane);
}

function addMiniplayerBehaviorPane() {
    let prefsView = document.getElementById("mainPrefPane");
    let homePane = prefsView.querySelector("#firefoxHomeCategory");

    // Create choices group
    let miniplayerBehaviorGroup = new OptionsGroup(
        "natsumiMiniplayerBehavior",
        "Behavior",
        "Tweak how you want Natsumi's Miniplayer to behave."
    );

    miniplayerBehaviorGroup.registerOption("natsumiMiniplayerToggle", new CheckboxChoice(
        "natsumi.miniplayer.disabled",
        "natsumiMiniplayerToggle",
        "Enable Miniplayer",
        "",
        true
    ));

    miniplayerBehaviorGroup.registerOption("natsumiMiniplayerDefaultPin", new CheckboxChoice(
        "natsumi.miniplayer.pin-by-default",
        "natsumiMiniplayerDefaultPin",
        "Pin Miniplayers by default",
        ""
    ));

    let miniplayerBehaviorNode = miniplayerBehaviorGroup.generateNode();

    prefsView.insertBefore(miniplayerBehaviorNode, homePane);
}

function addMiniplayerLayoutPane() {
    let prefsView = document.getElementById("mainPrefPane");
    let homePane = prefsView.querySelector("#firefoxHomeCategory");

    // Create layout selection
    let miniplayerLayoutSelection = new MultipleChoicePreference(
        "natsumiMiniplayerLayout",
        "natsumi.miniplayer.scroll-view",
        "Layout and Appearance",
        "Choose the layout and look you want for the Miniplayers."
    );

    for (let layout in miniplayerLayouts) {
        miniplayerLayoutSelection.registerOption(layout, miniplayerLayouts[layout]);
    }

    miniplayerLayoutSelection.registerExtras("natsumiMiniplayerArtwork", new CheckboxChoice(
        "natsumi.miniplayer.disable-artwork",
        "natsumiMiniplayerArtwork",
        "Show media thumbnail/artwork as Miniplayer background",
        "",
        true
    ));

    miniplayerLayoutSelection.registerExtras("natsumiMiniplayerAccent", new CheckboxChoice(
        "natsumi.miniplayer.disable-dynamic-accent",
        "natsumiMiniplayerAccent",
        "Use artwork to determine Miniplayer's accent color",
        "",
        true
    ));

    miniplayerLayoutSelection.registerExtras("natsumiMiniplayerScroll", new CheckboxChoice(
        "natsumi.miniplayer.disable-text-scrolling",
        "natsumiMiniplayerScroll",
        "Scroll title and author text on overflow",
        "",
        true
    ));

    let miniplayerLayoutNode = miniplayerLayoutSelection.generateNode();
    let miniplayerVerticalNotice = convertToXUL(`
        <div id="natsumiMiniplayerVerticalTabsWarning" class="natsumi-settings-info warning">
            <div class="natsumi-settings-info-icon"></div>
            <div class="natsumi-settings-info-text">
                You need to enable Vertical Tabs to change the Miniplayer layout.
            </div>
        </div>
    `);
    let miniplayerLayoutSelector = miniplayerLayoutNode.querySelector(".natsumi-mc-chooser");
    miniplayerLayoutSelector.parentNode.insertBefore(miniplayerVerticalNotice, miniplayerLayoutSelector);

    prefsView.insertBefore(miniplayerLayoutNode, homePane);
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
        "Scroll-to-move allows you to move and resize the Picture-in-Picture window with mouse/trackpad scrolling.",
        true
    ));

    let scrollToMoveSubgroup = new OptionsGroup(
        "natsumiPiPScrollToMoveOptions",
        "",
        ""
    );

    scrollToMoveSubgroup.registerOption("natsumiPiPCenterScale", new CheckboxChoice(
        "natsumi.pip.center-scale",
        "natsumiPiPCenterScale",
        "Keep PiP window centered relative to original position on resize",
        "",
        false,
        false,
        "natsumi.pip.disable-scroll-to-move",
        true
    ));

    pipBehaviorGroup.registerOption("natsumiPiPScrollToMoveOptions", scrollToMoveSubgroup);

    pipBehaviorGroup.registerOption("natsumiPipLegacyStyle", new CheckboxChoice(
        "natsumi.pip.legacy-style",
        "natsumiPipLegacyStyle",
        "Use legacy design for Picture-in-Picture controls",
        "This will merge Picture-in-Picture controls into one 'island' rather than having separate 'islands'."
    ));

    let pipBehaviorNode = pipBehaviorGroup.generateNode();

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

    prefsView.insertBefore(materialNode, homePane);
}

function addPDFCompactPane() {
    let prefsView = document.getElementById("mainPrefPane");
    let homePane = prefsView.querySelector("#firefoxHomeCategory");

    // Create choices group
    let compactGroup = new OptionsGroup(
        "natsumiPDFCompact",
        "Toolbar autohide",
        "Toolbar autohide lets you focus on the document at hand by hiding the sidebar and toolbar when you don't need it."
    );

    compactGroup.registerOption("natsumiPDFEnableCompact", new CheckboxChoice(
        "natsumi.pdfjs.compact",
        "natsumiPDFEnableCompact",
        "Enable Toolbar autohide"
    ));

    let compactSubgroup = new OptionsGroup(
        "natsumiPDFCompactOptions",
        "",
        ""
    );

    compactSubgroup.registerOption("natsumiPDFDynamicCompact", new CheckboxChoice(
        "natsumi.pdfjs.compact-dynamic",
        "natsumiPDFDynamicCompact",
        "Dynamic autohide",
        "Toolbar autohide will automatically disable if the sidebar is open.",
        false,
        false,
        "natsumi.pdfjs.compact",
        false
    ));

    compactGroup.registerOption("natsumiPDFCompactOptions", compactSubgroup);

    let compactNode = compactGroup.generateNode();

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

    prefsView.insertBefore(behaviorNode, homePane);
}

function addStartupAnimationsPane() {
    let prefsView = document.getElementById("mainPrefPane");
    let homePane = prefsView.querySelector("#firefoxHomeCategory");

    // Create theme selection
    let startupSelection = new MultipleChoicePreference(
        "natsumiStartupAnimation",
        "natsumi.startup.type",
        "Animation",
        "Choose the startup animation you want to be played when you open your browser."
    );

    for (let startupAnimation in startupAnimations) {
        startupSelection.registerOption(startupAnimation, startupAnimations[startupAnimation]);
    }

    let startupNode = startupSelection.generateNode();

    prefsView.insertBefore(startupNode, homePane);
}

function addStartupSoundsPane() {
    let prefsView = document.getElementById("mainPrefPane");
    let homePane = prefsView.querySelector("#firefoxHomeCategory");

    // Check if glimpse key exists
    let defaultOverride = null;
    if (ucApi.Prefs.get("natsumi.startup.sound").exists()) {
        defaultOverride = ucApi.Prefs.get("natsumi.startup.sound").value;
    }

    // Create theme selection
    let startupSoundSelection = new RadioPreference(
        "natsumiStartupSound",
        "natsumi.startup.sound",
        "Startup sound",
        "Choose the sound to play for startup.",
        defaultOverride
    );

    for (let startupSound in startupSounds) {
        startupSoundSelection.registerOption(startupSound, startupSounds[startupSound]);
    }

    let startupSoundNode = startupSoundSelection.generateNode();

    // Set listeners for each button
    let startupSoundButtons = startupSoundNode.querySelectorAll(".natsumi-radio-choice");
    startupSoundButtons.forEach(button => {
        button.addEventListener("click", () => {
            let selectedValue = button.getAttribute("value");
            console.log("Changing sound:", selectedValue);
            setStringPreference("natsumi.startup.sound", selectedValue);
            startupSoundButtons.forEach((btn) => {
                btn.removeAttribute("selected")
                let radioCheck = btn.querySelector(".radio-check");
                radioCheck.removeAttribute("selected");
            });
            button.setAttribute("selected", "true");
            let radioCheck = button.querySelector(".radio-check");
            radioCheck.setAttribute("selected", "true");
        });
    });

    prefsView.insertBefore(startupSoundNode, homePane);

    // Create sound picker
    let customSoundPicker = new FileUpload("natsumiSoundPicker", "audio");
    customSoundPicker.setUploadCallback(() => {
        // Get sound file ID
        const fileId = customSoundPicker.currentFile;

        // Store as config
        if (fileId) {
            setStringPreference("natsumi.startup.custom-sound-id", fileId);
        } else {
            ucApi.Prefs.get("natsumi.startup.custom-sound-id").reset();
        }
    });
    let customSoundPickerNode = customSoundPicker.generateNode();
    let startupSoundParent = prefsView.querySelector("#natsumiStartupSoundSettings");
    startupSoundParent.appendChild(customSoundPickerNode);

    // Set existing file
    if (ucApi.Prefs.get("natsumi.startup.custom-sound-id").exists) {
        customSoundPicker.setFile(ucApi.Prefs.get("natsumi.startup.custom-sound-id").value);
    }
}

function addMiscPreferencesPane() {
    let prefsView = document.getElementById("mainPrefPane");
    let homePane = prefsView.querySelector("#firefoxHomeCategory");

    // Create choices group
    let miscPreferencesGroup = new OptionsGroup(
        "natsumiMiscPreferences",
        "Preferences",
        "Tweak how you want the preferences page to look."
    );

    miscPreferencesGroup.registerOption("natsumiMiscPreferencesRevert", new CheckboxChoice(
        "natsumi.theme.classic-preferences",
        "natsumiMiscPreferencesRevert",
        "Revert to classic preferences look",
        "If you don't like Natsumi's custom preferences design, you can enable this to disable it."
    ));

    miscPreferencesGroup.registerOption("natsumiMiscPreferencesHideSubcategory", new CheckboxChoice(
        "natsumi.theme.preferences-hide-subcategories",
        "natsumiMiscPreferencesHideSubcategory",
        "Hide subcategories list"
    ));

    miscPreferencesGroup.registerOption("natsumiMiscCopyCleanUrl", new CheckboxChoice(
        "natsumi.browser.copy-clean-link",
        "natsumiMiscCopyCleanUrl",
        "Copy clean URL with shortcut where possible"
    ));

    miscPreferencesGroup.registerOption("natsumiMiscInvertedScroll", new CheckboxChoice(
        "natsumi.browser.invert-scroll",
        "natsumiMiscInvertedScroll",
        "Invert scroll direction",
        "This will invert the scroll direction for some Natsumi features. This does NOT affect web content."
    ));

    let miscPreferencesNode = miscPreferencesGroup.generateNode();

    prefsView.insertBefore(miscPreferencesNode, homePane);
}

function addPreferencesPanes() {
    // Category nodes
    let appearanceNode = convertToXUL(`
        <hbox id="natsumiAppearanceCategory" class="subcategory" data-category="paneNatsumiSettings" hidden="true">
            <html:${categoryHeader}>Browser Appearance</html:${categoryHeader}>
        </hbox>
    `);
    let sidebarNode = convertToXUL(`
        <hbox id="natsumiSidebarCategory" class="subcategory" data-category="paneNatsumiSettings" hidden="true">
            <html:${categoryHeader}>Sidebar &amp; Tabs</html:${categoryHeader}>
        </hbox>
    `);
    let compactModeNode = convertToXUL(`
        <hbox id="natsumiCompactModeCategory" class="subcategory" data-category="paneNatsumiSettings" hidden="true">
            <html:${categoryHeader}>Compact Mode</html:${categoryHeader}>
        </hbox>
    `);
    let glimpseNode = convertToXUL(`
        <hbox id="natsumiGlimpseCategory" class="subcategory" data-category="paneNatsumiSettings" hidden="true">
            <html:${categoryHeader}>Glimpse</html:${categoryHeader}>
        </hbox>
    `);
    let miniPlayerNode = convertToXUL(`
        <hbox id="natsumiMiniplayerCategory" class="subcategory" data-category="paneNatsumiSettings" hidden="true">
            <html:${categoryHeader}>Miniplayer</html:${categoryHeader}>
        </hbox>
    `);
    let pipNode = convertToXUL(`
        <hbox id="natsumiPipCategory" class="subcategory" data-category="paneNatsumiSettings" hidden="true">
            <html:${categoryHeader}>Picture-in-Picture</html:${categoryHeader}>
        </hbox>
    `);
    let pdfjsNode = convertToXUL(`
        <hbox id="natsumiPDFCategory" class="subcategory" data-category="paneNatsumiSettings" hidden="true">
            <html:${categoryHeader}>PDF Viewer</html:${categoryHeader}>
        </hbox>
    `);
    let urlbarNode = convertToXUL(`
        <hbox id="natsumiUrlbarCategory" class="subcategory" data-category="paneNatsumiSettings" hidden="true">
            <html:${categoryHeader}>URL Bar</html:${categoryHeader}>
        </hbox>
    `);
    let startupNode = convertToXUL(`
        <hbox id="natsumiStartupCategory" class="subcategory" data-category="paneNatsumiSettings" hidden="true">
            <html:${categoryHeader}>Startup</html:${categoryHeader}>
        </hbox>
    `);
    let miscNode = convertToXUL(`
        <hbox id="natsumiMiscCategory" class="subcategory" data-category="paneNatsumiSettings" hidden="true">
            <html:${categoryHeader}>Miscellaneous</html:${categoryHeader}>
        </hbox>
    `);

    let prefsView = document.getElementById("mainPrefPane");
    let homePane = prefsView.querySelector("#firefoxHomeCategory");
    prefsView.insertBefore(appearanceNode, homePane);
    addLayoutPane();
    addThemesPane();
    addWindowMaterialPane();
    addColorsPane();
    addIconsPane();
    addFontsPane();
    addSDL2Pane();

    prefsView.insertBefore(sidebarNode, homePane);
    addSidebarTabsPane();
    addSidebarWorkspacesPane();
    addSidebarPanelSidebarPane();
    addSidebarButtonsPane();
    addTabsBehaviorPane();

    prefsView.insertBefore(compactModeNode, homePane);
    addCompactStylesPane();
    addCompactBehaviorPane();

    prefsView.insertBefore(glimpseNode, homePane);
    addGlimpseBehaviorPane();
    addGlimpseKeyPane();
    addGlimpseAccessibilityPane();

    prefsView.insertBefore(miniPlayerNode, homePane);
    addMiniplayerBehaviorPane();
    addMiniplayerLayoutPane();

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

    prefsView.insertBefore(startupNode, homePane);
    addStartupAnimationsPane();
    addStartupSoundsPane();

    prefsView.insertBefore(miscNode, homePane);
    addMiscPreferencesPane();
}

function addHideFloorpWarnings() {
    let isFloorp = false;
    if (ucApi.Prefs.get("natsumi.browser.type").exists()) {
        if (ucApi.Prefs.get("natsumi.browser.type").value === "floorp") {
            isFloorp = true;
        }
    }

    if (!isFloorp) {
        return;
    }

    let mainPrefPane = document.getElementById("mainPrefPane");

    // Create "hide warning"
    let hideWarnings = `
        <div id="natsumi-hide-floorp-warnings">Hide these warnings</div>
    `

    let hideWarningsFragment = convertToXUL(hideWarnings);
    mainPrefPane.parentElement.insertBefore(hideWarningsFragment, mainPrefPane);

    // Get node
    let hideWarningsNode = document.getElementById("natsumi-hide-floorp-warnings");

    // Set event listener
    hideWarningsNode.addEventListener("click", () => {
        ucApi.Prefs.set("natsumi.theme.floorp-hide-preferences-warnings", true);
    });
}

function goodGirlBoyEnby() {
    // :3
    let goodGirl = false;
    let goodBoy = false;
    let goodEnby = false;
    if (ucApi.Prefs.get("natsumi.theme.good-girl").exists()) {
        goodGirl = ucApi.Prefs.get("natsumi.theme.good-girl").value;
    }
    if (ucApi.Prefs.get("natsumi.theme.good-boy").exists()) {
        goodBoy = ucApi.Prefs.get("natsumi.theme.good-boy").value;
    }
    if (ucApi.Prefs.get("natsumi.theme.good-enby").exists()) {
        goodEnby = ucApi.Prefs.get("natsumi.theme.good-enby").value;
    }

    let defaultBrowserNodes = document.querySelectorAll("#isDefaultPane");

    for (let defaultBrowser of defaultBrowserNodes) {
        let currentMessage = defaultBrowser.getAttribute("message");

        if (goodGirl) {
            currentMessage = currentMessage.replace("Good choice.", "Good girl :3");
        } else if (goodBoy) {
            currentMessage = currentMessage.replace("Good choice.", "Good boy :3");
        } else if (goodEnby) {
            currentMessage = currentMessage.replace("Good choice.", "Good enby :3");
        } else {
            // Easter egg is off
            return;
        }

        defaultBrowser.setAttribute("message", currentMessage);
    }
}

console.log("Loading prefs panes...");

try {
    addOptionStyles();
    addToSidebar();
    addPreferencesPanes();
    addHideFloorpWarnings();
    goodGirlBoyEnby();
} catch(e) {
    console.error(e);
}
