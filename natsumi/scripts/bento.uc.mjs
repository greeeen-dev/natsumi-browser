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

const tempDirectory = PathUtils.join(PathUtils.profileDir, "natsumi-bento-temp");
const tempFilesDirectory = PathUtils.join(tempDirectory, "files");
const themesPath = PathUtils.join(PathUtils.profileDir, "natsumi-themes");
const uploadsPath = PathUtils.join(PathUtils.profileDir, "natsumi-uploads");
const shortcutsPath = PathUtils.join(PathUtils.profileDir, "natsumi-shortcuts.json");
const configsWithFiles = [
    "natsumi.startup.custom-sound-id"
]
const canExportConfigs = [
    "natsumi.theme.single-toolbar",
    "natsumi.theme.islands",
    "natsumi.theme.islands-haze",
    "natsumi.theme.islands-content-haze",
    "natsumi.theme.no-margin",
    "natsumi.theme.browser-separation",
    "natsumi.theme.accent-color",
    "natsumi.theme.classic-preferences",
    "natsumi.theme.compact-blur",
    "natsumi.theme.compact-keep-zen-mode",
    "natsumi.theme.compact-long-visibility",
    "natsumi.theme.compact-marginless",
    "natsumi.theme.compact-on-new-window",
    "natsumi.theme.compact-sidebar-accent",
    "natsumi.theme.compact-smaller-sidebar",
    "natsumi.theme.compact-style",
    "natsumi.theme.context-menu-icons",
    "natsumi.theme.disable-sdl2",
    "natsumi.theme.disable-translucency",
    "natsumi.theme.font-size-offset",
    "natsumi.theme.force-natsumi-color",
    "natsumi.theme.force-window-controls-to-left",
    "natsumi.theme.gray-out-when-inactive",
    "natsumi.theme.icons",
    "natsumi.theme.icons-alt-back-forward",
    "natsumi.theme.pinned-toolbar-on-top",
    "natsumi.theme.preferences-hide-subcategories",
    "natsumi.theme.show-bookmarks-on-hover",
    "natsumi.theme.type",
    "natsumi.theme.single-toolbar-hide-extensions-button",
    "natsumi.theme.single-toolbar-show-menu-button",
    "natsumi.theme.use-tab-theme-color",
    "natsumi.pip.center-scale",
    "natsumi.pip.disable-scroll-to-move",
    "natsumi.pip.legacy-style",
    "natsumi.pip.material",
    "natsumi.pdfjs.compact",
    "natsumi.pdfjs.compact-dynamic",
    "natsumi.pdfjs.material",
    "natsumi.glimpse.alt-border",
    "natsumi.glimpse.controls-on-right",
    "natsumi.glimpse.show-indicator",
    "natsumi.miniplayer.disable-artwork",
    "natsumi.miniplayer.disable-dynamic-accent",
    "natsumi.miniplayer.disable-text-scrolling",
    "natsumi.miniplayer.pin-by-default",
    "natsumi.miniplayer.scroll-view",
    "natsumi.sidebar.autohide-bottom-toolbar",
    "natsumi.sidebar.clear-merge-with-workspaces",
    "natsumi.sidebar.disable-bottom-toolbar",
    "natsumi.sidebar.floorp-floating-panel",
    "natsumi.sidebar.floorp-overlay-panel",
    "natsumi.sidebar.hide-clear-tabs",
    "natsumi.sidebar.hide-workspace-indicator",
    "natsumi.sidebar.workspaces-as-icons",
    "natsumi.tabs.blade-legacy-color",
    "natsumi.tabs.disable-crossout-title",
    "natsumi.tabs.disable-grayout-unloaded",
    "natsumi.tabs.fusion-highlight",
    "natsumi.tabs.hide-new-tab-button",
    "natsumi.tabs.material-alt-design",
    "natsumi.tabs.new-tab-on-top",
    "natsumi.tabs.type",
    "natsumi.tabs.use-custom-type",
    "natsumi.urlbar.always-expanded",
    "natsumi.urlbar.do-not-float",
    "natsumi.urlbar.single-toolbar-display-actions"
];

class NatsumiBentoManager {
    constructor() {
        this.working = false;
    }

    packConfigs() {
        let packedConfigs = [];
        for (let config of canExportConfigs) {
            if (!ucApi.Prefs.get(config).exists) {
                continue;
            }

            packedConfigs.push({"name": config, "value": ucApi.Prefs.get(config).value});
        }

        return packedConfigs;
    }

    unpackConfigs(configs) {
        for (let config of configs) {
            if (!canExportConfigs.includes(config["name"])) {
                continue;
            }

            ucApi.Prefs.set(config["name"], config["value"])
        }
    }

    async createTempDirectory(exporting = false) {
        this.working = true;
        await IOUtils.makeDirectory(tempDirectory, {
            createAncestors: false
        });

        if (exporting) {
            await IOUtils.makeDirectory(tempFilesDirectory, {
                createAncestors: false
            });
        }
    }

    async deleteTempDirectory() {
        this.working = false;
        await IOUtils.remove(tempDirectory, {recursive: true});
    }

    async importBento(file) {
        if (this.working) {
            throw new Error("Another Bento is being handled at the moment, cannot import.");
        }

        // Delete existing temporary directory if any
        try {
            await this.deleteTempDirectory();
        } catch(e) {
            console.warn("Failed to delete temporary directory:", e);
        }

        // Create temporary directory
        await this.createTempDirectory();
    }

    async exportBento(options) {
        if (this.working) {
            //throw new Error("Another Bento is being handled at the moment, cannot export.");
        }

        // Delete existing temporary directory if any
        try {
            await this.deleteTempDirectory();
        } catch(e) {
            console.warn("Failed to delete temporary directory:", e);
        }

        // Create temporary directory
        await this.createTempDirectory();

        // Get export options
        const exportTheme = options["theme"] ?? false;
        const exportFiles = options["files"] ?? false;
        const exportShortcuts = options["shortcuts"] ?? false;
        const exportConfigs = options["configs"] ?? false;

        // Export things
        let bentoData = {
            "exported": {
                "theme": exportTheme,
                "files": exportFiles,
                "shortcuts": exportShortcuts,
                "configs": exportConfigs
            },
            "theme": {},
            "files": [],
            "shortcuts": {},
            "configs": []
        };
        let exportedSomething = false;

        // Export theme
        if (exportTheme) {
            // Get theme
            let themePath = PathUtils.join(themesPath, "master.json");

            // Try to read from file
            let themeData;
            try {
                themeData = await IOUtils.readJSON(themePath);
            } catch (e) {
                // Can't do anything
                console.warn("Failed to read theme:", e);
            }

            if (themeData) {
                bentoData["theme"] = themeData;
                exportedSomething = true;
            }
        }

        // Export files (only ones that are in use)
        if (exportFiles) {
            let usedFiles = [];
            if (bentoData["theme"]["light"]) {
                if (bentoData["theme"]["light"]["0"]) {
                    let layerImage = bentoData["theme"]["light"]["0"]["image"];
                    if (layerImage) {
                        usedFiles.push(layerImage);
                    }
                }
                if (bentoData["theme"]["light"]["1"]) {
                    let layerImage = bentoData["theme"]["light"]["1"]["image"];
                    if (layerImage) {
                        usedFiles.push(layerImage);
                    }
                }
            }
            if (bentoData["theme"]["dark"]) {
                if (bentoData["theme"]["dark"]["0"]) {
                    let layerImage = bentoData["theme"]["dark"]["0"]["image"];
                    if (layerImage) {
                        usedFiles.push(layerImage);
                    }
                }
                if (bentoData["theme"]["dark"]["1"]) {
                    let layerImage = bentoData["theme"]["dark"]["1"]["image"];
                    if (layerImage) {
                        usedFiles.push(layerImage);
                    }
                }
            }
            for (let fileConfig of configsWithFiles) {
                if (!ucApi.Prefs.get(fileConfig).exists) {
                    return;
                }
                bentoData.push(ucApi.Prefs.get(fileConfig).value);
            }

            bentoData["files"] = usedFiles;
            for (let usedFile of usedFiles) {
                let filePath = PathUtils.join(uploadsPath, `${usedFile}.json`);
                let newFilePath = PathUtils.join(tempFilesDirectory, `${usedFile}.json`);

                // Try to read file
                let fileData;
                try {
                    fileData = await IOUtils.readJSON(filePath);
                } catch(e) {
                    console.warn("Failed to read file:", e);
                }

                if (fileData) {
                    await IOUtils.writeJSON(newFilePath, fileData);
                    exportedSomething = true;
                }
            }
        }
        if (exportShortcuts) {
            // Try to read from file
            let shortcutsData;
            try {
                shortcutsData = await IOUtils.readJSON(shortcutsPath);
            } catch (e) {
                // Can't do anything
                console.warn("Failed to read shortcuts:", e);
            }

            if (shortcutsData) {
                bentoData["shortcuts"] = shortcutsData;
                exportedSomething = true;
            }
        }
        if (exportConfigs) {
            let packagedConfigs = this.packConfigs();

            if (packagedConfigs.length > 0) {
                bentoData["configs"] = packagedConfigs;
                exportedSomething = true;
            }
        }

        if (!exportedSomething) {
            throw new Error("Tried to create an empty Bento, please choose something to export.");
        }
    }
}

if (!document.body.natsumiBentoManager) {
    document.body.natsumiBentoManager = new NatsumiBentoManager();
}