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
import {getFile} from "./files.sys.mjs";
import {NatsumiNotification} from "./notifications.sys.mjs";
import {resetTabStyleIfNeeded} from "./reset-tab-style.sys.mjs";

let natsumiWelcomeObject = null;
const requiredFirefox = 140;

function convertToXUL(node) {
    // noinspection JSUnresolvedReference
    return window.MozXULElement.parseXULToFragment(node);
}

function waitForAudioLoad(audio) {
    return new Promise((resolve, reject) => {
        const onLoad = () => {
            audio.removeEventListener('canplaythrough', onLoad);
            resolve();
        };
        const onError = (e) => {
            audio.removeEventListener('error', onError);
            reject(e);
        };

        audio.addEventListener('canplaythrough', onLoad);
        audio.addEventListener('error', onError);
    });
}

function waitForAudioPlay(audio) {
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
                    <div id="natsumi-welcome-progress-container">
                        <div id="natsumi-welcome-progress-icon"></div>
                        <div id="natsumi-welcome-progress-bar" hidden=""></div>
                    </div>
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
        this.drumrollAudio.volume = 0.5;
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

        // Add progress node
        let progressContainer = document.getElementById("natsumi-welcome-progress-bar");
        let progressNode = document.createElement("div");
        let progressLabelNode = document.createElement("div");
        progressNode.classList.add("natsumi-welcome-progress");
        progressLabelNode.classList.add("natsumi-welcome-progress-label");
        progressLabelNode.textContent = `${this.panes.length}`;
        progressNode.appendChild(progressLabelNode);
        progressContainer.appendChild(progressNode);
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

            waitForAudioPlay(this.drumrollAudio).then(() => {
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
                    <div id="natsumi-welcome-title">Ready to browse?</div>
                    <div class="natsumi-welcome-paragraph">Natsumi is ready to rock and roll. Have fun browsing!</div>
                    <div class="natsumi-welcome-kawaii"></div>
                </div>
            `);
            let nextButton = this.node.querySelector("#natsumi-welcome-button-next");
            nextButton.textContent = "Let's go!";
            nextButton.setAttribute("natsumi-welcome-complete", "");

            let progressContainer = document.getElementById("natsumi-welcome-progress-bar");
            progressContainer.setAttribute("hidden", "");
        } else {
            paneNode = this.panes[this.step].generateNode();

            let progressContainer = document.getElementById("natsumi-welcome-progress-bar");
            let progressNodes = Array.from(progressContainer.querySelectorAll(".natsumi-welcome-progress"));
            progressContainer.removeAttribute("hidden");

            for (let i = 0; i < progressNodes.length; i++) {
                if (i === this.step) {
                    progressNodes[i].setAttribute("highlighted", "");
                } else if (i < this.step) {
                    progressNodes[i].setAttribute("completed", "");
                }
            }
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
        document.body.removeAttribute("natsumi-welcome");

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
            document.body.removeAttribute("natsumi-welcome-complete");
            document.body.removeAttribute("natsumi-welcome-drumroll-complete");
            document.body.removeAttribute("natsumi-welcome-complete-full");

            // Add to notifications
            let notificationObject = new NatsumiNotification(
                "Welcome to Natsumi!",
                "You can always customize Natsumi to your likings in the preferences page.",
                "chrome://natsumi/content/icons/lucide/party.svg",
                10000
            )
            notificationObject.addButton("Open settings", () => {
                window.openPreferences();
            }, null, true);
            notificationObject.addToContainer();

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

class NatsumiBaseStartupAnimation {
    constructor() {
        this.startupNode = convertToXUL(`
            <div id="natsumi-startup">
            </div>
        `);
        this.audio = null;
    }

    init() {
        document.body.appendChild(this.startupNode);
        document.body.setAttribute("natsumi-startup-animation", "");

        // Refetch startup node
        this.startupNode = document.getElementById("natsumi-startup");
    }

    prepareAudio(audioUrl) {
        this.audio = new Audio(audioUrl);
        this.audio.load();
        this.audio.volume = 0.5;
    }

    revealStartup() {
        this.startupNode.setAttribute("natsumi-startup-animation-play", "");
    }

    revealBrowser() {
        document.body.setAttribute("natsumi-startup-animation-reveal", "");
    }

    completeAnimation() {
        document.body.removeAttribute("natsumi-startup-animation");
        document.body.removeAttribute("natsumi-startup-animation-reveal");

        // Destroy startup animation node
        this.startupNode.remove();
    }

    async play() {
        console.error("Animation not implemented");
    }
}

class NatsumiDefaultStartupAnimation extends NatsumiBaseStartupAnimation {
    async play() {
        const quotes = [
            ["when the natsumi is browser", null],
            ["Welcome to your personal internet.", null],
            ["Have you riced your browser today?", null],
            ["nya :3", null],
            ["stay hydrated!!!1", null],
            ["quotes? in my browser???", null],
            ["Eat ice cream for a huge buff.", "@therealconfused"]
        ]

        // Pick a random quote
        const randomQuote = quotes[Math.floor(Math.random() * quotes.length)];
        const quoteText = randomQuote[0];
        const quoteAuthor = randomQuote[1];

        // Add icon
        let iconContainer = document.createElement("div");
        iconContainer.id = "natsumi-startup-icon";
        this.startupNode.appendChild(iconContainer);

        // Add quote
        let quoteContainer = document.createElement("div");
        quoteContainer.id = "natsumi-startup-quote";
        this.startupNode.appendChild(quoteContainer);

        let quoteTextContainer = document.createElement("div");
        quoteTextContainer.id = "natsumi-startup-quote-text";
        quoteTextContainer.textContent = quoteText;
        quoteContainer.appendChild(quoteTextContainer);

        if (quoteAuthor) {
            let quoteAuthorContainer = document.createElement("div");
            quoteAuthorContainer.id = "natsumi-startup-quote-author";
            quoteAuthorContainer.textContent = `- ${quoteAuthor}`;
            quoteContainer.appendChild(quoteAuthorContainer);
        }

        this.audio.addEventListener("play", () => {console.log("play", Date.now())});
        this.audio.addEventListener("playing", () => {console.log("playing", Date.now())});

        // Play startup sound
        if (this.audio) {
            let audioPromise = waitForAudioPlay(this.audio);
            try {
                await this.audio.play();
                await audioPromise;
            } catch(e) {
                console.error("Failed to play startup audio:", e);
            }
        }

        console.log("start", Date.now());

        this.revealStartup();

        setTimeout(() => {
            this.revealBrowser();
        }, 1000);

        setTimeout(() => {
            this.completeAnimation();
        }, 1200);
    }
}

class NatsumiXPStartupAnimation extends NatsumiBaseStartupAnimation {
    async playAudio() {
        if (!this.audio) {
            return;
        }

        let audioPromise = waitForAudioPlay(this.audio);

        try {
            await this.audio.play();
            await audioPromise;
        } catch(e) {
            console.error("Failed to play startup audio:", e);
        }

        this.startupNode.setAttribute("natsumi-startup-xp-welcome", "");

        setTimeout(() => {
            this.completeAnimation();
        }, 2000);
    }

    async play() {
        this.startupNode.setAttribute("natsumi-startup-xp", "");

        // Add logo container
        let xpLogoContainer = document.createElement("div");
        xpLogoContainer.id = "natsumi-startup-xp-logo";
        this.startupNode.appendChild(xpLogoContainer);

        // Add icon
        let iconContainer = document.createElement("div");
        iconContainer.id = "natsumi-startup-xp-icon";
        xpLogoContainer.appendChild(iconContainer);

        // Add text
        let xpTextContainer = document.createElement("div");
        xpTextContainer.id = "natsumi-startup-xp-text-container";
        xpLogoContainer.appendChild(xpTextContainer);

        let text1 = document.createElement("div");
        text1.id = "natsumi-startup-xp-text-1";
        text1.textContent = "Natsumi";
        xpTextContainer.appendChild(text1);

        let text2 = document.createElement("div");
        text2.id = "natsumi-startup-xp-text-2";
        text2.textContent = "browser";
        xpTextContainer.appendChild(text2);

        // Add loading bar
        let loadingBar = document.createElement("div");
        loadingBar.id = "natsumi-startup-xp-loading";
        this.startupNode.appendChild(loadingBar);

        // Create welcome container
        let welcomeContainer = document.createElement("div");
        welcomeContainer.id = "natsumi-startup-xp-welcome";
        this.startupNode.appendChild(welcomeContainer);

        let welcomeText = document.createElement("div");
        welcomeText.id = "natsumi-startup-xp-welcome-text";
        welcomeText.textContent = "welcome";
        welcomeContainer.appendChild(welcomeText);

        this.revealStartup();

        // Play startup sound
        setTimeout(() => {
            this.playAudio()
        }, 6000);
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
                Acorn
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
    `

    let themesPane = new NatsumiWelcomePane(
        "natsumi-welcome-tabs",
        "Fresh look for your tabs",
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
        "Floating or not floating?",
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

function isOutdated() {
    let browserName = AppConstants.MOZ_APP_BASENAME;
    let browserVersion = Services.appinfo.platformVersion ?? Services.appinfo.version;

    if (browserName.toLowerCase() === "glide") {
        browserVersion = AppConstants.GLIDE_FIREFOX_VERSION;
    }

    const majorVersion = parseInt(browserVersion.split(".")[0]);

    return majorVersion < requiredFirefox;
}

function createCompatibilityWarning() {
    // This function is only to be used if the browser is INTENTIONALLY made incompatible, has security issues or
    // uses an unsupported version of Firefox

    const unsupportedBrowsers = [
        "zen"
    ]
    const torSecurityBrowsers = ["torbrowser", "mullvadbrowser"];

    let mainBrowserName = AppConstants.MOZ_APP_NAME.toLowerCase();
    let displayBrowserName = AppConstants.MOZ_APP_NAME;
    let browserName = AppConstants.MOZ_APP_BASENAME;
    const altBrowserName = AppConstants.MOZ_APP_DISPLAYNAME_DO_NOT_USE.toLowerCase();
    let browserVersion = Services.appinfo.platformVersion ?? Services.appinfo.version;

    if (altBrowserName === "tor browser") {
        mainBrowserName = "torbrowser";
        displayBrowserName = AppConstants.MOZ_APP_DISPLAYNAME_DO_NOT_USE;
    } else if (mainBrowserName === "mullvadbrowser") {
        displayBrowserName = AppConstants.MOZ_APP_DISPLAYNAME_DO_NOT_USE;
    }

    if (browserName.toLowerCase() === "glide") {
        browserVersion = AppConstants.GLIDE_FIREFOX_VERSION;
    }

    const majorVersion = parseInt(browserVersion.split(".")[0]);

    console.log(`On Firefox ${majorVersion}`)

    const isUnsupported = unsupportedBrowsers.includes(mainBrowserName);
    const isOutdated = majorVersion < requiredFirefox;
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
        } else if (isOutdated) {
            let warningHeaderNode = document.getElementById("natsumi-compat-warning-header");
            warningHeaderNode.textContent = "Your browser is outdated";
            let warningBodyNode = document.getElementById("natsumi-compat-warning-body-1");
            warningBodyNode.textContent = `You're currently on Firefox ${browserVersion}. Natsumi requires Firefox ${requiredFirefox}.`;
            let warningBodyNode2 = document.getElementById("natsumi-compat-warning-body-2");
            warningBodyNode2.textContent = "Please update your browser or uninstall Natsumi.";
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

function setupInitialConfig() {
    document.body.setAttribute("natsumi-inhibit-postload", "true");

    const natsumiWarningPermanentCss = `
        #natsumi-glimpse-launcher, #natsumi-glimpse-chainer-indicator, #natsumi-workspace-indicator, #natsumi-tabs-clearer,
        #natsumi-welcome {
            display: none !important;
        }
    `

    const permanentStyleElement = document.createElement("style");
    permanentStyleElement.id = "natsumi-initial-config-permanent-style";
    permanentStyleElement.textContent = natsumiWarningPermanentCss;
    document.head.appendChild(permanentStyleElement);

    const natsumiWarningCss = `
        @keyframes natsumi-loading {
            from {
                transform: rotate(0deg);
            }
    
            to {
                transform: rotate(360deg);
            }
        }

        #PersonalToolbar, #nav-bar-customization-target, #PanelUI-button, #tabbrowser-tabpanels,
        #nora-statusbar, #status-bar, #urlbar, #panel-sidebar-select-box, #notifications-toolbar,
        #sidebar-main, #TabsToolbar-customization-target, #nav-bar-overflow-button, #tabbrowser-tabbox,
        #natsumi-pinned-toolbar, #nav-bar, #sidebar-container {
            opacity: 0;
            pointer-events: none !important;
        }
        
        #navigator-toolbox {
            transition: none !important;
            background-color: transparent !important;
            border: none !important;
        }
        
        #natsumi-init-config {
            position: absolute;
            width: 100vw;
            height: 100vh;
            z-index: 998 !important;
        
            #natsumi-init-config-content {
                flex-direction: column;
                margin: auto !important;
                padding: 100px !important;
                text-align: center;
                align-items: center;
            
                #natsumi-init-config-icon {
                    width: 48px;
                    height: 48px;
                    background-size: 48px;
                    -moz-context-properties: stroke, stroke-opacity !important;
                    stroke: light-dark(black, white);
                    background-image: url("chrome://natsumi/content/icons/lucide/loading.svg");
                    animation: natsumi-loading 1s linear infinite;
                }
            
                #natsumi-init-config-header {
                    font-weight: bold;
                    font-size: x-large;
                    margin-block: 5px;
                }
            
                #natsumi-init-config-body-1, #natsumi-init-config-body-2 {
                    font-size: small;
                }
                
                #natsumi-init-config-hide {
                    margin-top: 20px !important;
                }
                
                #natsumi-init-config-hide, #natsumi-init-config-restart {
                    margin-top: 10px;
                    font-size: small;
                    padding: 5px;
                    border-radius: 5px;
                    background-color: light-dark(rgba(0, 0, 0, 0.1), rgba(255, 255, 255, 0.1));
                    
                    &:hover {
                        background-color: light-dark(rgba(0, 0, 0, 0.2), rgba(255, 255, 255, 0.2));
                    }
                }
            }
        }
    `

    const styleElement = document.createElement("style");
    styleElement.id = "natsumi-postload-warning-style";
    styleElement.textContent = natsumiWarningCss;
    document.head.appendChild(styleElement);

    let initConfigNode = convertToXUL(`
            <div id="natsumi-init-config">
                <div id="natsumi-init-config-content">
                    <image id="natsumi-init-config-icon"></image>
                    <div id="natsumi-init-config-header">
                        Configuring your browser
                    </div>
                    <div id="natsumi-init-config-body-1">We're configuring your browser to get Natsumi set up and working.</div>
                    <div id="natsumi-init-config-body-2">Your browser will restart automatically once ready.</div>
                </div>
            </div>
        `);

    document.body.appendChild(initConfigNode);

    // Configure browser
    ucApi.Prefs.set("toolkit.legacyUserProfileCustomizations.stylesheets", true);
    ucApi.Prefs.set("userChromeJS.persistent_domcontent_callback", true);

    // Restart and clear cache
    Services.appinfo.invalidateCachesOnRestart();
    Services.startup.quit(
        Ci.nsIAppStartup.eRestart | Ci.nsIAppStartup.eAttemptQuit
    );
}

async function runStartupAnimation() {
    const startupAnimations = {
        "simple": new NatsumiDefaultStartupAnimation(),
        "nostalgic": new NatsumiXPStartupAnimation()
    };
    const startupSounds = {
        "default": null,
        "borealis": "chrome://natsumi/content/sounds/startup.ogg"
    }

    let startupAnimation = "default";
    if (ucApi.Prefs.get("natsumi.startup.type").exists()) {
        startupAnimation = ucApi.Prefs.get("natsumi.startup.type").value;
    }

    if (!startupAnimation in startupAnimations) {
        return;
    }

    let startupSound = "default";
    if (ucApi.Prefs.get("natsumi.startup.sound").exists()) {
        startupSound = ucApi.Prefs.get("natsumi.startup.sound").value;
    }

    if (!startupSound in startupSounds && startupSound !== "custom") {
        startupSound = "default";
    }

    let startupSoundUrl = null;

    // Get sound URL
    if (startupSound === "custom" && ucApi.Prefs.get("natsumi.startup.custom-sound-id").exists()) {
        try {
            const startupSoundFile = await getFile(ucApi.Prefs.get("natsumi.startup.custom-sound-id").value);
            startupSoundUrl = startupSoundFile.data;
        } catch(e) {
            console.error("Failed to get sound file:", e);
        }
    } else {
        startupSoundUrl = startupSounds[startupSound];
    }

    const startupAnimationObject = startupAnimations[startupAnimation];
    startupAnimationObject.init();

    // Load sound
    startupAnimationObject.prepareAudio(startupSoundUrl);

    // Start with a slight delay to allow window to load into view
    setTimeout(() => {
        startupAnimationObject.play().catch((error) => {
            console.error("Startup animation failed to play:", error);
        });
    }, 100);
}

const welcomeAudioUrl = "chrome://natsumi/content/sounds/welcome.ogg";

let welcomeViewed = false;
let tabStyleReset = false;
if (ucApi.Prefs.get("natsumi.welcome.viewed").exists()) {
    welcomeViewed = ucApi.Prefs.get("natsumi.welcome.viewed").value;
}

// Check if the window is an actual browser window
const isBrowser = (document.documentElement.getAttribute("chromehidden") ?? "") === "";

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

const cssEnabled = ucApi.Prefs.get("toolkit.legacyUserProfileCustomizations.stylesheets").value;

let earlyBlockProgress = false;
let settingsEnabled = false;
if (ucApi.Prefs.get("userChromeJS.persistent_domcontent_callback").exists()) {
    settingsEnabled = ucApi.Prefs.get("userChromeJS.persistent_domcontent_callback").value;
}

if (!cssEnabled || !settingsEnabled) {
    console.log("Configuring browser...");
    setupInitialConfig();
    earlyBlockProgress = true;
} else if (!welcomeViewed && !blockOnboarding && isBrowser) {
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
    audio.volume = 0.5;

    audio.addEventListener("play", () => {console.log("play", Date.now())});
    audio.addEventListener("playing", () => {console.log("playing", Date.now())});

    // Start welcomer
    waitForAudioPlay(audio).then(() => {
        console.log("start", Date.now());
        natsumiWelcomeObject.start();
    }).catch((error) => {
        console.warn("Failed to play audio:", error);
        natsumiWelcomeObject.start();
    });
    waitForAudioLoad(audio).then(() => {
        audio.play();
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

    earlyBlockProgress = true;
}

// Show compatibility warning on unsupported browsers
const potentialIssueBrowsers = [
    "zen", // Zen Browser (unsupported), reason: see README FAQ
    "torbrowser", // Tor Browser (supported), reason: project recommends against installing plugins
    "mullvadbrowser" // Mullvad Browser (supported), reason: based on Tor Browser, see above
];
const blockProgress = potentialIssueBrowsers.includes(browserName) || isOutdated();

try {
    if (blockProgress) {
        createCompatibilityWarning();
    }
} catch (e) {
    // Forego compatibility check (for the sake of reliability)
    console.error("Compatibility check failed: ", e);
}

// Play startup animation
let startupEnabled = false;
if (ucApi.Prefs.get("natsumi.startup.type").exists()) {
    startupEnabled = ucApi.Prefs.get("natsumi.startup.tyoe").value !== "default";
}

if (!blockProgress && !earlyBlockProgress && startupEnabled && isBrowser) {
    runStartupAnimation().catch((error) => {
        console.error("Failed to run startup animation:", error);
    });
}
