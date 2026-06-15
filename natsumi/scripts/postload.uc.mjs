// ==UserScript==
// @include   main
// @ignorecache
// ==/UserScript==

import * as ucApi from "chrome://userchromejs/content/uc_api.sys.mjs";

function convertToXUL(node) {
    // noinspection JSUnresolvedReference
    return window.MozXULElement.parseXULToFragment(node);
}

class NatsumiPostloadManager {
    constructor() {
        this.hasPostLoad = false;
        this.postLoadTimeout = null;
    }

    init() {
        this.postLoadTimeout = setTimeout(() => {
            this.checkPostLoad();
        }, 1000);
    }

    showPostLoadWarning(isCatastrophic = false) {
        if (document.body.hasAttribute("natsumi-inhibit-postload")) {
            console.log("Inhibiting postload error message.");
            return;
        }

        // Check if we have a recursive browser situation
        const computedStyle = window.getComputedStyle(document.body);
        const recursiveValue = computedStyle.getPropertyValue("--natsumi-recursive-browser");

        let recursiveBrowser = null;

        if (recursiveValue) {
            recursiveBrowser = true;
        }

        if (recursiveBrowser) {
            console.error("why would you do that.");
        } else {
            console.error("Natsumi CSS loading doesn't seem to have completed. Expect absolutely everything to go south from here, good luck.");
        }

        const natsumiWarningPermanentCss = `
            #natsumi-glimpse-launcher, #natsumi-glimpse-chainer-indicator, #natsumi-workspace-indicator, #natsumi-tabs-clearer,
            #natsumi-welcome {
                display: none !important;
            }
        `

        if (isCatastrophic) {
            const permanentStyleElement = document.createElement("style");
            permanentStyleElement.id = "natsumi-postload-warning-permanent-style";
            permanentStyleElement.textContent = natsumiWarningPermanentCss;
            document.head.appendChild(permanentStyleElement);
        }

        // From this point on, we need to check the ignore pref
        if (ucApi.Prefs.get("natsumi.theme.ignore-css-issues").exists()) {
            if (ucApi.Prefs.get("natsumi.theme.ignore-css-issues").value) {
                return;
            }
        }

        let isReallyCatastrophic = false;
        if (isCatastrophic && ucApi.Prefs.get("toolkit.legacyUserProfileCustomizations.stylesheets").exists()) {
            isReallyCatastrophic = ucApi.Prefs.get("toolkit.legacyUserProfileCustomizations.stylesheets").value;
        }

        if (!isReallyCatastrophic) {
            ucApi.Prefs.set("toolkit.legacyUserProfileCustomizations.stylesheets", true);
        }

        const natsumiWarningCss = `
            #PersonalToolbar, #nav-bar-customization-target, #PanelUI-button, #tabbrowser-tabpanels,
            #nora-statusbar, #status-bar, #urlbar, #panel-sidebar-select-box, #notifications-toolbar,
            #sidebar-main, #TabsToolbar-customization-target, #nav-bar-overflow-button, #tabbrowser-tabbox,
            #natsumi-pinned-toolbar, #natsumi-top-toolbar, #natsumi-bottom-toolbar, #nav-bar {
                opacity: 0;
                pointer-events: none !important;
            }
            
            #navigator-toolbox {
                transition: none !important;
                background-color: transparent !important;
                border: none !important;
            }
            
            #natsumi-css-warning {
                position: absolute;
                width: 100vw;
                height: 100vh;
                z-index: 998 !important;
                color: light-dark(black, white);
            
                #natsumi-css-warning-content {
                    flex-direction: column;
                    margin: auto !important;
                    padding: 100px !important;
                    text-align: center;
                    align-items: center;
                
                    #natsumi-css-warning-icon {
                        width: 48px;
                        height: 48px;
                        background-size: 48px;
                        -moz-context-properties: stroke, stroke-opacity !important;
                        stroke: light-dark(black, white);
                        background-image: url("chrome://natsumi/content/icons/lucide/caution.svg");
                        
                        &[restart] {
                            background-image: url("chrome://natsumi/content/icons/lucide/rotate-right.svg");
                        }
                    }
                
                    #natsumi-css-warning-header {
                        font-weight: bold;
                        font-size: x-large;
                        margin-block: 5px;
                    }
                
                    #natsumi-css-warning-body-1, #natsumi-css-warning-body-2 {
                        font-size: small;
                    }
                    
                    #natsumi-css-warning-hide {
                        margin-top: 20px !important;
                    }
                    
                    #natsumi-css-warning-hide, #natsumi-css-warning-restart {
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

        let warningNode = convertToXUL(`
            <div id="natsumi-css-warning">
                <div id="natsumi-css-warning-content">
                    <image id="natsumi-css-warning-icon"></image>
                    <div id="natsumi-css-warning-header">
                        Something went wrong
                    </div>
                    <div id="natsumi-css-warning-body-1"></div>
                    <div id="natsumi-css-warning-body-2"></div>
                    <div id="natsumi-css-warning-hide">
                        Accept the risks and continue
                    </div>
                    <div id="natsumi-css-warning-restart">
                        Restart and clear startup cache
                    </div>
                </div>
            </div>
        `);

        document.body.appendChild(warningNode);

        let warningIcon = document.getElementById("natsumi-css-warning-icon");
        let warningHeader = document.getElementById("natsumi-css-warning-header");
        let warningBody = document.getElementById("natsumi-css-warning-body-1");
        let warningBody2 = document.getElementById("natsumi-css-warning-body-2");
        let hideButton = document.getElementById("natsumi-css-warning-hide");
        let restartButton = document.getElementById("natsumi-css-warning-restart");

        if (isCatastrophic && isReallyCatastrophic) {
            warningBody.textContent = "Your browser could not load Natsumi's CSS properly. A lot of things (possibly everything) may not work as expected.";
            warningBody2.textContent = "Please check if Natsumi has been installed correctly.";
        } else if (isCatastrophic && !isReallyCatastrophic) {
            warningIcon.setAttribute("restart", "");
            warningHeader.textContent = "Restart to use Natsumi";
            warningBody.textContent = "Your browser had custom CSS disabled, so Natsumi enabled it automatically.";
            warningBody2.textContent = "Please restart your browser to use Natsumi.";
        } else {
            warningBody.textContent = "Natsumi's CSS seems to have loaded but doesn't seem to have completed loading. You can ignore this warning, but some things may not work as expected.";
            warningBody2.textContent = "Please check if Natsumi has been installed correctly.";
        }

        if (recursiveBrowser) {
            warningHeader.textContent = "why would you do that";
            warningBody.textContent = "did you seriously open a browser window INSIDE A BROWSER WINDOW??????";
            warningBody2.textContent = "just...close this tab and don't reopen it so you don't mess anything up";
            hideButton.setAttribute("hidden", "");
            restartButton.setAttribute("hidden", "");
        }

        // Set up buttons
        hideButton.addEventListener("click", () => {
            let warningElement = document.getElementById("natsumi-css-warning");
            warningElement.remove();

            let styleElement = document.getElementById("natsumi-postload-warning-style");
            styleElement.remove();

            ucApi.Prefs.set("natsumi.theme.ignore-css-issues", true);
        })
        restartButton.addEventListener("click", () => {
            Services.appinfo.invalidateCachesOnRestart();
            Services.startup.quit(
                Ci.nsIAppStartup.eRestart | Ci.nsIAppStartup.eAttemptQuit
            );
        });
    }

    checkPostLoad() {
        const preLoadValue = window.getComputedStyle(document.body).getPropertyValue("--natsumi-preload-complete");
        const postLoadValue = window.getComputedStyle(document.body).getPropertyValue("--natsumi-postload-complete");
        this.hasPostLoad = postLoadValue === "1";

        if (!this.hasPostLoad) {
            this.showPostLoadWarning(!preLoadValue);
        }
    }
}

if (!document.body.natsumiPostloadManager) {
    document.body.natsumiPostloadManager = new NatsumiPostloadManager();
    document.body.natsumiPostloadManager.init();
}