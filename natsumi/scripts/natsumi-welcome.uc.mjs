// ==UserScript==
// @include   main
// @loadOrder 11
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
import {NatsumiNotification} from "./notifications.sys.mjs";

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
        this.panes = []
        this.step = -1;
        this.node = null;

        document.body.setAttribute("natsumi-welcome", "");
        document.body.appendChild(this.welcomeNode);
    }

    start() {
        let welcomeNode = document.querySelector("#natsumi-welcome");
        welcomeNode.classList.add("natsumi-welcome-initial-animation");
        this.node = welcomeNode;
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
            document.body.removeAttribute("natsumi-welcome");
            ucApi.Prefs.set("natsumi.welcome.viewed", true);

            // Add to notifications
            let notificationObject = new NatsumiNotification(
                "Welcome to Natsumi!",
                "You can always customize Natsumi to your likings in the preferences page.",
                "chrome://natsumi/content/icons/lucide/party.svg",
                10000
            )
            notificationObject.addToContainer();
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

const audioUrl = "https://github.com/MX-Linux/mx-sound-theme-borealis/raw/refs/heads/master/Borealis/stereo/desktop-login.ogg";

let welcomeViewed = false;
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
    let audio = new Audio(audioUrl);
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
}
