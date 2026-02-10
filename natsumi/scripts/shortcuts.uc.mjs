// ==UserScript==
// @include   main
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

import * as ucApi from "chrome://userchromejs/content/uc_api.sys.mjs";
import {NatsumiShortcutActions} from "./shortcut-actions.sys.mjs";

export class NatsumiKeyboardShortcut {
    constructor(meta, ctrl, alt, shift, key, shortcutMode, convertForMac) {
        this.meta = meta; // Meta key (Command on macOS, Windows key on Windows)
        this.ctrl = ctrl; // Ctrl key
        this.alt = alt; // Alt key (aka "Option" on macOS)
        this.shift = shift; // Key pressed, can be function key or character
        this.shortcutMode = shortcutMode; // Indicates the shortcut mode, influences browserWins and requireDoublePress
        this.browserWins = false; // If browserWins is true, Natsumi will cancel out other shortcuts
        this.requireDoublePress = false // If requireDoublePress is true, this shortcut will only run when pressed twice
        this.nativeHandle = false; // If nativeHandle is true, command handling will be done by Firefox, not Natsumi
        this.convertForMac = convertForMac; // If true, the macOS converter will make the shortcut use Command instead of Ctrl
        this.customized = false; // If true, the macOS converter won't convert this
        this.unregistered = false; // If true, this shortcut will be ignored
        this.isNativeShortcut = false; // If true, this is a native Firefox shortcut
        this.key = key.toLowerCase();

        // Remove VK prefix from key
        if (this.key.startsWith("vk_")) {
            this.key = this.key.slice(3);
        }

        // Preserve original shortcut combo
        this.originalCombo = {
            "meta": this.meta,
            "ctrl": this.ctrl,
            "alt": this.alt,
            "shift": this.shift,
            "key": this.key,
            "shortcutMode": this.shortcutMode
        }

        // Set shortcut mode
        this.setShortcutMode(shortcutMode);
    }

    hasCustomKeybinds() {
        return !(
            this.meta === this.originalCombo.meta &&
            this.ctrl === this.originalCombo.ctrl &&
            this.alt === this.originalCombo.alt &&
            this.shift === this.originalCombo.shift &&
            this.key === this.originalCombo.key
        )
    }

    setShortcutKeybind(meta, ctrl, alt, shift, key) {
        this.meta = meta;
        this.ctrl = ctrl;
        this.alt = alt;
        this.shift = shift;
        this.key = key.toLowerCase();

        // Remove VK prefix from key if it exists
        if (this.key.startsWith("vk_")) {
            this.key = this.key.slice(3);
        }

        this.customized = true;
    }

    setShortcutMode(shortcutMode) {
        if (shortcutMode < 0 || shortcutMode > 3) {
            return;
        }

        this.shortcutMode = shortcutMode;

        if (this.shortcutMode === 0) {
            // Natsumi has priority
            this.browserWins = true;
            this.requireDoublePress = false;
            this.nativeHandle = false;
        } else if (this.shortcutMode === 1) {
            // Double press required for Natsumi's shortcut
            this.browserWins = false;
            this.requireDoublePress = true;
            this.nativeHandle = false;
        } else if (this.shortcutMode === 2) {
            // Conflicting shortcuts can all run
            this.browserWins = false;
            this.requireDoublePress = false;
            this.nativeHandle = false;
        } else {
            // Firefox handles the shortcut/Website has priority
            this.browserWins = false;
            this.requireDoublePress = false;
            this.nativeHandle = true;
        }
    }

    resetShortcut() {
        this.meta = this.originalCombo.meta;
        this.ctrl = this.originalCombo.ctrl;
        this.alt = this.originalCombo.alt;
        this.shift = this.originalCombo.shift;
        this.key = this.originalCombo.key;
        this.setShortcutMode(this.originalCombo.shortcutMode);
        this.customized = false;
    }
}

class NatsumiNativeKeyboardShortcut extends NatsumiKeyboardShortcut {
    constructor(meta, ctrl, alt, shift, key, command, isDevSet, interceptedBy = null) {
        super(meta, ctrl, alt, shift, key, 3, false);
        this.command = command; // The command that this shortcut triggers
        this.isDevSet = isDevSet; // If true, this shortcut is part of the developer toolbox shortcuts
        this.isNativeShortcut = true;
        this.interceptedBy = interceptedBy; // If set, a Natsumi shortcut can intercept this native shortcut
    }

    static fromShortcutElement(shortcutElement) {
        // Extract shortcut key
        let key;

        if (shortcutElement.hasAttribute("key")) {
            // Regular key
            key = shortcutElement.getAttribute("key").toLowerCase();
        } else if (shortcutElement.hasAttribute("keycode")) {
            // Likely uses function keys, so remove the "VK_" prefix
            key = shortcutElement.getAttribute("keycode").toLowerCase().replace("vk_", "");
        } else {
            return null; // No key or keycode attribute found
        }

        if (shortcutElement.getAttribute("internal") === "true" && shortcutElement.getAttribute("reserved") === "true") {
            return null; // This is an internal and reserved shortcut, so we should not touch this
        }

        // Extract modifier keys
        let meta = false;
        let ctrl = false;
        let alt = false;
        let shift = false;

        if (shortcutElement.hasAttribute("modifiers")) {
            // Firefox uses "accel" for Meta and Ctrl, but still has "control" for Ctrl
            // On Windows accel = Ctrl, everywhere else accel = Meta
            const osName = Services.appinfo.OS.toLowerCase();
            if (osName === "darwin") {
                meta = shortcutElement.getAttribute("modifiers").includes("accel");
                ctrl = shortcutElement.getAttribute("modifiers").includes("control");
            } else {
                ctrl = shortcutElement.getAttribute("modifiers").includes("accel") || shortcutElement.getAttribute("modifiers").includes("control");
            }

            // Other modifiers
            alt = shortcutElement.getAttribute("modifiers").includes("alt");
            shift = shortcutElement.getAttribute("modifiers").includes("shift");
        }

        // Determine if this shortcut is part of the developer toolbox commands
        const isDevSet = shortcutElement.parentElement && shortcutElement.parentElement.id === "devtoolsKeyset";

        // Return Natsumi native keyboard shortcut object
        return new NatsumiNativeKeyboardShortcut(meta, ctrl, alt, shift, key, shortcutElement.id, isDevSet);
    }
}

class NatsumiKBSManager {
    constructor() {
        this.initialized = false;
        this.waitingForDev = false;
        this.initWhenDevIsReady = true;
        this.ignoreShortcuts = false;
        this.ignoreTimeout = null;
        this.ignoreHandler = null;
        this.filePath = PathUtils.join(PathUtils.profileDir, "natsumi-shortcuts.json");

        // Shortcuts
        this.shortcuts = {
            "copyCurrentUrl": new NatsumiKeyboardShortcut(false, true, false, true, "c", 0, true),
            "toggleBrowserLayout": new NatsumiKeyboardShortcut(false, true, true, false, "l", 0, true),
            "toggleVerticalTabs": new NatsumiKeyboardShortcut(false, true, true, false, "v", 0, true),
            "toggleCompactMode": new NatsumiKeyboardShortcut(false, true, false, true, "s", 0, true),
            "toggleCompactSidebar": new NatsumiKeyboardShortcut(false, true, true, true, "s", 0, true),
            "toggleCompactNavbar": new NatsumiKeyboardShortcut(false, true, true, true, "t", 0, true),
            "closeGlimpse": new NatsumiKeyboardShortcut(false, false, true, true, "w", 3, false),
            "graduateGlimpse": new NatsumiKeyboardShortcut(false, false, true, true, "f", 3, false),
            "openGlimpseLauncher": new NatsumiKeyboardShortcut(false, true, true, false, "n", 0, true),
            "cycleGlimpse": new NatsumiKeyboardShortcut(false, true, false, true, ".", 0, true),
            "cycleGlimpseReverse": new NatsumiKeyboardShortcut(false, true, false, true, ",", 0, true),
            "toggleGlimpseChain": new NatsumiKeyboardShortcut(false, true, true, false, "c", 0, true),
            "initiateGlimpseChain": new NatsumiKeyboardShortcut(false, true, true, true, "g", 0, true),
            "natsumiNewTab": new NatsumiKeyboardShortcut(false, true, false, false, "t", 3, true),
            "natsumiClearUnpinnedTabs": new NatsumiKeyboardShortcut(false, true, true, false, "w", 0, true),
            "natsumiSplitTabs": new NatsumiKeyboardShortcut(false, true, true, false, "g", 0, true),
            "natsumiUnsplitTabs": new NatsumiKeyboardShortcut(false, true, true, false, "u", 0, true),
            "natsumiSelectTab1": new NatsumiKeyboardShortcut(false, true, false, false, "1", 3, true),
            "natsumiSelectTab2": new NatsumiKeyboardShortcut(false, true, false, false, "2", 3, true),
            "natsumiSelectTab3": new NatsumiKeyboardShortcut(false, true, false, false, "3", 3, true),
            "natsumiSelectTab4": new NatsumiKeyboardShortcut(false, true, false, false, "4", 3, true),
            "natsumiSelectTab5": new NatsumiKeyboardShortcut(false, true, false, false, "5", 3, true),
            "natsumiSelectTab6": new NatsumiKeyboardShortcut(false, true, false, false, "6", 3, true),
            "natsumiSelectTab7": new NatsumiKeyboardShortcut(false, true, false, false, "7", 3, true),
            "natsumiSelectTab8": new NatsumiKeyboardShortcut(false, true, false, false, "8", 3, true),
            "natsumiSelectTabLast": new NatsumiKeyboardShortcut(false, true, false, false, "9", 3, true)
        };
        this.shortcutActions = {
            "copyCurrentUrl": NatsumiShortcutActions.copyCurrentUrl,
            "toggleBrowserLayout": NatsumiShortcutActions.toggleBrowserLayout,
            "toggleVerticalTabs": NatsumiShortcutActions.toggleVerticalTabs,
            "toggleCompactMode": NatsumiShortcutActions.toggleCompactMode,
            "toggleCompactSidebar": NatsumiShortcutActions.toggleCompactSidebar,
            "toggleCompactNavbar": NatsumiShortcutActions.toggleCompactNavbar,
            "closeGlimpse": NatsumiShortcutActions.closeGlimpse,
            "graduateGlimpse": NatsumiShortcutActions.graduateGlimpse,
            "openGlimpseLauncher": NatsumiShortcutActions.openGlimpseLauncher,
            "cycleGlimpse": NatsumiShortcutActions.cycleGlimpse,
            "cycleGlimpseReverse": () => {NatsumiShortcutActions.cycleGlimpse(false)},
            "toggleGlimpseChain": NatsumiShortcutActions.toggleGlimpseChain,
            "initiateGlimpseChain": NatsumiShortcutActions.releaseGlimpseChain,
            "natsumiNewTab": NatsumiShortcutActions.openNewTab,
            "natsumiClearUnpinnedTabs": NatsumiShortcutActions.clearUnpinnedTabs,
            "natsumiSplitTabs": NatsumiShortcutActions.splitTabs,
            "natsumiUnsplitTabs": NatsumiShortcutActions.unsplitTabs,
            "natsumiSelectTab1": () => {NatsumiShortcutActions.selectTab(0)},
            "natsumiSelectTab2": () => {NatsumiShortcutActions.selectTab(1)},
            "natsumiSelectTab3": () => {NatsumiShortcutActions.selectTab(2)},
            "natsumiSelectTab4": () => {NatsumiShortcutActions.selectTab(3)},
            "natsumiSelectTab5": () => {NatsumiShortcutActions.selectTab(4)},
            "natsumiSelectTab6": () => {NatsumiShortcutActions.selectTab(5)},
            "natsumiSelectTab7": () => {NatsumiShortcutActions.selectTab(6)},
            "natsumiSelectTab8": () => {NatsumiShortcutActions.selectTab(7)},
            "natsumiSelectTabLast": () => {NatsumiShortcutActions.selectTab(8)}
        };
        this.shortcutsPending = {};
        this.shortcutCustomizationData = {};
        this.baseCustomizations = {
            "key_inspector": {
                "customKeybinds": true,
                "meta": Services.appinfo.OS.toLowerCase() === "darwin",
                "ctrl": Services.appinfo.OS.toLowerCase() !== "darwin",
                "alt": true,
                "shift": true,
                "key": "x",
                "unregistered": false,
                "shortcutMode": 3
            },
            "key_inspectorMac": {
                "customKeybinds": true,
                "meta": true,
                "ctrl": true,
                "alt": false,
                "shift": true,
                "key": "x",
                "unregistered": false,
                "shortcutMode": 3
            },
            "key_dom": {
                "customKeybinds": true,
                "meta": Services.appinfo.OS.toLowerCase() === "darwin",
                "ctrl": Services.appinfo.OS.toLowerCase() !== "darwin",
                "alt": true,
                "shift": true,
                "key": "w",
                "unregistered": false,
                "shortcutMode": 3
            },
            "key_screenshot": {
                "customKeybinds": true,
                "meta": Services.appinfo.OS.toLowerCase() === "darwin",
                "ctrl": Services.appinfo.OS.toLowerCase() !== "darwin",
                "alt": true,
                "shift": true,
                "key": "c",
                "unregistered": false,
                "shortcutMode": 3
            },
            "key_viewSourceSafari": {
                "customKeybinds": true,
                "meta": Services.appinfo.OS.toLowerCase() === "darwin",
                "ctrl": Services.appinfo.OS.toLowerCase() !== "darwin",
                "alt": true,
                "shift": true,
                "key": "u",
                "unregistered": false,
                "shortcutMode": 3
            }
        }
        this.interceptions = {
            "key_newNavigatorTab": "natsumiNewTab",
            "key_selectTab1": "natsumiSelectTab1",
            "key_selectTab2": "natsumiSelectTab2",
            "key_selectTab3": "natsumiSelectTab3",
            "key_selectTab4": "natsumiSelectTab4",
            "key_selectTab5": "natsumiSelectTab5",
            "key_selectTab6": "natsumiSelectTab6",
            "key_selectTab7": "natsumiSelectTab7",
            "key_selectTab8": "natsumiSelectTab8",
            "key_selectLastTab": "natsumiSelectTabLast"
        }

        // Add browser-specific shortcuts
        let browserType = "firefox";
        if (ucApi.Prefs.get("natsumi.browser.type").exists) {
            browserType = ucApi.Prefs.get("natsumi.browser.type").value;
        }

        if (browserType === "floorp") {
            this.shortcuts["cycleWorkspaces"] = new NatsumiKeyboardShortcut(false, true, true, false, "right", 3, false);
            this.shortcuts["cycleWorkspacesReverse"] = new NatsumiKeyboardShortcut(false, true, true, false, "left", 3, false);
            this.shortcutActions["cycleWorkspaces"] = NatsumiShortcutActions.cycleWorkspaces;
            this.shortcutActions["cycleWorkspacesReverse"] = () => { NatsumiShortcutActions.cycleWorkspaces(true); };
        }

        // Add native shortcuts
        let nativeShortcuts = document.getElementById("mainKeyset").children;
        for (let i = 0; i < nativeShortcuts.length; i++) {
            let nativeShortcut = nativeShortcuts[i];

            if (nativeShortcut.hasAttribute("disabled")) {
                continue;
            }

            // Check if an ID exists to the shortcut, if not, skip it
            if (!nativeShortcut.id) {
                continue;
            }

            let nativeNatsumiShortcut = NatsumiNativeKeyboardShortcut.fromShortcutElement(nativeShortcut);
            if (nativeNatsumiShortcut) {
                this.shortcuts[nativeShortcut.id] = nativeNatsumiShortcut;
            }
        }

        // Add developer toolbox shortcuts
        let devKeyset = document.getElementById("devtoolsKeyset");
        if (!devKeyset) {
            this.waitingForDev = true;

            // Wait for developer toolbox to load
            let devToolsObserver = new MutationObserver((mutations, observer) => {
                mutations.forEach((mutation) => {
                    mutation.addedNodes.forEach((node) => {
                        if (node.id === "devtoolsKeyset") {
                            this.waitingForDev = false;
                            this.addDevShortcuts();

                            if (this.initWhenDevIsReady) {
                                this.initWhenDevIsReady = false;
                                this.init();
                            }

                            observer.disconnect();
                        }
                    });
                });
            });

            devToolsObserver.observe(document.body, {childList: true});
        } else {
            this.addDevShortcuts();
        }
    }

    addDevShortcuts() {
        let devShortcuts = document.getElementById("devtoolsKeyset").children;
        for (let i = 0; i < devShortcuts.length; i++) {
            let devShortcut = devShortcuts[i];

            // Check if an ID exists to the shortcut, if not, skip it
            if (!devShortcut.id) {
                return;
            }

            let nativeNatsumiShortcut = NatsumiNativeKeyboardShortcut.fromShortcutElement(devShortcut);
            if (nativeNatsumiShortcut) {
                this.shortcuts[devShortcut.id] = nativeNatsumiShortcut;
            }
        }
    }

    init() {
        if (this.initialized) {
            return;
        }

        if (this.waitingForDev && this.initWhenDevIsReady) {
            console.warn("Developer toolbox keyset not found, Natsumi will initialize its shortcuts manager once the keyset exists.");
            return;
        }

        // Setup Natsumi command handling
        window.document.addEventListener("keydown", this.handleKeyboardShortcuts.bind(this));

        // Add Natsumi shortcuts to Firefox's command handler
        this.setupNativeHandler();

        // Apply shortcut customizations
        this.applyMacShortcuts();
        this.initialApplyCustomShortcuts();

        this.initialized = true;
    }

    createCommandNode(command) {
        let commandNode = document.createXULElement("command");
        commandNode.id = command;
        return commandNode;
    }

    createKeyNode(shortcutName, shortcut) {
        let key = document.createXULElement("key");
        key.id = shortcutName;
        key.setAttribute("command", `NatsumiKBS:${shortcutName}`);

        if (shortcut instanceof NatsumiNativeKeyboardShortcut) {
            key.id = `natsumiCustomized_${shortcutName}`;
            key.setAttribute("command", `NatsumiKBSNative:${shortcutName}`);
        }

        // Set key or keycode
        if (shortcut.key.length === 1) {
            key.setAttribute("key", shortcut.key.toUpperCase());
        } else {
            key.setAttribute("keycode", `VK_${shortcut.key.toUpperCase()}`);
        }

        // Set modifiers
        let modifiers = [];
        if (shortcut.meta) {
            modifiers.push("accel");
        }
        if (shortcut.ctrl) {
            modifiers.push("control");
        }
        if (shortcut.alt) {
            modifiers.push("alt");
        }
        if (shortcut.shift) {
            modifiers.push("shift");
        }
        if (modifiers.length > 0) {
            key.setAttribute("modifiers", modifiers.join(","));
        }

        // Set key
        if (shortcut.key.length === 1) {
            key.setAttribute("key", shortcut.key.toUpperCase());
        } else {
            key.setAttribute("keycode", `VK_${shortcut.key.toUpperCase()}`);
        }

        // Ensure command node exists (if it's a Natsumi/Natsumi Native command)
        let existingCommandNode = document.getElementById(key.getAttribute("command"));
        if (!existingCommandNode) {
            let commandNode = this.createCommandNode(key.getAttribute("command"));
            document.getElementById("mainCommandSet").appendChild(commandNode);
        }

        return key;
    }

    setupNativeHandler() {
        // Get commands set
        let commandSet = document.getElementById("mainCommandSet");

        // Add commands
        for (const shortcutName in this.shortcuts) {
            const shortcut = this.shortcuts[shortcutName];

            // Only add Natsumi's shortcuts
            if (shortcut instanceof NatsumiNativeKeyboardShortcut) {
                continue;
            }

            let command = this.createCommandNode(`NatsumiKBS:${shortcutName}`);
            commandSet.appendChild(command);
        }

        // Reattach command set
        commandSet.parentNode.insertBefore(commandSet, commandSet.nextSibling);

        // Add listener to command set
        commandSet.addEventListener("command", (event) => {
            if (this.ignoreShortcuts) {
                event.preventDefault();
                event.stopPropagation();
                return;
            }

            if (event.target.id.startsWith("NatsumiKBS:")) {
                this.nativeHandleKeyboardShortcuts(event.target.id.replace("NatsumiKBS:", ""));
            } else if (event.target.id.startsWith("NatsumiKBSNative:")) {
                let originalNodeId = event.target.id.replace("NatsumiKBSNative:", "");
                let originalNode = document.getElementById(originalNodeId);
                if (originalNode) {
                    originalNode.doCommand();
                }
            }
        });

        // Get keyset
        let keySet = document.getElementById("mainKeyset");

        // Add keys
        for (const shortcutName in this.shortcuts) {
            const shortcut = this.shortcuts[shortcutName];

            // Only add Natsumi's shortcuts
            if (shortcut instanceof NatsumiNativeKeyboardShortcut) {
                continue;
            }

            let key = this.createKeyNode(shortcutName, shortcut);
            keySet.appendChild(key);
        }

        // Add event listener
        keySet.addEventListener("command", (event) => {
            let commandEvent = new Event("command", {bubbles: true, cancelable: true});
            let targetCommand = document.getElementById(event.target.getAttribute("command"));
            targetCommand.dispatchEvent(commandEvent);
        });

        // Reattach keyset
        keySet.parentNode.insertBefore(keySet, keySet.nextSibling);
    }

    applyMacShortcuts() {
        // Note: this function should ONLY be called if there is no customized shortcuts to apply.
        const osName = Services.appinfo.OS.toLowerCase();

        if (osName !== "darwin") {
            return;
        }

        for (const shortcutName in this.shortcuts) {
            const shortcut = this.shortcuts[shortcutName];

            // Convert Ctrl to Meta for macOS
            if (shortcut.convertForMac && shortcut.ctrl && !shortcut.meta && !shortcut.customized) {
                shortcut.meta = true;
                shortcut.ctrl = false;
            }
        }
    }

    applyCustomShortcuts() {
        /*
        Example shortcut data structure
        {"shortcut1": {
            "customKeybinds": true,
            "meta": true,
            "shift": false,
            "ctrl": false,
            "alt": true,
            "key": "p",
            "unregistered": false,
            "shortcutMode": 0
        }}
        */

        let allShortcutNames = Object.keys(this.shortcutCustomizationData);

        // Get intercepted shortcuts
        for (const nativeShortcutId in this.interceptions) {
            if (!allShortcutNames.includes(nativeShortcutId)) {
                allShortcutNames.push(nativeShortcutId);
            }
        }

        for (const shortcutName of allShortcutNames) {
            // Update shortcut keybind in the native handler
            let shortcutObject = this.shortcuts[shortcutName];
            let keyElement = document.getElementById(shortcutName);

            if (!keyElement) {
                return;
            }

            if (shortcutObject instanceof NatsumiNativeKeyboardShortcut) {
                keyElement = this.createKeyNode(shortcutName, shortcutObject);
                let originalKeyNode = document.getElementById(shortcutName);
                let existingKeyNode = document.getElementById(`natsumiCustomized_${shortcutName}`);

                if (existingKeyNode) {
                    existingKeyNode.replaceWith(keyElement);
                } else {
                    if (shortcutObject.isDevSet) {
                        document.getElementById("devtoolsKeyset").appendChild(keyElement);
                    } else {
                        document.getElementById("mainKeyset").appendChild(keyElement);
                    }
                }

                // Disable shortcut if needed
                // If the shortcut is not set to be handled natively, the native event handlers should be
                // disabled to prevent duplicate execution of shortcut
                if (
                    shortcutObject.unregistered || shortcutObject.shortcutMode === 2 ||
                    shortcutObject.shortcutMode === 0 || shortcutObject.interceptedBy
                ) {
                    keyElement.setAttribute("disabled", "true");
                    originalKeyNode.setAttribute("disabled", "true");

                    if (shortcutObject.interceptedBy) {
                        // Apply custom shortcut to the intercepting Natsumi shortcut
                        let interceptingShortcut = this.shortcuts[shortcutObject.interceptedBy];
                        if (interceptingShortcut) {
                            let interceptingKeyNode = document.getElementById(shortcutObject.interceptedBy);
                            if (interceptingKeyNode) {
                                // Set modifiers
                                let modifiers = [];
                                if (shortcutObject.meta) {
                                    modifiers.push("accel");
                                }
                                if (shortcutObject.ctrl) {
                                    modifiers.push("control");
                                }
                                if (shortcutObject.alt) {
                                    modifiers.push("alt");
                                }
                                if (shortcutObject.shift) {
                                    modifiers.push("shift");
                                }
                                if (modifiers.length > 0) {
                                    interceptingKeyNode.setAttribute("modifiers", modifiers.join(","));
                                } else {
                                    interceptingKeyNode.removeAttribute("modifiers");
                                }

                                // Set key or keycode
                                if (shortcutObject.key.length === 1) {
                                    interceptingKeyNode.setAttribute("key", shortcutObject.key.toUpperCase());
                                } else if (shortcutObject.key.length > 1) {
                                    interceptingKeyNode.setAttribute("keycode", `VK_${shortcutObject.key.toUpperCase()}`);
                                }

                                // Disable intercepting shortcut if needed
                                if (
                                    interceptingShortcut.unregistered || interceptingShortcut.shortcutMode === 2 ||
                                    interceptingShortcut.shortcutMode === 0
                                ) {
                                    interceptingKeyNode.setAttribute("disabled", "true");
                                } else {
                                    interceptingKeyNode.removeAttribute("disabled");
                                }
                            }

                            // Apply shortcuts to the intercepting shortcut object
                            interceptingShortcut.setShortcutKeybind(
                                shortcutObject.meta,
                                shortcutObject.ctrl,
                                shortcutObject.alt,
                                shortcutObject.shift,
                                shortcutObject.key
                            );
                            interceptingShortcut.setShortcutMode(shortcutObject.shortcutMode);
                        }
                    }
                } else {
                    keyElement.removeAttribute("disabled");

                    if (shortcutObject.hasCustomKeybinds()) {
                        originalKeyNode.setAttribute("disabled", "true");
                    } else {
                        originalKeyNode.removeAttribute("disabled");
                    }
                }
            } else {
                // Set modifiers
                let modifiers = [];
                if (shortcutObject.meta) {
                    modifiers.push("accel");
                }
                if (shortcutObject.ctrl) {
                    modifiers.push("control");
                }
                if (shortcutObject.alt) {
                    modifiers.push("alt");
                }
                if (shortcutObject.shift) {
                    modifiers.push("shift");
                }
                if (modifiers.length > 0) {
                    keyElement.setAttribute("modifiers", modifiers.join(","));
                } else {
                    keyElement.removeAttribute("modifiers");
                }

                // Set key or keycode
                if (shortcutObject.key.length === 1) {
                    keyElement.setAttribute("key", shortcutObject.key.toUpperCase());
                    keyElement.removeAttribute("keycode");
                } else if (shortcutObject.key.length > 1) {
                    keyElement.setAttribute("keycode", `VK_${shortcutObject.key.toUpperCase()}`);
                    keyElement.removeAttribute("key");
                }

                // Disable shortcut if needed
                // If the shortcut is not set to be handled natively, the native event handlers should be
                // disabled to prevent duplicate execution of shortcut
                if (shortcutObject.unregistered || shortcutObject.shortcutMode === 0 && shortcutObject.shortcutMode === 2) {
                    keyElement.setAttribute("disabled", "true");
                } else {
                    keyElement.removeAttribute("disabled");
                }
            }
        }

        // Apply changes
        let mainKeyset = document.getElementById("mainKeyset");
        let devtoolsKeyset = document.getElementById("devtoolsKeyset");
        mainKeyset.parentNode.insertBefore(mainKeyset, mainKeyset.nextSibling);
        if (devtoolsKeyset) {
            devtoolsKeyset.parentNode.insertBefore(devtoolsKeyset, devtoolsKeyset.nextSibling);
        }
    }

    initialApplyCustomShortcuts() {
        this.getCustomizationData().then(() => {
            this.applyInterceptions();
            this.updateAllShortcuts();
            this.applyCustomShortcuts();
        });
    }

    updateShortcut(shortcut, data, applyShortcuts = true, canSave = true) {
        if (!this.shortcuts[shortcut]) {
            return; // No such shortcut exists
        }

        let shortcutObject = this.shortcuts[shortcut];

        // Update customization entry
        this.shortcutCustomizationData[shortcut] = data;

        // Update shortcuts object
        if (data["customKeybinds"]) {
            shortcutObject.setShortcutKeybind(
                data.meta ?? shortcutObject.meta,
                data.ctrl ?? shortcutObject.ctrl,
                data.alt ?? shortcutObject.alt,
                data.shift ?? shortcutObject.shift,
                data.key ?? shortcutObject.key
            );
        }

        if (this.interceptions[shortcut]) {
            shortcutObject.interceptedBy = this.interceptions[shortcut];
        }

        if (typeof data.unregistered === "boolean") {
            shortcutObject.unregistered = data.unregistered;
        }

        if (typeof data.shortcutMode === "number" && data.shortcutMode >= 0 && data.shortcutMode <= 3) {
            shortcutObject.setShortcutMode(data.shortcutMode);
        }

        if (applyShortcuts) {
            if (canSave) {
                // Save customization data
                this.saveCustomizationData();
            }

            // Reapply custom shortcuts if needed
            this.applyCustomShortcuts();
        }
    }

    updateAllShortcuts(baseOnly = false) {
        // This function will only apply shortcut customizations and will not apply them
        for (const shortcutName in this.shortcuts) {
            let data = this.shortcutCustomizationData[shortcutName] || this.baseCustomizations[shortcutName];

            if (baseOnly) {
                data = this.baseCustomizations[shortcutName];
            }

            if (!data) {
                continue;
            }

            try {
                this.updateShortcut(shortcutName, data, false);
            } catch (e) {
                console.error(`Failed to update shortcut ${shortcutName}:`, e);
            }
        }
    }

    applyInterceptions() {
        for (const nativeShortcutId in this.interceptions) {
            let shortcutObject = this.shortcuts[nativeShortcutId];
            if (shortcutObject) {
                shortcutObject.interceptedBy = this.interceptions[nativeShortcutId];
            }
        }
    }

    async getCustomizationData() {
        try {
            this.shortcutCustomizationData = await IOUtils.readJSON(this.filePath);
        } catch (e) {
            console.warn("Failed to read Natsumi KBS customization data:", e);
            this.shortcutCustomizationData = {};
        }
    }

    async saveCustomizationData(data = null) {
        if (typeof data === "object" && data !== null) {
            this.shortcutCustomizationData = data;
        }

        try {
            await IOUtils.writeJSON(this.filePath, this.shortcutCustomizationData);
        } catch (e) {
            console.error("Failed to save Natsumi KBS customization data:", e);
        }
    }

    async resetAllShortcuts(saveChanges = true) {
        // Reset all shortcuts to default
        if (saveChanges) {
            await this.saveCustomizationData({});
        }

        for (const shortcutName in this.shortcuts) {
            const shortcut = this.shortcuts[shortcutName];
            shortcut.resetShortcut();
        }

        // Reapply initial customizations
        this.applyMacShortcuts();

        if (saveChanges) {
            this.applyCustomShortcuts();
        }
    }

    async replaceShortcuts(data) {
        let shouldAbort = false;

        // Run sanity check
        let hasShortcutsData = false;
        const availableKeys = [
            "customKeybinds",
            "shortcutMode",
            "unregistered",
            "meta",
            "ctrl",
            "alt",
            "shift",
            "key"
        ]
        const requiredKeys = [
            "customKeybinds",
            "shortcutMode"
        ];

        for (const key in data) {
            if (this.shortcuts[key]) {
                hasShortcutsData = true;

                // Check if required keys exist
                let dataKeys = Object.keys(data[key]);
                let hasRequiredKeys = requiredKeys.every(reqKey => dataKeys.includes(reqKey));
                let hasOnlyAvailableKeys = dataKeys.every(dataKey => availableKeys.includes(dataKey));

                if (!hasRequiredKeys || !hasOnlyAvailableKeys) {
                    console.error(`Shortcut data for ${key} has invalid data, aborting replacement.`);
                    hasShortcutsData = false;
                    break;
                }
            }
        }

        if (!hasShortcutsData) {
            console.error("No valid shortcut data found, aborting replacement.");
            return false;
        }

        // Reset shortcuts
        await this.resetAllShortcuts(false);
        this.applyMacShortcuts();
        this.updateAllShortcuts(true);

        // Apply shortcuts first
        for (const shortcutName in this.shortcuts) {
            const shortcutData = data[shortcutName];

            if (!shortcutData) {
                continue;
            }

            try {
                this.updateShortcut(shortcutName, shortcutData, false);
            } catch (e) {
                console.error(`Failed to update shortcut ${shortcutName}:`, e);
            }
        }

        // Check for conflicts
        for (const shortcutName in this.shortcuts) {
            const shortcutData = data[shortcutName];

            if (!shortcutData) {
                continue;
            }
            if (!shortcutData["customKeybinds"]) {
                continue;
            }

            const conflicts = this.checkConflicts(shortcutName, shortcutData);

            if (conflicts) {
                shouldAbort = true;
                console.error(`${shortcutName} conflicts with ${conflicts}, aborting replacement.`);
                break;
            }
        }

        if (shouldAbort) {
            // Revert to initial shortcuts
            this.initialApplyCustomShortcuts();
        } else {
            // Save customization data
            await this.saveCustomizationData();

            // Apply shortcuts
            this.applyCustomShortcuts();
        }

        return !shouldAbort;
    }

    getKeyCombination(event) {
        const metaPressed = event.metaKey;
        const ctrlPressed = event.ctrlKey;
        const altPressed = event.altKey;
        const shiftPressed = event.shiftKey;
        let key = event.key.toLowerCase();

        // On macOS, pressing Alt can cause special keys to appear.
        // In this case, we can get the key pressed from the event.code attribute
        if (altPressed && event.code.startsWith("Key") && key.length <= 2) {
            key = event.code.slice(3).toLowerCase();
        }

        // Sometimes, arrow keys are reported as "ARROWUP", "ARROWDOWN", etc. and not "UP" or "DOWN"
        if (key.startsWith("arrow") && key.length > 5) {
            key = key.slice(5);
        }

        if (event.keyCode >= 48 && event.keyCode <= 57) {
            key = `${event.keyCode - 48}`;
        }

        return {"meta": metaPressed, "ctrl": ctrlPressed, "alt": altPressed, "shift": shiftPressed, "key": key};
    }

    checkConflicts(targetShortcut, keyCombination) {
        let ignoreCheck = [];

        // Populate dictionary of shortcuts to check for conflicts
        for (const shortcutName in this.shortcuts) {
            const shortcut = this.shortcuts[shortcutName];

            if (shortcut.interceptedBy) {
                ignoreCheck.push(shortcut.interceptedBy);
            }
            if (shortcutName === targetShortcut || shortcut.interceptedBy === targetShortcut) {
                ignoreCheck.push(shortcutName);
            }
        }

        for (const shortcutName in this.shortcuts) {
            if (targetShortcut === shortcutName) {
                continue;
            }

            if (ignoreCheck.includes(shortcutName)) {
                continue;
            }

            const shortcut = this.shortcuts[shortcutName];

            if (shortcut.unregistered) {
                continue;
            }

            if (shortcut.meta === keyCombination.meta &&
                shortcut.ctrl === keyCombination.ctrl &&
                shortcut.alt === keyCombination.alt &&
                shortcut.shift === keyCombination.shift &&
                shortcut.key === keyCombination.key) {
                return shortcutName; // Return the name of the conflicting shortcut
            }
        }
    }

    ignoreShortcutHandling(duration) {
        if (this.ignoreTimeout) {
            clearTimeout(this.ignoreTimeout);
        }
        this.ignoreShortcuts = true;
        this.ignoreTimeout = setTimeout(() => {
            this.resetIgnore();
        }, duration);
    }

    resetIgnore() {
        if (this.ignoreTimeout) {
            clearTimeout(this.ignoreTimeout);
        }
        this.ignoreShortcuts = false;
        this.ignoreTimeout = null;
        this.ignoreHandler = null;
    }

    nativeHandleKeyboardShortcuts(shortcutName) {
        // Native shortcuts handler
        const selectedShortcutObject = this.shortcuts[shortcutName];

        // This function doesn't handle native shortcuts, only Natsumi's
        if (selectedShortcutObject instanceof NatsumiNativeKeyboardShortcut) {
            return;
        }

        // Prevent accidental duplicate execution (though this shouldn't happen)
        if (this.ignoreShortcuts || (!selectedShortcutObject.nativeHandle && selectedShortcutObject.shortcutMode !== 1)) {
            return;
        }

        // Get shortcut action
        if (this.shortcutActions[shortcutName]) {
            try {
                this.shortcutActions[shortcutName]();
            } catch (e) {
                console.error(`Failed to execute action for shortcut ${shortcutName}:`, e);
            }
        } else {
            console.warn(`No action defined for shortcut: ${shortcutName}`);
        }
    }

    handleKeyboardShortcuts(event) {
        /*
        Shortcut modes:
        0. "Assert dominance": Cancels out all shortcuts to ensure Natsumi's shortcut is the only one running.
        1. "Double run": Allow both Natsumi and browser/website shortcuts to run at the same time
        2. "Take turns": Require double press to execute Natsumi's shortcut
        3. "Native handle": Offloads command handling to Firefox instead of letting Natsumi handle it
        */

        // Do not handle shortcuts if ignoring
        if (this.ignoreShortcuts) {
            event.preventDefault();
            event.stopPropagation();

            if (this.ignoreHandler) {
                this.ignoreHandler(event);
            }

            return;
        }

        const keyCombi = this.getKeyCombination(event);

        if (ucApi.Prefs.get("natsumi.shortcuts.disabled").exists()) {
            if (ucApi.Prefs.get("natsumi.shortcuts.disabled").value) {
                return; // Shortcuts are disabled, so do nothing
            }
        }

        if (document.body.hasAttribute("natsumi-welcome")) {
            return;
        }

        const forbiddenKeys = [
            "meta",
            "control",
            "alt",
            "shift"
        ]

        // Ensure key is not forbidden
        if (forbiddenKeys.includes(keyCombi.key)) {
            return;
        }

        // Check if the key combination matches any defined shortcut
        let selectedShortcutName = null;
        let selectedShortcutObject = null;

        for (const shortcutName in this.shortcuts) {
            const shortcut = this.shortcuts[shortcutName];

            if (shortcut.unregistered) {
                continue;
            }

            if (shortcut.meta === keyCombi.meta &&
                shortcut.ctrl === keyCombi.ctrl &&
                shortcut.alt === keyCombi.alt &&
                shortcut.shift === keyCombi.shift &&
                shortcut.key === keyCombi.key) {
                selectedShortcutName = shortcutName;
                selectedShortcutObject = shortcut;
                break;
            }
        }

        if (!selectedShortcutName || !selectedShortcutObject) {
            return;
        }

        // If the shortcut is set to be handled by Firefox, do nothing here
        if (selectedShortcutObject.nativeHandle) {
            return;
        }

        // If the shortcut is intercepted by another Natsumi shortcut, do nothing here
        if (selectedShortcutObject.interceptedBy) {
            return;
        }

        // If the shortcut needs a double press to activate, check if a timeout exists
        if (!this.shortcutsPending[selectedShortcutName] && selectedShortcutObject.requireDoublePress) {
            // If no timeout exists, create one
            this.shortcutsPending[selectedShortcutName] = setTimeout(() => {
                delete this.shortcutsPending[selectedShortcutName];
            }, 500); // 500ms timeout for double press detection
            return;
        } else {
            // If a timeout exists, clear it and proceed with the action
            clearTimeout(this.shortcutsPending[selectedShortcutName]);
            delete this.shortcutsPending[selectedShortcutName];
        }

        // "Assert dominance" if the browser should be the one executing the shortcut
        // (it's just canceling out any other actions that this shortcut would trigger)
        if (selectedShortcutObject.browserWins || selectedShortcutObject.requireDoublePress) {
            event.preventDefault();
            event.stopPropagation();
        }

        // Execute the action associated with the shortcut
        if (this.shortcutActions[selectedShortcutName]) {
            try {
                this.shortcutActions[selectedShortcutName]();
            } catch (e) {
                console.error(`Failed to execute action for shortcut ${selectedShortcutName}:`, e);
            }
        } else {
            // Raise warning only if shortcut isn't a native one
            if (!(selectedShortcutObject instanceof NatsumiNativeKeyboardShortcut)) {
                console.warn(`No action defined for shortcut: ${selectedShortcutName}`);
            }
        }

        // Execute native keyboard shortcut action
        if (selectedShortcutObject instanceof NatsumiNativeKeyboardShortcut) {
            // Get the key object
            let keyElement = document.getElementById(selectedShortcutName);
            keyElement.doCommand();
        }
    }
}

if (!document.body.natsumiKBSManager) {
    try {
        document.body.natsumiKBSManager = new NatsumiKBSManager();
        document.body.natsumiKBSManager.init();
    } catch (e) {
        console.error("Failed to initialize Natsumi Keyboard Shortcut Manager:", e);
    }
}
