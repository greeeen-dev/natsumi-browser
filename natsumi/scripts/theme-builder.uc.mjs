// ==UserScript==
// @include   main
// @ignorecache
// ==/UserScript==

import * as ucApi from "chrome://userchromejs/content/uc_api.sys.mjs";
import {applyCustomTheme, customThemeLoader, CustomThemePicker} from "./custom-theme.sys.mjs";
import {NatsumiNotification} from "./notifications.sys.mjs";

class NatsumiThemeBuilder {
    constructor() {
        this.currentThemeBuilder = null;
        this.destroyTimeout = null;
    }

    init() {
        document.addEventListener("keydown", (event) => {
            if (event.key.toLowerCase() === "escape" && this.currentThemeBuilder) {
                event.stopImmediatePropagation();
                event.preventDefault();
                this.destroyEditTheme();
            }
        });
        this.addContextMenuButton();

        if (ucApi.Prefs.get("natsumi.theme.type").exists()) {
            if (ucApi.Prefs.get("natsumi.theme.type").value !== "custom") {
                this.disableContextMenuButton();
            }
        } else {
            this.disableContextMenuButton();
        }

        Services.prefs.addObserver("natsumi.theme.type", () => {
            if (ucApi.Prefs.get("natsumi.theme.type").exists()) {
                if (ucApi.Prefs.get("natsumi.theme.type").value === "custom") {
                    this.enableContextMenuButton();
                } else {
                    this.disableContextMenuButton();
                }
            } else {
                this.disableContextMenuButton();
            }
        })
    }

    addContextMenuButton() {
        // Create context menu item
        let editThemeButton = document.createXULElement("menuitem");
        editThemeButton.id = "toolbar-context-edit-theme";
        editThemeButton.setAttribute("label", "Edit Theme");

        // Add to context menu
        let toolbarContextMenu = document.getElementById("toolbar-context-menu");
        let customizeSidebarButton = document.getElementById("toolbar-context-customize-sidebar");
        toolbarContextMenu.insertBefore(editThemeButton, customizeSidebarButton);

        // Register event handlers
        let mainPopupSet = document.getElementById("mainPopupSet");
        mainPopupSet.addEventListener("command", (event) => {
            if (event.target.id === "toolbar-context-edit-theme") {
                // Check if tabs have been multiselected
                this.showEditTheme();
            }
        })
    }

    disableContextMenuButton() {
        let contextMenuButton = document.getElementById("toolbar-context-edit-theme");
        contextMenuButton.disabled = true;
    }

    enableContextMenuButton() {
        let contextMenuButton = document.getElementById("toolbar-context-edit-theme");
        contextMenuButton.disabled = false;
    }

    showEditTheme() {
        if (this.destroyTimeout) {
            return;
        }

        let themeBuilderContainer = document.createElement("div");
        themeBuilderContainer.id = "natsumi-theme-builder-container";
        themeBuilderContainer.addEventListener("click", (event) => {
            let closestThemeBuilder = event.target.closest("#natsumi-theme-builder");
            if (!closestThemeBuilder) {
                this.destroyEditTheme();
            }
        })
        document.body.appendChild(themeBuilderContainer);
        document.body.setAttribute("natsumi-editing-theme", "");

        // Add theme builder
        this.currentThemeBuilder = new CustomThemePicker("natsumi-theme-builder", customThemeLoader, applyCustomTheme, "natsumi.theme.custom-theme-data", false, true, true);
        let themeNode = this.currentThemeBuilder.generateNode();
        themeBuilderContainer.appendChild(themeNode);
        this.currentThemeBuilder.init().catch((error) => {
            console.error(error);
        });
    }

    destroyEditTheme() {
        if (this.destroyTimeout) {
            return;
        }

        if (!this.currentThemeBuilder) {
            return;
        }

        let themeBuilderContainer = document.getElementById("natsumi-theme-builder-container");
        themeBuilderContainer.setAttribute("removing", "");
        document.body.setAttribute("natsumi-editing-theme-disappear", "");

        let themeSavedNotification = new NatsumiNotification(
            "Theme saved!",
            null,
            "chrome://natsumi/content/icons/lucide/paintbrush.svg",
            5000,
        )
        themeSavedNotification.addToContainer();

        this.destroyTimeout = setTimeout(() => {
            this.currentThemeBuilder = null;
            themeBuilderContainer.remove();
            document.body.removeAttribute("natsumi-editing-theme");
            document.body.removeAttribute("natsumi-editing-theme-disappear");

            // Clear timeout
            clearTimeout(this.destroyTimeout);
            this.destroyTimeout = null;
        }, 300);
    }
}

if (!document.body.natsumiThemeBuilder) {
    document.body.natsumiThemeBuilder = new NatsumiThemeBuilder();
    document.body.natsumiThemeBuilder.init();
}
