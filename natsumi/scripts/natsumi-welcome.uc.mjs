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
    constructor(id, title, body) {
        this.id = id;
        this.title = title;
        this.body = body;
    }

    generateNode() {
        return convertToXUL(`
            <div id="${this.id}" class="natsumi-welcome-pane">
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

        document.body.setAttribute("natsumi-welcome", "");
        document.body.appendChild(this.welcomeNode);

        // Add drumroll screens
        let welcomeNode = document.getElementById("natsumi-welcome");
        welcomeNode.appendChild(this.drumRolls);

        // Create welcome audio
        const drumrollAudioUrl = "https://github.com/MX-Linux/mx-sound-theme-borealis/raw/refs/heads/master/Borealis/stereo/K3b_success.ogg";
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

    handleSelection(selectionObject) {
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
            });

            waitForAudioLoad(this.drumrollAudio).then(() => {
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
                    this.handleSelection(selectionObject);
                });
            });
        }
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

    let layoutPane = new NatsumiWelcomePane(
        "natsumi-welcome-layout",
        "Choose your layout",
        `
            <div class="natsumi-welcome-paragraph">
                You can choose between Multiple Toolbars for utility or Single Toolbar for simplicity.
            </div>
            <div class="natsumi-welcome-selection-container">
                ${layoutSelection}
            </div>
        `,
    );

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

function createURLbarPane() {
    // noinspection HtmlUnknownAttribute
    let themesSelection = `
        <div class="natsumi-welcome-selection selected" pref="natsumi.urlbar.do-not-float" type="bool" value="false">
            <div class="natsumi-welcome-selection-label">
                Make the URL bar float
            </div>
        </div>
        <div class="natsumi-welcome-selection" pref="natsumi.urlbar.do-not-float" type="bool" value="true">
            <div class="natsumi-welcome-selection-label">
                Keep the classic URL bar position
            </div>
        </div>
    `

    let themesPane = new NatsumiWelcomePane(
        "natsumi-welcome-urlbar",
        "Make your URL bar float",
        `
            <div class="natsumi-welcome-paragraph">
                You can choose to make your URL bar float or keep its original position.
            </div>
            <div class="natsumi-welcome-selection-container">
                ${themesSelection}
            </div>
        `,
    );

    natsumiWelcomeObject.addPane(themesPane);
}

const welcomeAudioUrl = "https://github.com/MX-Linux/mx-sound-theme-borealis/raw/refs/heads/master/Borealis/stereo/desktop-login.ogg";

let welcomeViewed = false;
let tabStyleReset = false;
if (ucApi.Prefs.get("natsumi.welcome.viewed").exists()) {
    welcomeViewed = ucApi.Prefs.get("natsumi.welcome.viewed").value;
}

if (!welcomeViewed) {
    // Set up welcomer
    setupWelcome();
    createLayoutPane();
    createColorsPane();
    createThemesPane();
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
