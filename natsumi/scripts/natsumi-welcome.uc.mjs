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

import * as ucApi from "chrome://userchromejs/content/uc_api.sys.mjs";
import {NatsumiNotification} from "./notifications.sys.mjs";
import {resetTabStyleIfNeeded} from "./reset-tab-style.sys.mjs";

let natsumiWelcomeObject = null;

function convertToXUL(node) {
    // noinspection JSUnresolvedReference
    return window.MozXULElement.parseXULToFragment(node);
}

function waitForAudioLoad(audio) {
    return new Promise((resolve, reject) => {
        const onLoad = () => {
            audio.removeEventListener('playing', onLoad);
            resolve();
        };
        const onError = (e) => {
            audio.removeEventListener('error', onError);
            reject(e);
        };

        audio.addEventListener('playing', onLoad);
        audio.addEventListener('error', onError);
    });
}

class NatsumiWelcomePane {
    constructor(id, title, body, nonDefaultDependency = null) {
        this.id = id;
        this.title = title;
        this.body = body;
        this.nonDefaultDependency = nonDefaultDependency;
    }

    generateNode() {
        let dependencyAttribute = "";
        if (this.nonDefaultDependency) {
            dependencyAttribute = ` dependency="${this.nonDefaultDependency}"`;
        }

        return convertToXUL(`
            <div id="${this.id}" class="natsumi-welcome-pane"${dependencyAttribute}>
                <div id="natsumi-welcome-title">${this.title}</div>
                <div class="natsumi-welcome-pane-body">${this.body}</div>
            </div>
        `);
    }
}

class NatsumiWelcome {
    constructor() {
        this.welcomeNode = convertToXUL(`
            <div id="natsumi-welcome">
                <image id="natsumi-icon"></image>
                <div id="natsumi-welcome-content">
                    <div id="natsumi-welcome-content-container">
                        <div id="natsumi-welcome-content-body">
                            <div id="natsumi-welcome-initial" class="natsumi-welcome-pane">
                                <div id="natsumi-slogan-1">Welcome to your</div>
                                <div id="natsumi-slogan-2"><span>personal</span> internet.</div>
                            </div>
                        </div>
                        <div id="natsumi-welcome-button-next" class="natsumi-welcome-button"></div>
                    </div>
                </div>
                <div id="natsumi-corner-icon">
                    <image id="natsumi-corner-icon-image"></image>
                    <div id="natsumi-corner-icon-label">Natsumi Browser</div>
                </div>
            </div>
        `);
        this.drumRolls = convertToXUL(`
            <div id="natsumi-welcome-drumroll-progress" class="natsumi-welcome-drumroll">
                <div class="natsumi-welcome-drumroll-icon"></div>
                <div class="natsumi-welcome-drumroll-text"></div>
            </div>
            <div id="natsumi-welcome-drumroll-complete" class="natsumi-welcome-drumroll">
                <div class="natsumi-welcome-drumroll-icon"></div>
                <div class="natsumi-welcome-drumroll-text">
                    Welcome to Natsumi                    
                </div>
            </div>
        `)
        this.drumRollCombos = [
            {
                "icon": "chrome://natsumi/content/icons/lucide/drum.svg",
                "text": "Drumroll please..."
            },
            {
                "icon": "chrome://natsumi/content/icons/lucide/rocket.svg",
                "text": "Preparing for liftoff..."
            },
            {
                "icon": "chrome://natsumi/content/icons/lucide/fire.svg",
                "text": "Warming up..."
            }
        ]
        this.panes = []
        this.step = -1;
        this.node = null;
        this.hasCompletedOnboarding = false;

        document.body.setAttribute("natsumi-welcome", "");
        document.body.appendChild(this.welcomeNode);

        // Add drumroll screens
        let welcomeNode = document.getElementById("natsumi-welcome");
        welcomeNode.appendChild(this.drumRolls);

        // Create welcome audio
        const drumrollAudioUrl = "chrome://natsumi/content/sounds/drumroll.ogg";
        this.drumrollAudio = new Audio(drumrollAudioUrl);
        this.drumrollAudio.load();
        this.drumrollAudio.volume = 0.2;
    }

    start() {
        let welcomeNode = document.querySelector("#natsumi-welcome");
        welcomeNode.classList.add("natsumi-welcome-initial-animation");
        this.node = welcomeNode;

        // Set drumroll text and icon
        let drumRollIndex = Math.floor(Math.random() * this.drumRollCombos.length);
        const drumRollText = this.drumRollCombos[drumRollIndex].text;
        const drumRollIcon = this.drumRollCombos[drumRollIndex].icon;
        document.body.style.setProperty("--natsumi-welcome-drumroll-icon", `url("${drumRollIcon}")`);
        let drumrollProgressTextNode = document.querySelector("#natsumi-welcome-drumroll-progress .natsumi-welcome-drumroll-text");
        drumrollProgressTextNode.textContent = drumRollText;
    }

    addPane(pane) {
        this.panes.push(pane);
    }

    handleSelection(selectionObject, nonDefaultDependency) {
        let selectionPref = selectionObject.getAttribute("pref");
        let selectionType = selectionObject.getAttribute("type");
        let selectionValue = selectionObject.getAttribute("value");
        let selectionParent = selectionObject.parentNode;
        let allSelectionObjects = selectionParent.querySelectorAll(".natsumi-welcome-selection");

        if (selectionType === "bool") {
            selectionValue = selectionValue === "true";
        }

        allSelectionObjects.forEach(selectionObject => {
            const pref = selectionObject.getAttribute("pref");

            if (pref === selectionPref) {
                selectionObject.classList.remove("selected")
            }
        });

        if (selectionType === "string" && nonDefaultDependency) {
            ucApi.Prefs.set(nonDefaultDependency, selectionValue !== "default");
        }

        ucApi.Prefs.set(selectionPref, selectionValue);
        selectionObject.classList.add("selected");
    }

    next() {
        if (this.node.classList.contains("natsumi-welcome-initial-animation")) {
            this.node.classList.remove("natsumi-welcome-initial-animation");
            this.node.classList.add("natsumi-welcome-ready");
        }

        if (this.step === this.panes.length) {
            // Let the drumroll commence
            ucApi.Prefs.set("natsumi.welcome.viewed", true);

            this.drumrollAudio.play().catch((error) => {
                console.warn("Failed to play audio:", error);
                this.completeOnboarding();
            });

            waitForAudioLoad(this.drumrollAudio).then(() => {
                this.completeOnboarding();
            });
            return;
        }

        this.step++;
        let bodyContainer = this.node.querySelector("#natsumi-welcome-content-body");
        bodyContainer.innerHTML = "";

        let paneNode;
        if (this.step === this.panes.length) {
            paneNode = convertToXUL(`
                <div id="natsumi-welcome-complete" class="natsumi-welcome-pane">
                    <div id="natsumi-welcome-title">That's it!</div>
                    <div class="natsumi-welcome-paragraph">Thank you for installing Natsumi. Enjoy your new customized browser!</div>
                </div>
            `)
        } else {
            paneNode = this.panes[this.step].generateNode();
        }

        bodyContainer.appendChild(paneNode);

        // Check if there's any dependencies for non-default values
        let nonDefaultDependency = null;
        if (this.panes[this.step].nonDefaultDependency) {
            nonDefaultDependency = this.panes[this.step].nonDefaultDependency;
        }

        // Check if there's selection objects
        let selectionObjects = this.node.querySelectorAll(".natsumi-welcome-selection");

        if (selectionObjects.length > 0) {
            selectionObjects.forEach(selectionObject => {
                // Ensure pref, type and value are all present as attributes and valid
                let pref = selectionObject.getAttribute("pref");
                let type = selectionObject.getAttribute("type");
                let value = selectionObject.getAttribute("value");

                let isInvalid = false;

                if (!pref || !type || !value) {
                    isInvalid = true;
                } else if (type !== "bool" && type !== "string" && type !== "int") {
                    isInvalid = true;
                }

                if (isInvalid) {
                    console.warn("Invalid selection object:", selectionObject);
                    selectionObject.remove();
                    return;
                }

                // Add event listener for selection
                selectionObject.addEventListener("click", () => {
                    this.handleSelection(selectionObject, nonDefaultDependency);
                });
            });
        }
    }

    completeOnboarding() {
        if (this.hasCompletedOnboarding) {
            return;
        }

        this.hasCompletedOnboarding = true;
        document.body.setAttribute("natsumi-welcome-complete", "");

        setTimeout(() => {
            // Show welcome complete drumroll
            document.body.setAttribute("natsumi-welcome-drumroll-complete", "");
        }, 2800);

        setTimeout(() => {
            // Remove drumrolls
            document.body.setAttribute("natsumi-welcome-complete-full", "");
        }, 4300);

        setTimeout(() => {
            // We're finally through with the welcome
            document.body.removeAttribute("natsumi-welcome");
            document.body.removeAttribute("natsumi-welcome-complete");
            document.body.removeAttribute("natsumi-welcome-drumroll-complete");
            document.body.removeAttribute("natsumi-welcome-complete-full");

            // Also set userChromeJS.persistent_domcontent_callback to true
            let shouldNotify = false;
            if (ucApi.Prefs.get("userChromeJS.persistent_domcontent_callback").exists()) {
                if (!ucApi.Prefs.get("userChromeJS.persistent_domcontent_callback").value) {
                    ucApi.Prefs.set("userChromeJS.persistent_domcontent_callback", true);
                    shouldNotify = true;
                }
            } else {
                ucApi.Prefs.set("userChromeJS.persistent_domcontent_callback", true);
                shouldNotify = true;
            }

            // Add to notifications
            let notificationObject = new NatsumiNotification(
                "Welcome to Natsumi!",
                "You can always customize Natsumi to your likings in the preferences page.",
                "chrome://natsumi/content/icons/lucide/party.svg",
                10000
            )
            notificationObject.addToContainer();

            if (shouldNotify) {
                let restartNotificationObject = new NatsumiNotification(
                    "Restart required",
                    "You may need to restart your browser for some features to work.",
                    "chrome://natsumi/content/icons/lucide/warning.svg",
                    10000,
                    "warning"
                )
                restartNotificationObject.addToContainer();
            }

            if (tabStyleReset) {
                let tabStyleResetObject = new NatsumiNotification(
                    "Heads up: your tab style was reset to Proton.",
                    "If you want to use other tab styles, simply enable the Classic tab design in settings.",
                    "chrome://natsumi/content/icons/lucide/info.svg",
                    10000
                )
                tabStyleResetObject.addToContainer();
            }
        }, 4800);
    }
}

function handleNextButton() {
    natsumiWelcomeObject.next();
}

function setupWelcome() {
    natsumiWelcomeObject = new NatsumiWelcome();
}

function createLayoutPane() {
    // noinspection HtmlUnknownAttribute
    let layoutSelection = `
        <div class="natsumi-welcome-selection selected" pref="natsumi.theme.single-toolbar" type="bool" value="false">
            <div id="natsumi-welcome-multiple-toolbars" class="natsumi-welcome-selection-preview"></div>
            <div class="natsumi-welcome-selection-label">
                Multiple Toolbars
            </div>
        </div>
        <div class="natsumi-welcome-selection" pref="natsumi.theme.single-toolbar" type="bool" value="true">
            <div id="natsumi-welcome-single-toolbar" class="natsumi-welcome-selection-preview"></div>
            <div class="natsumi-welcome-selection-label">
                Single Toolbar
            </div>
        </div>
    `
    const enabledVerticalTabs = ucApi.Prefs.get("sidebar.verticalTabs").value;

    let layoutPane = new NatsumiWelcomePane(
        "natsumi-welcome-layout",
        "Choose your layout",
        `
            <div class="natsumi-welcome-paragraph">
                You can choose between Multiple Toolbars for utility or Single Toolbar for simplicity.
            </div>
            <div id="natsumiSingleToolbarNotice" class="natsumi-welcome-info info" hidden="${enabledVerticalTabs}">
                <div class="natsumi-welcome-info-icon"></div>
                <div class="natsumi-welcome-info-text">
                    Heads up: using Single Toolbar will enable vertical tabs.
                </div>
            </div>
            <div class="natsumi-welcome-selection-container" horizontal="${!enabledVerticalTabs}">
                ${layoutSelection}
            </div>
        `,
    );

    if (!ucApi.Prefs.get("natsumi.theme.single-toolbar").exists()) {
        ucApi.Prefs.set("natsumi.theme.single-toolbar", false);
    }

    if (!enabledVerticalTabs) {
        Services.prefs.addObserver("natsumi.theme.single-toolbar", () => {
            const isSingleToolbar = ucApi.Prefs.get("natsumi.theme.single-toolbar").value;
            if (isSingleToolbar) {
                ucApi.Prefs.set("sidebar.verticalTabs", true);
            } else {
                ucApi.Prefs.set("sidebar.verticalTabs", false);
            }
        });
    }

    natsumiWelcomeObject.addPane(layoutPane);
}

function createColorsPane() {
    // noinspection HtmlUnknownAttribute
    let colorsSelection = `
        <div class="natsumi-welcome-selection selected" pref="natsumi.theme.accent-color" type="string" value="default">
            <div id="natsumi-welcome-light-green" class="natsumi-welcome-selection-preview"></div>
        </div>
        <div class="natsumi-welcome-selection" pref="natsumi.theme.accent-color" type="string" value="sky-blue">
            <div id="natsumi-welcome-sky-blue" class="natsumi-welcome-selection-preview"></div>
        </div>
        <div class="natsumi-welcome-selection" pref="natsumi.theme.accent-color" type="string" value="turquoise">
            <div id="natsumi-welcome-turquoise" class="natsumi-welcome-selection-preview"></div>
        </div>
        <div class="natsumi-welcome-selection" pref="natsumi.theme.accent-color" type="string" value="yellow">
            <div id="natsumi-welcome-yellow" class="natsumi-welcome-selection-preview"></div>
        </div>
        <div class="natsumi-welcome-selection" pref="natsumi.theme.accent-color" type="string" value="peach-orange">
            <div id="natsumi-welcome-peach-orange" class="natsumi-welcome-selection-preview"></div>
        </div>
        <div class="natsumi-welcome-selection" pref="natsumi.theme.accent-color" type="string" value="warmer-pink">
            <div id="natsumi-welcome-warmer-pink" class="natsumi-welcome-selection-preview"></div>
        </div>
        <div class="natsumi-welcome-selection" pref="natsumi.theme.accent-color" type="string" value="beige">
            <div id="natsumi-welcome-beige" class="natsumi-welcome-selection-preview"></div>
        </div>
        <div class="natsumi-welcome-selection" pref="natsumi.theme.accent-color" type="string" value="light-red">
            <div id="natsumi-welcome-light-red" class="natsumi-welcome-selection-preview"></div>
        </div>
        <div class="natsumi-welcome-selection" pref="natsumi.theme.accent-color" type="string" value="muted-pink">
            <div id="natsumi-welcome-muted-pink" class="natsumi-welcome-selection-preview"></div>
        </div>
        <div class="natsumi-welcome-selection" pref="natsumi.theme.accent-color" type="string" value="pink">
            <div id="natsumi-welcome-pink" class="natsumi-welcome-selection-preview"></div>
        </div>
        <div class="natsumi-welcome-selection" pref="natsumi.theme.accent-color" type="string" value="lavender-purple">
            <div id="natsumi-welcome-lavender-purple" class="natsumi-welcome-selection-preview"></div>
        </div>
        <div class="natsumi-welcome-selection" pref="natsumi.theme.accent-color" type="string" value="system">
            <div id="natsumi-welcome-system-accent" class="natsumi-welcome-selection-preview"></div>
        </div>
    `

    let colorsPane = new NatsumiWelcomePane(
        "natsumi-welcome-colors",
        "Select your accent color",
        `
            <div class="natsumi-welcome-paragraph">
                The accent color will be used throughout Natsumi. You can use your Firefox theme's colors if you want, too.
            </div>
            <div class="natsumi-welcome-selection-container">
                ${colorsSelection}
            </div>
        `,
    );

    natsumiWelcomeObject.addPane(colorsPane);
}

function createThemesPane() {
    // noinspection HtmlUnknownAttribute
    let themesSelection = `
        <div class="natsumi-welcome-selection selected" pref="natsumi.theme.type" type="string" value="default">
            <div id="natsumi-welcome-theme-default" class="natsumi-welcome-selection-preview"></div>
        </div>
        <div class="natsumi-welcome-selection" pref="natsumi.theme.type" type="string" value="gradient">
            <div id="natsumi-welcome-theme-gradient" class="natsumi-welcome-selection-preview"></div>
        </div>
        <div class="natsumi-welcome-selection" pref="natsumi.theme.type" type="string" value="gradient-complementary">
            <div id="natsumi-welcome-theme-cgradient" class="natsumi-welcome-selection-preview"></div>
        </div>
        <div class="natsumi-welcome-selection" pref="natsumi.theme.type" type="string" value="colorful">
            <div id="natsumi-welcome-theme-colorful" class="natsumi-welcome-selection-preview"></div>
        </div>
        <div class="natsumi-welcome-selection" pref="natsumi.theme.type" type="string" value="playful">
            <div id="natsumi-welcome-theme-playful" class="natsumi-welcome-selection-preview"></div>
        </div>
        <div class="natsumi-welcome-selection" pref="natsumi.theme.type" type="string" value="lucid">
            <div id="natsumi-welcome-theme-lucid" class="natsumi-welcome-selection-preview"></div>
        </div>
        <div class="natsumi-welcome-selection" pref="natsumi.theme.type" type="string" value="oled">
            <div id="natsumi-welcome-theme-oled" class="natsumi-welcome-selection-preview"></div>
        </div>
        <div class="natsumi-welcome-selection" pref="natsumi.theme.type" type="string" value="lgbtq">
            <div id="natsumi-welcome-theme-lgbtq" class="natsumi-welcome-selection-preview"></div>
        </div>
        <div class="natsumi-welcome-selection" pref="natsumi.theme.type" type="string" value="transgender">
            <div id="natsumi-welcome-theme-transgender" class="natsumi-welcome-selection-preview"></div>
        </div>
    `

    let themesPane = new NatsumiWelcomePane(
        "natsumi-welcome-themes",
        "Paint your browser",
        `
            <div class="natsumi-welcome-paragraph">
                Choose a theme that you like. It'll be used as the browser's background.<br/>
                You can also build your own theme in your browser's preferences page after setup.
            </div>
            <div class="natsumi-welcome-selection-container">
                ${themesSelection}
            </div>
        `,
    );

    natsumiWelcomeObject.addPane(themesPane);
}

function createIconsPane() {
    // noinspection HtmlUnknownAttribute
    let iconSelection = `
        <div class="natsumi-welcome-selection selected" pref="natsumi.theme.icons" type="string" value="default">
            <div id="natsumi-welcome-icons-default" class="natsumi-welcome-selection-preview">
                <div class="natsumi-welcome-selection-icon icon-sidebar"></div>
                <div class="natsumi-welcome-selection-icon icon-bookmarks"></div>
                <div class="natsumi-welcome-selection-icon icon-back"></div>
                <div class="natsumi-welcome-selection-icon icon-reload"></div>
            </div>
            <div class="natsumi-welcome-selection-label">
                Firefox default
            </div>
        </div>
        <div class="natsumi-welcome-selection" pref="natsumi.theme.icons" type="string" value="lucide">
            <div id="natsumi-welcome-icons-lucide" class="natsumi-welcome-selection-preview">
                <div class="natsumi-welcome-selection-icon icon-sidebar"></div>
                <div class="natsumi-welcome-selection-icon icon-bookmarks"></div>
                <div class="natsumi-welcome-selection-icon icon-back"></div>
                <div class="natsumi-welcome-selection-icon icon-reload"></div>
            </div>
            <div class="natsumi-welcome-selection-label">
                Lucide
            </div>
        </div>
        <div class="natsumi-welcome-selection" pref="natsumi.theme.icons" type="string" value="fluent">
            <div id="natsumi-welcome-icons-fluent" class="natsumi-welcome-selection-preview">
                <div class="natsumi-welcome-selection-icon icon-sidebar"></div>
                <div class="natsumi-welcome-selection-icon icon-bookmarks"></div>
                <div class="natsumi-welcome-selection-icon icon-back"></div>
                <div class="natsumi-welcome-selection-icon icon-reload"></div>
            </div>
            <div class="natsumi-welcome-selection-label">
                Fluent
            </div>
        </div>
    `

    let layoutPane = new NatsumiWelcomePane(
        "natsumi-welcome-icons",
        "Choose your icons",
        `
            <div class="natsumi-welcome-paragraph">
                Choose the icon pack you want to use. Please note that some icons may not be changed regardless of icon pack.
            </div>
            <div class="natsumi-welcome-selection-container">
                ${iconSelection}
            </div>
        `,
    );

    natsumiWelcomeObject.addPane(layoutPane);
}

function createTabsPane() {
    // noinspection HtmlUnknownAttribute
    let tabsSelection = `
        <div class="natsumi-welcome-selection selected" pref="natsumi.tabs.type" type="string" value="default">
            <div id="natsumi-welcome-tabs-blade" class="natsumi-welcome-selection-preview">
                <div class='natsumi-welcome-tab'>
                    <div class='natsumi-welcome-tab-icon'></div>
                    <div class='natsumi-welcome-tab-text'></div>
                </div>
            </div>
            <div class="natsumi-welcome-selection-label">
                Blade
            </div>
        </div>
        <div class="natsumi-welcome-selection" pref="natsumi.tabs.type" type="string" value="origin">
            <div id="natsumi-welcome-tabs-origin" class="natsumi-welcome-selection-preview">
                <div class='natsumi-welcome-tab'>
                    <div class='natsumi-welcome-tab-icon'></div>
                    <div class='natsumi-welcome-tab-text'></div>
                </div>
            </div>
            <div class="natsumi-welcome-selection-label">
                Origin
            </div>
        </div>
        <div class="natsumi-welcome-selection" pref="natsumi.tabs.type" type="string" value="curve">
            <div id="natsumi-welcome-tabs-curve" class="natsumi-welcome-selection-preview">
                <div class='natsumi-welcome-tab'>
                    <div class='natsumi-welcome-tab-icon'></div>
                    <div class='natsumi-welcome-tab-text'></div>
                </div>
            </div>
            <div class="natsumi-welcome-selection-label">
                Curve
            </div>
        </div>
        <div class="natsumi-welcome-selection" pref="natsumi.tabs.type" type="string" value="fusion">
            <div id="natsumi-welcome-tabs-fusion" class="natsumi-welcome-selection-preview">
                <div class='natsumi-welcome-tab'>
                    <div class='natsumi-welcome-tab-icon'></div>
                    <div class='natsumi-welcome-tab-text'></div>
                </div>
            </div>
            <div class="natsumi-welcome-selection-label">
                Fusion
            </div>
        </div>
        <div class="natsumi-welcome-selection" pref="natsumi.tabs.type" type="string" value="material">
            <div id="natsumi-welcome-tabs-material" class="natsumi-welcome-selection-preview">
                <div class='natsumi-welcome-tab'>
                    <div class='natsumi-welcome-tab-icon'></div>
                    <div class='natsumi-welcome-tab-text'></div>
                </div>
            </div>
            <div class="natsumi-welcome-selection-label">
                Material
            </div>
        </div>
        <div class="natsumi-welcome-selection" pref="natsumi.tabs.type" type="string" value="hexagonal">
            <div id="natsumi-welcome-tabs-hexagonal" class="natsumi-welcome-selection-preview">
                <div class='natsumi-welcome-tab'>
                    <div class='natsumi-welcome-tab-icon'></div>
                    <div class='natsumi-welcome-tab-text'></div>
                </div>
            </div>
            <div class="natsumi-welcome-selection-label">
                Hexagonal
            </div>
        </div>
        <div class="natsumi-welcome-selection" pref="natsumi.tabs.type" type="string" value="bubble">
            <div id="natsumi-welcome-tabs-bubble" class="natsumi-welcome-selection-preview">
                <div class='natsumi-welcome-tab'>
                    <div class='natsumi-welcome-tab-icon'></div>
                    <div class='natsumi-welcome-tab-text'></div>
                </div>
            </div>
            <div class="natsumi-welcome-selection-label">
                Bubble
            </div>
        </div>
        <div class="natsumi-welcome-selection" pref="natsumi.tabs.type" type="string" value="classic">
            <div id="natsumi-welcome-tabs-classic" class="natsumi-welcome-selection-preview">
                <div class='natsumi-welcome-tab'>
                    <div class='natsumi-welcome-tab-icon'></div>
                    <div class='natsumi-welcome-tab-text'></div>
                </div>
            </div>
            <div class="natsumi-welcome-selection-label">
                Classic
            </div>
        </div>
        <div class="natsumi-welcome-selection" pref="natsumi.tabs.type" type="string" value="clicky">
            <div id="natsumi-welcome-tabs-clicky" class="natsumi-welcome-selection-preview">
                <div class='natsumi-welcome-tab'>
                    <div class='natsumi-welcome-tab-icon'></div>
                    <div class='natsumi-welcome-tab-text'></div>
                </div>
            </div>
            <div class="natsumi-welcome-selection-label">
                Clicky
            </div>
        </div>
    `

    let themesPane = new NatsumiWelcomePane(
        "natsumi-welcome-tabs",
        "Choose your tab design",
        `
            <div class="natsumi-welcome-paragraph">
                You can choose from a variety of tab designs to suit your style.
            </div>
            <div class="natsumi-welcome-selection-container">
                ${tabsSelection}
            </div>
        `,
        "natsumi.tabs.use-custom-type"
    );

    natsumiWelcomeObject.addPane(themesPane);
}

function createURLbarPane() {
    // noinspection HtmlUnknownAttribute
    let themesSelection = `
        <div class="natsumi-welcome-selection selected" pref="natsumi.urlbar.do-not-float" type="bool" value="false">
            <div id="natsumi-welcome-urlbar-floating" class="natsumi-welcome-selection-preview"></div>
            <div class="natsumi-welcome-selection-label">
                Floating
            </div>
        </div>
        <div class="natsumi-welcome-selection" pref="natsumi.urlbar.do-not-float" type="bool" value="true">
            <div id="natsumi-welcome-urlbar-classic" class="natsumi-welcome-selection-preview"></div>
            <div class="natsumi-welcome-selection-label">
                Classic
            </div>
        </div>
    `

    let themesPane = new NatsumiWelcomePane(
        "natsumi-welcome-urlbar",
        "Choose your URL bar style",
        `
            <div class="natsumi-welcome-paragraph">
                You can choose to make your URL bar float or keep the original design.
            </div>
            <div class="natsumi-welcome-selection-container">
                ${themesSelection}
            </div>
        `,
    );

    natsumiWelcomeObject.addPane(themesPane);
}

function createCompatibilityWarning() {
    // This function is only to be used if the browser is INTENTIONALLY made incompatible or has security issues

    const unsupportedBrowsers = [
        "zen"
    ]
    const torSecurityBrowsers = ["torbrowser", "mullvadbrowser"];

    let mainBrowserName = AppConstants.MOZ_APP_NAME.toLowerCase();
    let displayBrowserName = AppConstants.MOZ_APP_NAME;
    const altBrowserName = AppConstants.MOZ_APP_DISPLAYNAME_DO_NOT_USE.toLowerCase();

    if (altBrowserName === "tor browser") {
        mainBrowserName = "torbrowser";
        displayBrowserName = AppConstants.MOZ_APP_DISPLAYNAME_DO_NOT_USE;
    } else if (mainBrowserName === "mullvadbrowser") {
        displayBrowserName = AppConstants.MOZ_APP_DISPLAYNAME_DO_NOT_USE;
    }

    const isUnsupported = unsupportedBrowsers.includes(mainBrowserName);
    let isTorSecurityIssue = torSecurityBrowsers.includes(mainBrowserName);

    if (isTorSecurityIssue) {
        // Check if security notice has been acknowledged
        let securityNoticeAcknowledged = false;
        if (ucApi.Prefs.get("natsumi.browser.ignore-security-notice").exists()) {
            securityNoticeAcknowledged = ucApi.Prefs.get("natsumi.browser.ignore-security-notice").value;
        }

        if (securityNoticeAcknowledged) {
            return;
        }
    }

    document.body.setAttribute("natsumi-welcome", "");

    // Get browser name
    let browserName = AppConstants.MOZ_APP_BASENAME;

    let warningNode = convertToXUL(`
        <div id="natsumi-compat-warning">
            <div id="natsumi-compat-warning-content">
                <image id="natsumi-compat-warning-icon"></image>
                <div id="natsumi-compat-warning-header">
                    This browser isn't compatible
                </div>
                <div id="natsumi-compat-warning-body-1"></div>
                <div id="natsumi-compat-warning-body-2"></div>
                <div id="natsumi-compat-warning-restart">
                    Acknowledge and restart browser
                </div>
            </div>
        </div>
    `);

    document.body.appendChild(warningNode);

    // Set up text content
    try {
        if (isUnsupported) {
            let warningBodyNode = document.getElementById("natsumi-compat-warning-body-1");
            warningBodyNode.textContent = `Natsumi is incompatible with ${displayBrowserName}. This can be due to compatibility issues or severe concerns such as security/privacy or ethics.`;
            let warningBodyNode2 = document.getElementById("natsumi-compat-warning-body-2");
            warningBodyNode2.textContent = `Please use a supported browser or uninstall Natsumi.`;
            let warningRestartNode = document.getElementById("natsumi-compat-warning-restart");
            warningRestartNode.style.display = "none";
        } else if (isTorSecurityIssue) {
            let warningHeaderNode = document.getElementById("natsumi-compat-warning-header");
            warningHeaderNode.textContent = `Using Natsumi on ${displayBrowserName} is not recommended`;
            let warningBodyNode = document.getElementById("natsumi-compat-warning-body-1");
            warningBodyNode.textContent = `The Tor Project recommends against installing plugins onto Tor Browser, which ${displayBrowserName} is based on. You can continue to use Natsumi with this browser, but you acknowledge the risks of doing so.`;
            let warningBodyNode2 = document.getElementById("natsumi-compat-warning-body-2");
            warningBodyNode2.textContent = "Natsumi is provided \"as is\" without warranty of any kind. You assume all responsibility for issues caused by using Natsumi with this browser. The Natsumi Browser project is not affiliated with Tor Project in any way.";
            let warningRestartNode = document.getElementById("natsumi-compat-warning-restart");
            warningRestartNode.addEventListener("click", () => {
                ucApi.Prefs.set("natsumi.browser.ignore-security-notice", true);
                // Restart browser
                Services.startup.quit(
                    Ci.nsIAppStartup.eRestart | Ci.nsIAppStartup.eAttemptQuit
                );
            });
        }
    } catch (e) {
        console.error("Failed to set compatibility warning text:", e);
    }
}

const welcomeAudioUrl = "chrome://natsumi/content/sounds/welcome.ogg";

let welcomeViewed = false;
let tabStyleReset = false;
if (ucApi.Prefs.get("natsumi.welcome.viewed").exists()) {
    welcomeViewed = ucApi.Prefs.get("natsumi.welcome.viewed").value;
}

// Errors (blocks onboarding)
let browserName = AppConstants.MOZ_APP_NAME.toLowerCase();
const altBrowserName = AppConstants.MOZ_APP_DISPLAYNAME_DO_NOT_USE.toLowerCase();

if (altBrowserName === "tor browser") {
    browserName = "torbrowser";
}

let blockOnboarding = false;
const torBrowsers = ["torbrowser", "mullvadbrowser"];

if (ucApi.Prefs.get("toolkit.legacyUserProfileCustomizations.stylesheets").exists()) {
    blockOnboarding = !ucApi.Prefs.get("toolkit.legacyUserProfileCustomizations.stylesheets").value;
}
if (torBrowsers.includes(browserName)) {
    let ignoreTorWarning = false;
    if (ucApi.Prefs.get("natsumi.browser.ignore-security-notice").exists()) {
        ignoreTorWarning = ucApi.Prefs.get("natsumi.browser.ignore-security-notice").value;
    }

    if (!ignoreTorWarning) {
        blockOnboarding = true;
    }
}

if (!welcomeViewed && !blockOnboarding) {
    // Set up welcomer
    setupWelcome();
    createLayoutPane();
    createColorsPane();
    createThemesPane();
    createTabsPane();
    createIconsPane();
    createURLbarPane();

    // Play welcome audio
    let audio = new Audio(welcomeAudioUrl);
    audio.load();
    audio.volume = 0.2;
    audio.play().catch((error) => {
        console.warn("Failed to play audio:", error);
    });

    // Start welcomer
    waitForAudioLoad(audio).then(() => {
        natsumiWelcomeObject.start();
    }).catch((error) => {
        console.warn("Audio failed to load:", error);
        natsumiWelcomeObject.start();
    });

    // Add event handler for next button
    let nextButton = document.getElementById("natsumi-welcome-button-next");
    nextButton.addEventListener("click", handleNextButton);

    // Set tab style if needed
    let isFloorp = false;
    if (ucApi.Prefs.get("natsumi.browser.type").exists) {
        isFloorp = ucApi.Prefs.get("natsumi.browser.type").value === "floorp";
    }

    if (isFloorp) {
        tabStyleReset = resetTabStyleIfNeeded();
    }
}

// Show compatibility warning on unsupported browsers
const potentialIssueBrowsers = [
    "zen", // Zen Browser (unsupported), reason: see README FAQ
    "torbrowser", // Tor Browser (supported), reason: project recommends against installing plugins
    "mullvadbrowser" // Mullvad Browser (supported), reason: based on Tor Browser, see above
]

try {
    if (potentialIssueBrowsers.includes(browserName)) {
        createCompatibilityWarning();
    }
} catch (e) {
    // Forego compatibility check (for the sake of reliability)
    console.error("Compatibility check failed: ", e);
}
