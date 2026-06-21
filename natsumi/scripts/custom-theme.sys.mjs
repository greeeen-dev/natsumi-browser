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
import { getFile } from "./files.sys.mjs";
import {NatsumiNotification} from "./notifications.sys.mjs";
import {FileUpload} from "./files.sys.mjs";
import {resetTabStyleIfNeeded} from "./reset-tab-style.sys.mjs";

// Dev features - still heavy WIP
const enablePositionFreeform = false;
const enableTextColor = false;

const themesPath = PathUtils.join(PathUtils.profileDir, "natsumi-themes");
let isFloorp = false;
let floorpWorkspacesEnabled = false;

if (ucApi.Prefs.get("natsumi.browser.type").exists()) {
    isFloorp = ucApi.Prefs.get("natsumi.browser.type").value === "floorp";

    if (ucApi.Prefs.get("floorp.workspaces.enabled").exists()) {
        floorpWorkspacesEnabled = ucApi.Prefs.get("floorp.workspaces.enabled").value;
    }
}

function convertToXUL(node) {
    // noinspection JSUnresolvedReference
    return window.MozXULElement.parseXULToFragment(node);
}

export const colorPresetNames = {
    null: "Freeform",
    "complementary": "Complementary",
    "split-complementary": "Split",
    "analogous": "Analogous",
    "triadic": "Triadic",
    "double-complementary": "Double",
    "tetradic": "Tetradic",
    "pentagonal": "Pentagonal",
    "hexagonal": "Hexagonal"
}

export const colorPresetOffsets = {
    "complementary": [0, 180],
    "split-complementary": [0, 150, 210],
    "analogous": [0, -30, 30],
    "triadic": [0, 120, 240],
    "double-complementary": [0, 60, 180, 240],
    "tetradic": [0, 90, 180, 270],
    "pentagonal": [0, 60, 150, 210, 300],
    "hexagonal": [0, 60, 120, 180, 240, 300]
}

export const colorPresetOrders = {
    "split-complementary": [1, 2, 0],
    "analogous": [1, 0, 2]
}

export const availablePresets = {
    2: ["complementary"],
    3: ["split-complementary", "analogous", "triadic"],
    4: ["double-complementary", "tetradic"],
    5: ["pentagonal"],
    6: ["hexagonal"]
}

// Structure
// {"type": ["css-func-name", "angle-override"]}
export const gradientTypes = {
    "linear": ["linear-gradient", null],
    "radial-cs": ["radial-gradient", "closest-side"],
    "radial-cc": ["radial-gradient", "closest-corner"],
    "radial-fs": ["radial-gradient", "farthest-side"],
    "radial-fc": ["radial-gradient", "farthest-corner"],
    "conic": ["conic-gradient", null]
}

export const gradientTypeNames = {
    "linear": "Linear",
    "radial-cs": "Radial (cs)",
    "radial-cc": "Radial (cc)",
    "radial-fs": "Radial (fs)",
    "radial-fc": "Radial (fc)",
    "conic": "Conic",
    "hybrid": "Hybrid"
}

export function customThemeLoader(data, includeImages = true) {
    if (!includeImages) {
        data["light"]["0"]["image"] = {}
        data["light"]["1"]["image"] = {}
        data["dark"]["0"]["image"] = {}
        data["dark"]["1"]["image"] = {}
    }

    return data;
}

export function customColorLoader(data) {
    return data;
}

function parseHybridBackground(data) {
    let colors = data["colors"] ?? [];
    let colorCodes = [];
    let gradients = []

    // If there are 2 or less colors, default to linear
    if (colors.length <= 2) {
        return null;
    }

    colors.sort((a, b) => {
        if (a.order !== undefined && b.order !== undefined) {
            return a.order - b.order;
        }
        return 0;
    });

    for (const color of colors) {
        colorCodes.push(color.code);
    }

    if (colors.length === 3) {
        gradients.push(`radial-gradient(circle at 0% 0%, ${colorCodes[1]}, transparent)`);
        gradients.push(`radial-gradient(circle at 100% 0%, ${colorCodes[2]}, transparent)`);
        gradients.push(`linear-gradient(to top, ${colorCodes[0]}, transparent)`);
    } else {
        const isOdd = colors.length % 2 !== 0;
        const upperHalf = Math.floor(colors.length / 2);
        let lowerHalf = upperHalf;
        let index = 1;

        if (isOdd) {
            lowerHalf += 1;
        }

        for (let i = 0; i < upperHalf; i++) {
            gradients.push(`radial-gradient(circle at ${i * (100 / (upperHalf - 1))}% 0%, ${colorCodes[index]}, transparent)`);
            index++;

            if (index > colors.length - 1) {
                index = 0;
            }
        }

        for (let i = 0; i < lowerHalf; i++) {
            gradients.push(`radial-gradient(circle at ${100 - (i * (100 / (lowerHalf - 1)))}% 100%, ${colorCodes[index]}, transparent)`);
            index++;

            if (index > colors.length - 1) {
                index = 0;
            }
        }
    }

    return gradients.join(", ");
}

function parseColor(data) {
    // Example color data
    // {"code": "hsla(255, 100%, 50%, 1)", "angle": 255, "radius": 1, "value": 1, "opacity": 1, "order": 0}
    if (!data) {
        return null;
    }

    if (data.code) {
        return data.code;
    }
    return null;
}

function parseBackground(data) {
    // Example background data
    // {"type": "linear", "angle": 135, "preset": null, "managedPos": true, "colors": [
    //   {"code": "hsla(255, 100%, 50%, 1)", "angle": 255, "radius": 1, "value": 1, "opacity": 1, "order": 0, "position": 0},
    //   {"code": "hsla(300, 100%, 50%, 1)", "angle": 300, "radius": 1, "value": 1, "opacity": 1, "order": 1, "position": 1}
    // ]}

    let gradientType = "linear-gradient";
    const angle = ((data["angle"] ?? 0) + 180) % 360;
    const angleString = `${angle}deg`;
    const managedPosition = data["managedPos"] ?? true;
    let angleOverride = null;
    let colors = data["colors"] ?? [];
    let colorCodes = [];

    if (gradientTypes[data["type"]]) {
        gradientType = gradientTypes[data["type"]][0];
        angleOverride = gradientTypes[data["type"]][1];
    }

    if (colors.length === 0) {
        return null;
    }

    if (data["type"] === "hybrid") {
        angleOverride = "135deg"
        const hybridParsed = parseHybridBackground(data);

        if (hybridParsed) {
            return hybridParsed;
        }
    }

    colors.sort((a, b) => {
        if (a.order !== undefined && b.order !== undefined) {
            return a.order - b.order;
        }
        return 0;
    });

    for (const color of colors) {
        let toPushCode = color.code;

        if (!managedPosition) {
            // If we aren't using managedPosition, then we can set the custom positions for each color
            const positionValue = color.position * 100;
            toPushCode = `${toPushCode} ${positionValue}%`
        }

        colorCodes.push(toPushCode);
    }

    if (data["type"] === "conic") {
        angleOverride = `from ${angleString}`;
    }

    if (!Array.isArray(colors) || colors.length === 0) {
        return "transparent";
    }

    return `${gradientType}(${angleOverride ?? angleString}, ${colorCodes.join(", ")})`;
}

function parseFilters(data) {
    // soon(tm)

    let filters = [];

    for (const [filter, value] of Object.entries(data)) {
        if (typeof value === "string" && value.length > 0) {
            filters.push(`${filter}(${value})`);
        }
    }

    if (filters.length === 0) {
        return "none";
    }

    return filters.join(" ");
}

export async function getTheme(workspaceId = null, strict = false) {
    await IOUtils.makeDirectory(themesPath, {
        createAncestors: false,
    });

    let themePath = PathUtils.join(themesPath, "master.json");
    if (workspaceId) {
        themePath = PathUtils.join(themesPath, `${workspaceId}.json`);
    }

    const masterThemePath = PathUtils.join(themesPath, "master.json");

    // Attempt 1: Read from file
    try {
        return await IOUtils.readJSON(themePath);
    } catch (e) {
        // Raising a warning here would cause too much spam, so we omit it
    }

    if (strict) {
        return null;
    }

    // Attempt 2: Return master file
    if (workspaceId) {
        try {
            return await IOUtils.readJSON(masterThemePath);
        } catch (e) {
            console.warn("Failed to read master customization data:", e);
        }
    }

    // Attempt 3: Return from prefs
    let customThemeData = {};

    try {
        customThemeData = JSON.parse(ucApi.Prefs.get("natsumi.theme.custom-theme-data").value);
        await migrateCustomTheme();
        return customThemeData;
    } catch (e) {
        console.warn("Failed to read master customization data (legacy):", e);
    }

    console.error("Could not load any customization data.");
}

async function migrateCustomTheme() {
    let customThemeData = {};

    if (!ucApi.Prefs.get("natsumi.theme.custom-theme-data").exists()) {
        console.info("Skipping migration, nothing to migrate.");
        return;
    }

    try {
        customThemeData = JSON.parse(ucApi.Prefs.get("natsumi.theme.custom-theme-data").value);
    } catch (e) {
        console.error("Failed to read master customization data (legacy):", e);
        return;
    }

    const masterThemePath = PathUtils.join(themesPath, "master.json");

    try {
        await IOUtils.writeJSON(masterThemePath, customThemeData);
    } catch (e) {
        console.error("Failed to save customization data:", e);
    }

    // Delete old pref
    ucApi.Prefs.get("natsumi.theme.custom-theme-data").reset();
}

// This function is not enabled because it does not work on other windows yet
export function applyCustomColor() {
    let customColorData = {};

    try {
        customColorData = JSON.parse(ucApi.Prefs.get("natsumi.theme.custom-color-data").value);
    } catch (e) {
        console.error("Invalid color data:", e);
        return;
    }

    let colorCode = parseColor(customColorData["color"]);

    ucApi.Windows.forEach((browserDocument, browserWindow) => {
        let head = browserDocument.head;

        // Remove existing inline style
        let existingStyle = head.querySelector("style[natsumi-custom-color]");
        if (existingStyle) {
            existingStyle.remove();
        }

        // Create new inline style
        if (colorCode) {
            let style = browserDocument.createElement("style");
            style.setAttribute("natsumi-custom-color", "");
            style.textContent = `
                @media -moz-pref("natsumi.theme.accent-color", "custom") {
                    * {
                        --natsumi-primary-color: ${colorCode} !important;
                    }
                }
            `;
            head.appendChild(style);
        }
    }, false);
}

export async function applyCustomTheme() {
    let customThemeData = {};

    // Example theme data
    // {"light": {"0": {
    //   "background": {"type": "linear", "angle": 135, "preset": null, "colors": [
    //     {"code": "hsla(255, 100%, 50%, 1)", "angle": 255, "radius": 1, "value": 1, "opacity": 1, "order": 0},
    //     {"code": "hsla(300, 100%, 50%, 1)", "angle": 300, "radius": 1, "value": 1, "opacity": 1, "order": 1}
    //   ]}
    // }}}

    try {
        customThemeData = await getTheme();
    } catch (e) {
        console.error("Invalid theme data:", e);
        return;
    }

    let perWorkspaceData = {};
    let preliminaryBrowserWindow;
    let workspaces = [];

    // Try to get any window with workspaces wrapper if we're on Floorp
    if (isFloorp && floorpWorkspacesEnabled) {
        for (let win of ucApi.Windows.getAll(true)) {
            if (win.document.body.natsumiWorkspacesWrapper) {
                preliminaryBrowserWindow = win;
                break;
            }
        }

        if (preliminaryBrowserWindow) {
            workspaces = preliminaryBrowserWindow.document.body.natsumiWorkspacesWrapper.getAllWorkspaceIDs();
        }

        if (workspaces) {
            // Load data for each workspace
            for (const workspaceId of workspaces) {
                try {
                    perWorkspaceData[workspaceId] = await getTheme(workspaceId);
                } catch (e) {
                    console.warn(`Could not fetch theme for workspace ${workspaceId}:`, e);
                }
            }
        }
    }

    ucApi.Windows.forEach((browserDocument, browserWindow) => {
        let body = browserDocument.body;
        let workspaceId;
        let toApplyData = customThemeData;

        if (isFloorp && floorpWorkspacesEnabled) {
            workspaceId = body.natsumiWorkspacesWrapper.getCurrentWorkspaceID();

            if (perWorkspaceData[workspaceId]) {
                toApplyData = perWorkspaceData[workspaceId];
            }
        }

        // Remove existing properties
        body.removeAttribute("natsumi-custom-theme-has-image");
        body.style.removeProperty("--natsumi-theme-layer-0-background");
        body.style.removeProperty("--natsumi-theme-layer-0-background-dark");
        body.style.removeProperty("--natsumi-theme-layer-1-background");
        body.style.removeProperty("--natsumi-theme-layer-1-background-dark");
        body.style.removeProperty("--natsumi-theme-layer-0-filter");
        body.style.removeProperty("--natsumi-theme-layer-0-filter-dark");
        body.style.removeProperty("--natsumi-theme-layer-1-filter");
        body.style.removeProperty("--natsumi-theme-layer-1-filter-dark");
        body.style.removeProperty("--natsumi-theme-layer-0-opacity");
        body.style.removeProperty("--natsumi-theme-layer-0-opacity-dark");
        body.style.removeProperty("--natsumi-theme-layer-1-opacity");
        body.style.removeProperty("--natsumi-theme-layer-1-opacity-dark");
        body.style.removeProperty("--natsumi-theme-layer-0-scale");
        body.style.removeProperty("--natsumi-theme-layer-0-scale-dark");
        body.style.removeProperty("--natsumi-theme-layer-1-scale");
        body.style.removeProperty("--natsumi-theme-layer-1-scale-dark");
        body.style.removeProperty("--natsumi-theme-text-color");
        body.style.removeProperty("--natsumi-theme-text-color-dark");

        for (let index in toApplyData["light"]) {
            let layerData = toApplyData["light"][index];
            let imageId;

            if (layerData["image"]) {
                imageId = layerData["image"]["id"];
            }

            if (imageId) {
                getFile(imageId).then((fileDict) => {
                    body.setAttribute("natsumi-custom-theme-has-image", "");
                    body.style.setProperty(`--natsumi-theme-layer-${index}-background`, `url(${fileDict.data})`);
                    body.style.setProperty(`--natsumi-theme-layer-${index}-opacity`, layerData["image"]["opacity"]);

                    switch(layerData["image"]["blur"]) {
                        case "light":
                            body.style.setProperty(`--natsumi-theme-layer-${index}-filter`, "blur(5px)");
                            body.style.setProperty(`--natsumi-theme-layer-${index}-scale`, "1.02");
                            break;
                        case "medium":
                            body.style.setProperty(`--natsumi-theme-layer-${index}-filter`, "blur(10px)");
                            body.style.setProperty(`--natsumi-theme-layer-${index}-scale`, "1.04");
                            break;
                        case "strong":
                            body.style.setProperty(`--natsumi-theme-layer-${index}-filter`, "blur(20px)");
                            body.style.setProperty(`--natsumi-theme-layer-${index}-scale`, "1.08");
                            break;
                        default:
                            // Do nothing
                    }
                })
            } else if (layerData["background"]) {
                const backgroundValue = parseBackground(layerData["background"]);
                if (!backgroundValue) {
                    body.style.removeProperty(`--natsumi-theme-layer-${index}-background`);
                } else {
                    body.style.setProperty(`--natsumi-theme-layer-${index}-background`, backgroundValue);
                }
            }

            if (layerData["textColor"]) {
                const textColorValue = parseColor(layerData["textColor"]);
                if (!textColorValue) {
                    body.style.removeProperty(`--natsumi-theme-text-color`);
                } else {
                    body.style.setProperty(`--natsumi-theme-text-color`, textColorValue);
                }
            }
        }

        for (let index in toApplyData["dark"]) {
            let layerData = toApplyData["dark"][index];
            let imageId;

            if (layerData["image"]) {
                imageId = layerData["image"]["id"];
            }

            if (imageId) {
                getFile(imageId).then((fileDict) => {
                    body.setAttribute("natsumi-custom-theme-has-image", "");
                    body.style.setProperty(`--natsumi-theme-layer-${index}-background-dark`, `url(${fileDict.data})`);
                    body.style.setProperty(`--natsumi-theme-layer-${index}-opacity-dark`, layerData["image"]["opacity"]);

                    switch(layerData["image"]["blur"]) {
                        case "light":
                            body.style.setProperty(`--natsumi-theme-layer-${index}-filter-dark`, "blur(5px)");
                            body.style.setProperty(`--natsumi-theme-layer-${index}-scale-dark`, "1.02");
                            break;
                        case "medium":
                            body.style.setProperty(`--natsumi-theme-layer-${index}-filter-dark`, "blur(10px)");
                            body.style.setProperty(`--natsumi-theme-layer-${index}-scale-dark`, "1.04");
                            break;
                        case "strong":
                            body.style.setProperty(`--natsumi-theme-layer-${index}-filter-dark`, "blur(20px)");
                            body.style.setProperty(`--natsumi-theme-layer-${index}-scale-dark`, "1.08");
                            break;
                        default:
                            // Do nothing
                    }
                })
            } else if (layerData["background"]) {
                const backgroundValue = parseBackground(layerData["background"]);
                if (!backgroundValue) {
                    body.style.removeProperty(`--natsumi-theme-layer-${index}-background-dark`);
                } else {
                    body.style.setProperty(`--natsumi-theme-layer-${index}-background-dark`, backgroundValue);
                }
            }

            if (layerData["textColor"]) {
                const textColorValue = parseColor(layerData["textColor"]);
                if (!textColorValue) {
                    body.style.removeProperty(`--natsumi-theme-text-color-dark`);
                } else {
                    body.style.setProperty(`--natsumi-theme-text-color-dark`, textColorValue);
                }
            }
        }

        // Set grain opacity
        let grainOpacity = 0;
        let grainOpacityDark = 0;
        if (toApplyData["light"]["grain"]) {
            grainOpacity = toApplyData["light"]["grain"];
        }
        if (toApplyData["dark"]["grain"]) {
            grainOpacityDark = toApplyData["dark"]["grain"];
        }
        body.style.setProperty(`--natsumi-theme-grain-opacity`, `${grainOpacity}`);
        body.style.setProperty(`--natsumi-theme-grain-opacity-dark`, `${grainOpacityDark}`);
    }, true);
}

export class CustomThemePicker {
    constructor(id, loaderMethod, applyMethod, legacyTargetPref, singleColor = false, allowOpacity = true) {
        this.id = id;
        this.loaderMethod = loaderMethod;
        this.applyMethod = applyMethod;
        this.legacyTargetPref = legacyTargetPref;
        this.singleColor = singleColor;
        this.allowOpacity = allowOpacity;
        this.preset = null;
        this.gradientType = "linear";
        this.angle = 0;
        this.colors = [];
        this.customImage = null;
        this.customImageOpacity = 1;
        this.customImageBlur = "none";
        this.managedPosition = false;
        this.textColor = {"enabled": false, "hue": 0, "saturation": 0, "value": 0};
        this.grain = 0;
        this.newColorAllowed = true;
        this.lastSelected = null;
        this.layer = 0;
        this.theme = "light";
        this.data = {"light": {"0": {}, "1": {}}, "dark": {"0": {}, "1": {}}}
        this.node = null;
        this.workspace = null;
        this.fileUpload = new FileUpload("natsumi-custom-theme-image-upload", "image");

        // Configs
        this.availableLayers = 2;
        this.version = 1;

        if (this.singleColor) {
            this.data = {"color": {}};
        }

        // States
        this.shiftPressed = false;
    }

    getWorkspaces() {
        let preliminaryBrowserWindow;
        let workspaces = [];

        // Try to get any window with workspaces wrapper
        for (let win of ucApi.Windows.getAll(true)) {
            if (win.document.body.natsumiWorkspacesWrapper) {
                preliminaryBrowserWindow = win;
                break;
            }
        }

        if (preliminaryBrowserWindow) {
            workspaces = preliminaryBrowserWindow.document.body.natsumiWorkspacesWrapper.getAllWorkspaceIDs();
        }

        return workspaces;
    }

    async init() {
        let node = document.getElementById(this.id);
        let isFloorp = false;
        let floorpWorkspacesEnabled = false;

        if (ucApi.Prefs.get("natsumi.browser.type").exists()) {
            if (ucApi.Prefs.get("natsumi.browser.type").value === "floorp") {
                isFloorp = true;

                if (ucApi.Prefs.get("floorp.workspaces.enabled").exists()) {
                    floorpWorkspacesEnabled = ucApi.Prefs.get("floorp.workspaces.enabled").value;
                }
            }
        }

        if (!node) {
            throw new Error("Could not find theme picker node.");
        }

        if (this.node) {
            console.warn("Theme picker node already initialized.");
            return;
        }

        this.node = node;

        if (this.singleColor) {
            node.setAttribute("natsumi-single-color", "");
        }

        if (!this.allowOpacity) {
            node.setAttribute("natsumi-no-opacity", "");
        }

        // Set up image upload
        this.fileUpload.setUploadCallback(() => {
            const fileId = this.fileUpload.currentFile;

            if (fileId) {
                this.setImage(fileId);
            } else {
                this.resetImage();
            }
        });
        const fileUploadNode = this.fileUpload.generateNode();
        const imageContainer = this.node.querySelector(".natsumi-custom-theme-image .natsumi-custom-theme-tool-container");
        imageContainer.insertBefore(fileUploadNode, imageContainer.firstChild);

        // Load theme data
        await this.changeWorkspace(this.workspace);

        if (this.colors.length > 0) {
            this.setLastSelected("0");
        }

        this.renderAngle();

        // Add listener to grid
        let customThemeColorGrid = this.node.querySelector(".natsumi-custom-theme-grid");
        customThemeColorGrid.addEventListener("click", (event) => {
            if (event.button !== 0) {
                return;
            }

            let relativeX = event.offsetX;
            let relativeY = event.offsetY;

            // Add a new color at the clicked position
            this.addNewColor(relativeX, relativeY);
        });
        customThemeColorGrid.addEventListener("mouseenter", () => {
            this.newColorAllowed = true;
        });
        customThemeColorGrid.addEventListener("mouseleave", () => {
            this.newColorAllowed = false;
        });

        // Add listeners for top controls
        for (let i = 0; i < this.availableLayers; i++) {
            let layerButton = this.node.querySelector(`.natsumi-custom-layer-${i + 1}`);
            layerButton.addEventListener("click", () => {
                this.loadLayer(i);
                layerButton.setAttribute("selected", "");

                for (let j = 0; j < this.availableLayers; j++) {
                    if (j !== i) {
                        this.node.querySelector(`.natsumi-custom-layer-${j + 1}`).removeAttribute("selected");
                    }
                }
            });
        }

        let lightModeButton = this.node.querySelector(".natsumi-custom-mode-light");
        let darkModeButton = this.node.querySelector(".natsumi-custom-mode-dark");

        if (!this.singleColor) {
            lightModeButton.addEventListener("click", () => {
                this.theme = "light";
                lightModeButton.setAttribute("selected", "");
                darkModeButton.removeAttribute("selected");
                this.loadLayer(this.layer);
            });
            darkModeButton.addEventListener("click", () => {
                this.theme = "dark";
                darkModeButton.setAttribute("selected", "");
                lightModeButton.removeAttribute("selected");
                this.loadLayer(this.layer);
            });
        }

        let importButton = this.node.querySelector(".natsumi-custom-import");
        let exportButton = this.node.querySelector(".natsumi-custom-export");

        if (!this.singleColor) {
            importButton.addEventListener("click", () => {
                this.import();
            });
            exportButton.addEventListener("click", () => {
                this.export();
            });
        }

        // Add listeners for gradient controls
        let presetButton = this.node.querySelector(".natsumi-preset-button");
        let gradientTypeButton = this.node.querySelector(".natsumi-gradient-button");
        let colorPositionButton = this.node.querySelector(".natsumi-position-button");
        let resetButton = this.node.querySelector(".natsumi-reset-button");
        let hexInput = this.node.querySelector(".natsumi-hex-input");
        let imageBlurOptions = this.node.querySelectorAll(".natsumi-image-blur-choice");
        let toolsButton = this.node.querySelector(".natsumi-tools-button");
        let hexButton = this.node.querySelector(".natsumi-custom-theme-hex-input .natsumi-custom-theme-tool-button");
        let grainButton = this.node.querySelector(".natsumi-custom-theme-grain .natsumi-custom-theme-tool-button");
        let customImageButton = this.node.querySelector(".natsumi-custom-theme-image .natsumi-custom-theme-tool-button");
        let textColorButton = this.node.querySelector(".natsumi-custom-theme-text-color .natsumi-custom-theme-tool-button");
        const actionButtons = [presetButton, gradientTypeButton, colorPositionButton, resetButton, toolsButton];

        if (!this.singleColor) {
            presetButton.addEventListener("click", () => {
                this.cyclePreset();
            });

            gradientTypeButton.addEventListener("click", () => {
                this.cycleGradientType();
            });

            if (enablePositionFreeform) {
                colorPositionButton.addEventListener("click", () => {
                    this.toggleManagedPosition();
                });
            } else {
                colorPositionButton.style.display = "none";
            }
        }

        for (let actionButton of actionButtons) {
            const actionButtonCallback = () => {
                if (Array.from(actionButton.classList).includes("natsumi-preset-button")) {
                    this.displayAction("Preset", colorPresetNames[this.preset]);
                } else if (Array.from(actionButton.classList).includes("natsumi-gradient-button")) {
                    this.displayAction("Gradient", gradientTypeNames[this.gradientType]);
                } else if (Array.from(actionButton.classList).includes("natsumi-position-button")) {
                    let actionString = "Freeform";
                    if (this.managedPosition) {
                        actionString = "Managed";
                    }

                    this.displayAction("Color positions", actionString);
                } else if (Array.from(actionButton.classList).includes("natsumi-reset-button")) {
                    this.displayAction("Reset", "Reset theme layer");
                } else if (Array.from(actionButton.classList).includes("natsumi-tools-button")) {
                    this.displayAction("Tools", "Open tools");
                } else {
                    this.displayAction("Unknown", "Unknown action");
                }
            }
            actionButton.addEventListener("mouseenter", () => {actionButtonCallback()});
            actionButton.addEventListener("click", () => {actionButtonCallback()});
            actionButton.addEventListener("mouseleave", () => {
                this.hideAction();
            });
        }

        resetButton.addEventListener("click", () => {
            this.removeImage();
            this.removeAllColors();
        });

        toolsButton.addEventListener("click", () => {
            let toolsContainer = this.node.querySelector(".natsumi-custom-theme-tools-container");

            if (toolsContainer.hasAttribute("hidden")) {
                toolsContainer.removeAttribute("hidden");
            } else {
                toolsContainer.setAttribute("hidden", "");
            }
        });

        hexButton.addEventListener("click", () => {
            let hexInputContainer = this.node.querySelector(".natsumi-custom-theme-hex-input .natsumi-custom-theme-tool-container");
            if (hexInputContainer.hasAttribute("hidden")) {
                hexInputContainer.removeAttribute("hidden");
            } else {
                hexInputContainer.setAttribute("hidden", "");
                this.node.querySelector(".natsumi-hex-input").value = "";
            }
        });

        grainButton.addEventListener("click", () => {
            let grainSliderContainer = this.node.querySelector(".natsumi-custom-theme-grain .natsumi-custom-theme-tool-container");
            if (grainSliderContainer.hasAttribute("hidden")) {
                grainSliderContainer.removeAttribute("hidden");
            } else {
                grainSliderContainer.setAttribute("hidden", "");
            }
        })

        customImageButton.addEventListener("click", () => {
            let customImageContainer = this.node.querySelector(".natsumi-custom-theme-image .natsumi-custom-theme-tool-container");
            if (customImageContainer.hasAttribute("hidden")) {
                customImageContainer.removeAttribute("hidden");
            } else {
                customImageContainer.setAttribute("hidden", "");
            }
        })

        imageBlurOptions.forEach(button => {
            button.addEventListener("click", () => {
                this.setImageBlur(button.getAttribute("value"));
                this.renderMisc();
                this.saveLayer();
            });
        });

        textColorButton.addEventListener("click", () => {
            let grainSliderContainer = this.node.querySelector(".natsumi-custom-theme-text-color .natsumi-custom-theme-tool-container");
            if (grainSliderContainer.hasAttribute("hidden")) {
                grainSliderContainer.removeAttribute("hidden");
            } else {
                grainSliderContainer.setAttribute("hidden", "");
            }
        })

        // Add listener for HEX input field
        hexInput.addEventListener("keydown", (event) => {
            if (event.key === "Enter") {
                event.preventDefault();
                let hexCode = hexInput.value.trim();

                if (!hexCode) {
                    alert("Please enter a valid HEX code.");
                    return;
                }

                try {
                    this.addNewColorHex(hexCode);
                    hexInput.value = "";
                } catch (e) {
                    alert(e.message || "Invalid HEX code.");
                }
            }
        });

        // Add listener for HEX submit button
        let hexSubmitButton = this.node.querySelector(".natsumi-hex-submit");
        hexSubmitButton.addEventListener("click", () => {
            let hexInputNode = this.node.querySelector(".natsumi-hex-input");
            let hexCode = hexInputNode.value.trim();

            if (!hexCode) {
                alert("Please enter a valid HEX code.");
                return;
            }

            try {
                this.addNewColorHex(hexCode);
                hexInputNode.value = "";
            } catch (e) {
                alert(e.message || "Invalid HEX code.");
            }
        });

        // Add listeners for sliders
        let luminositySliderNode = this.node.querySelector(".natsumi-color-slider-luminosity");
        let opacitySliderNode = this.node.querySelector(".natsumi-color-slider-opacity");
        let grainSliderNode = this.node.querySelector(".natsumi-color-slider-grain");
        let imageOpacitySliderNode = this.node.querySelector(".natsumi-color-slider-image-opacity");

        luminositySliderNode.addEventListener("mousedown", (event) => {
            event.stopPropagation();
            event.preventDefault();
            this.sliderEvent("luminosity", event);
        });

        if (this.allowOpacity) {
            opacitySliderNode.addEventListener("mousedown", (event) => {
                event.stopPropagation();
                event.preventDefault();
                this.sliderEvent("opacity", event);
            });
        }

        grainSliderNode.addEventListener("mousedown", (event) => {
            event.stopPropagation();
            event.preventDefault();
            this.sliderEvent("grain", event);
        });

        imageOpacitySliderNode.addEventListener("mousedown", (event) => {
            event.stopPropagation();
            event.preventDefault();
            this.sliderEvent("image-opacity", event);
        });

        // Add listener for gradient angle
        let gradientAngleNode = this.node.querySelector(".natsumi-gradient-angle");
        gradientAngleNode.addEventListener("mousedown", (event) => {
            event.stopPropagation();
            event.preventDefault();

            document.onmouseup = this.resetListeners;
            document.onmousemove = (event => {
                let relativeX = event.clientX - gradientAngleNode.getBoundingClientRect().left;
                let relativeY = event.clientY - gradientAngleNode.getBoundingClientRect().top;
                this.moveAngle(relativeX, relativeY);
            });
        });
        document.addEventListener("keydown", (event) => {
            this.shiftPressed = event.shiftKey;
        })
        document.addEventListener("keyup", (event) => {
            this.shiftPressed = event.shiftKey;
        });

        if (isFloorp && floorpWorkspacesEnabled) {
            // Set up workspace selector
            let workspaceSelectorContainerNode = this.node.querySelector(".natsumi-custom-theme-target-workspace");

            // Create workspace selector
            let workspaceSelectorNode = document.createElement("select");
            workspaceSelectorNode.classList.add("natsumi-custom-theme-workspace-selector");

            // Add options
            let defaultOptionNode = document.createElement("option");
            defaultOptionNode.setAttribute("value", "default");
            defaultOptionNode.setAttribute("selected", "selected");
            defaultOptionNode.textContent = "All Workspaces";
            workspaceSelectorNode.appendChild(defaultOptionNode);

            let workspaceData = JSON.parse(ucApi.Prefs.get("floorp.workspaces.v4.store").value);
            if (workspaceData && workspaceData["data"]) {
                for (let workspaceEntry of workspaceData["data"]) {
                    const workspaceId = workspaceEntry[0];
                    const workspaceName = workspaceEntry[1]["name"];

                    let workspaceOptionNode = document.createElement("option");
                    workspaceOptionNode.setAttribute("value", workspaceId);
                    workspaceOptionNode.textContent = workspaceName;
                    workspaceSelectorNode.appendChild(workspaceOptionNode);
                }
            }

            workspaceSelectorNode.addEventListener("change", async (event) => {
                let selectedWorkspaceId = event.target.value ?? null;

                if (selectedWorkspaceId === "default") {
                    selectedWorkspaceId = null;
                }

                await this.changeWorkspace(selectedWorkspaceId);
            });

            workspaceSelectorContainerNode.appendChild(workspaceSelectorNode);
        }
    }

    async changeWorkspace(workspaceId = null) {
        this.workspace = workspaceId;
        let fetchedWorkspaceData = await getTheme(workspaceId, true);

        if (fetchedWorkspaceData) {
            this.data = fetchedWorkspaceData;
        } else {
            this.data = {"light": {"0": {}, "1": {}}, "dark": {"0": {}, "1": {}}};
        }

        this.loadLayer(this.layer);
    }

    async import() {
        let uploadNode = document.createElement("input");
        uploadNode.type = "file";
        uploadNode.accept = ".json";
        uploadNode.style.display = "none";
        uploadNode.setAttribute("moz-accept", ".json");
        uploadNode.setAttribute("accept", ".json");
        uploadNode.click();

        let uploadTimeout;

        const filePromise = new Promise((resolve, reject) => {
            uploadNode.onchange = () => {
                if (uploadTimeout) {
                    clearTimeout(uploadTimeout);
                }

                const file = uploadNode.files[0];
                if (!file) {
                    reject("No file selected.");
                    return;
                }

                resolve(file);
            };

            uploadNode.onabort = () => {
                if (uploadTimeout) {
                    clearTimeout(uploadTimeout);
                }
                reject("User aborted import.");
            }

            uploadTimeout = setTimeout(() => {
                reject("Import timed out.");
            }, 120000);
        });

        try {
            const content = await filePromise;
            uploadNode.remove();
            const text = await content.text();
            let toLoad = JSON.parse(text);

            if (!toLoad["version"]) {
                toLoad["version"] = 1;
            }

            this.data = this.loaderMethod(toLoad, false);
        } catch(e) {
            console.error("Import failed:", e);

            if (e.message !== "Import timed out.") {
                let notification = new NatsumiNotification(
                    "Theme import failed.",
                    "Either the theme is corrupted or something went wrong with the import process.",
                    "chrome://natsumi/content/icons/lucide/caution.svg",
                    10000,
                    "caution"
                );
                notification.addToContainer();
            }

            return;
        }

        this.loadLayer(this.layer);
        this.saveLayer();

        let notification = new NatsumiNotification("Theme imported successfully!", null, "chrome://natsumi/content/icons/lucide/download.svg");
        notification.addToContainer();
    }

    export() {
        const dataString = JSON.stringify(this.data, null, 4);
        const blob = new Blob([dataString], { type: "application/json" });
        const exportUrl = URL.createObjectURL(blob);
        let downloadNode = document.createElement("a");
        downloadNode.href = exportUrl;
        downloadNode.download = "natsumi-gradient.json";

        try {
            document.body.appendChild(downloadNode);
            downloadNode.click();
            let notification = new NatsumiNotification("Theme exported successfully!", null, "chrome://natsumi/content/icons/lucide/upload.svg");
            notification.addToContainer();
        } catch(e) {
            console.error("Failed to export theme data:", e);
        }

        downloadNode.remove();
        URL.revokeObjectURL(exportUrl);
    }

    loadSingleColor() {
        this.colors = [];
        if (this.data["color"]) {
            this.colors.push(this.data["color"]);
        }
    }

    loadLayer(layer) {
        if (this.singleColor) {
            this.loadSingleColor();
            return;
        }

        if (layer < 0 || layer >= this.availableLayers) {
            return;
        }

        this.layer = layer;
        this.gradientType = "linear";
        this.angle = 0;
        this.colors = [];
        this.textColor = {"enabled": false, "hue": 0, "saturation": 0, "value": 0};
        this.preset = null;
        this.lastSelected = null;
        this.managedPosition = true;

        if (!this.data[this.theme]) {
            return;
        }

        if (!this.data[this.theme][`${layer}`]) {
            return;
        }

        if (this.data[this.theme][`${layer}`]["background"]) {
            let layerData = this.data[this.theme][`${layer}`];

            if (layerData["background"]["type"]) {
                this.gradientType = layerData["background"]["type"];
            }

            if (layerData["background"]["angle"]) {
                this.angle = layerData["background"]["angle"];
            }

            if (layerData["background"]["preset"]) {
                this.preset = layerData["background"]["preset"];
            }

            if (layerData["background"]["colors"]) {
                this.colors = layerData["background"]["colors"];
            }

            if (this.colors.length > 0) {
                this.lastSelected = "0";
            }
        }

        if (this.data[this.theme]["grain"]) {
            this.grain = this.data[this.theme]["grain"];
        } else {
            this.grain = 0;
        }

        if (this.data[this.theme]["managedPosition"]) {
            this.managedPosition = this.data[this.theme]["managedPosition"];
        }

        if (this.data[this.theme]["textColor"]) {
            this.textColor = this.data[this.theme]["textColor"];
        }

        this.customImageOpacity = 1;
        this.customImageBlur = "none";

        if (this.data[this.theme][`${layer}`]["image"]) {
            this.customImage = this.data[this.theme][`${layer}`]["image"]["id"];
            this.customImageOpacity = this.data[this.theme][`${layer}`]["image"]["opacity"] ?? 1;
            this.customImageBlur = this.data[this.theme][`${layer}`]["image"]["blur"] ?? "none";
        } else {
            this.customImage = null;
        }

        this.renderGrid();
        this.renderSliders();
        this.renderAngle();
        this.renderMisc();
    }

    async saveLayer() {
        let usedColors = 0;

        if (this.singleColor) {
            usedColors = 1;
            this.data["color"] = this.colors[0];
        } else {
            this.data[this.theme][`${this.layer}`] = {
                "background": {
                    "type": this.gradientType,
                    "angle": this.angle,
                    "preset": this.preset,
                    "colors": this.colors
                }
            };

            for (let theme of ["light", "dark"]) {
                let themeData = this.data[theme];

                if (!themeData) {
                    continue;
                }

                for (let themeLayer of Object.keys(themeData)) {
                    let layerData = themeData[themeLayer];

                    if (!layerData) {
                        continue;
                    }

                    let hasImage = false;
                    if (layerData["image"]) {
                        hasImage = layerData["image"]["id"] !== undefined;
                    }

                    if (!layerData["background"] && !hasImage) {
                        continue;
                    }

                    if (layerData["background"] && layerData["background"]["colors"]) {
                        usedColors += layerData["background"]["colors"].length;
                    }

                    if (hasImage) {
                        usedColors += 1;
                    }
                }
            }

            if (this.customImage) {
                this.data[this.theme][`${this.layer}`]["image"] = {
                    "id": this.customImage,
                    "opacity": this.customImageOpacity,
                    "blur": this.customImageBlur
                };
                usedColors += 1;
            } else {
                this.data[this.theme][`${this.layer}`]["image"] = {};
            }
        }

        this.data["version"] = this.version;
        this.data[this.theme]["grain"] = this.grain;
        this.data[this.theme]["managedPosition"] = this.managedPosition;

        let themeDirectoryPath = PathUtils.join(PathUtils.profileDir, "natsumi-themes");
        let themePath = PathUtils.join(themeDirectoryPath, "master.json");
        if (this.workspace) {
            themePath = PathUtils.join(themeDirectoryPath, `${this.workspace}.json`);
        }

        if (usedColors === 0) {
            // Delete file
            try {
                await IOUtils.remove(themePath);
            } catch (e) {
                // Ignore error
            }
        } else {
            try {
                await IOUtils.writeJSON(themePath, this.data);
            } catch (e) {
                console.error("Failed to save customization data:", e);
                return;
            }
        }

        this.applyMethod();
    }

    generateNode() {
        let nodeString = `
            <div id="${this.id}" class="natsumi-custom-theme-container">
                <div class="natsumi-custom-theme-picker">
                    <div class="natsumi-custom-theme-target-workspace">
                    </div>
                    <div class="natsumi-custom-theme-top-controls">
                        <div class="natsumi-custom-theme-top-button natsumi-custom-layer-1" selected=""></div>
                        <div class="natsumi-custom-theme-top-button natsumi-custom-layer-2"></div>
                        <div class="natsumi-custom-theme-top-separator"></div>
                        <div class="natsumi-custom-theme-top-button natsumi-custom-mode-light" selected=""></div>
                        <div class="natsumi-custom-theme-top-button natsumi-custom-mode-dark"></div>
                        <div class="natsumi-custom-theme-top-separator"></div>
                        <div class="natsumi-custom-theme-top-button natsumi-custom-import"></div>
                        <div class="natsumi-custom-theme-top-button natsumi-custom-export"></div>
                    </div>
                    <div class="natsumi-custom-theme-colors-container">
                        <div class="natsumi-custom-theme-position-container">
                            
                        </div>
                        <div class="natsumi-custom-theme-grid-container">
                            <div class="natsumi-custom-theme-grid"></div>
                            <div class="natsumi-custom-theme-empty">
                                Click anywhere on the grid to add a color.<br/>
                                Right-click on a color to remove it.
                            </div>
                            <div class="natsumi-custom-theme-action-text">
                                <div class="natsumi-custom-theme-action-type"></div>
                                <div class="natsumi-custom-theme-action-value"></div>
                            </div>
                        </div>
                    </div>
                    <div class="natsumi-custom-theme-controls">
                        <div class="natsumi-custom-theme-controls-button natsumi-preset-button">
                            <div class="natsumi-custom-theme-controls-icon"></div>
                        </div>
                        <div class="natsumi-custom-theme-controls-button natsumi-gradient-button">
                            <div class="natsumi-custom-theme-controls-icon"></div>
                        </div>
                        <div class="natsumi-custom-theme-controls-button natsumi-position-button">
                            <div class="natsumi-custom-theme-controls-icon"></div>
                        </div>
                        <div class="natsumi-custom-theme-controls-button natsumi-reset-button">
                            <div class="natsumi-custom-theme-controls-icon"></div>
                        </div>
                        <div class="natsumi-custom-theme-controls-button natsumi-tools-button">
                            <div class="natsumi-custom-theme-controls-icon"></div>
                        </div>
                    </div>
                    <div class="natsumi-custom-theme-tools-container" hidden="">
                        <div class="natsumi-custom-theme-tool natsumi-custom-theme-hex-input">
                            <div class="natsumi-custom-theme-tool-button">
                                <div class="natsumi-custom-theme-tool-icon"></div>
                                <div class="natsumi-custom-theme-tool-label">
                                    HEX code input
                                </div>
                            </div>
                            <div class="natsumi-custom-theme-tool-container" hidden="">
                                <html:input class="natsumi-hex-input" type="text" placeholder="HEX code (e.g. #ff0000)" maxlength="8"/>
                                <div class="natsumi-hex-submit"></div>
                            </div>
                        </div>
                        <div class="natsumi-custom-theme-tool natsumi-custom-theme-grain">
                            <div class="natsumi-custom-theme-tool-button">
                                <div class="natsumi-custom-theme-tool-icon"></div>
                                <div class="natsumi-custom-theme-tool-label">
                                    Grain
                                </div>
                            </div>
                            <div class="natsumi-custom-theme-tool-container" hidden="">
                                <div class="natsumi-custom-theme-slider natsumi-color-slider-grain">
                                    <div class="natsumi-custom-theme-slider-icon-1"></div>
                                    <div class="natsumi-custom-theme-slider-icon-0"></div>
                                </div>
                            </div>
                        </div>
                        <div class="natsumi-custom-theme-tool natsumi-custom-theme-image">
                            <div class="natsumi-custom-theme-tool-button">
                                <div class="natsumi-custom-theme-tool-icon"></div>
                                <div class="natsumi-custom-theme-tool-label">
                                    Image
                                </div>
                            </div>
                            <div class="natsumi-custom-theme-tool-container" hidden="">
                                <div class="natsumi-custom-theme-slider natsumi-color-slider-image-opacity">
                                    <div class="natsumi-custom-theme-slider-icon-1"></div>
                                    <div class="natsumi-custom-theme-slider-icon-0"></div>
                                </div>
                                <div class="natsumi-image-blur">
                                    <div class="natsumi-image-blur-label">
                                        Image blur
                                    </div>
                                    <radiogroup class="natsumi-image-blur-select" value="none">
                                        <radio class="natsumi-image-blur-choice" value="none" selected="true">
                                            <image class="radio-check" selected="true"></image>
                                            <hbox class="radio-label-box" align="center" flex="1">
                                                <image class="radio-icon"></image>
                                                <label class="radio-label" flex="1">
                                                    None
                                                </label>
                                            </hbox>
                                        </radio>
                                        <radio class="natsumi-image-blur-choice" value="light">
                                            <image class="radio-check"></image>
                                            <hbox class="radio-label-box" align="center" flex="1">
                                                <image class="radio-icon"></image>
                                                <label class="radio-label" flex="1">
                                                    Light
                                                </label>
                                            </hbox>
                                        </radio>
                                        <radio class="natsumi-image-blur-choice" value="medium">
                                            <image class="radio-check"></image>
                                            <hbox class="radio-label-box" align="center" flex="1">
                                                <image class="radio-icon"></image>
                                                <label class="radio-label" flex="1">
                                                    Medium
                                                </label>
                                            </hbox>
                                        </radio>
                                        <radio class="natsumi-image-blur-choice" value="strong">
                                            <image class="radio-check"></image>
                                            <hbox class="radio-label-box" align="center" flex="1">
                                                <image class="radio-icon"></image>
                                                <label class="radio-label" flex="1">
                                                    Strong
                                                </label>
                                            </hbox>
                                        </radio>
                                    </radiogroup>
                                </div>
                            </div>
                        </div>
                        <div class="natsumi-custom-theme-tool natsumi-custom-theme-text-color" hidden="${!enableTextColor}">
                            <div class="natsumi-custom-theme-tool-button">
                                <div class="natsumi-custom-theme-tool-icon"></div>
                                <div class="natsumi-custom-theme-tool-label">
                                    Text and icon color
                                </div>
                            </div>
                            <div class="natsumi-custom-theme-tool-container" hidden="">
                                <div class="natsumi-custom-theme-slider natsumi-color-slider-text-color-hue">
                                    <div class="natsumi-custom-theme-slider-icon-1"></div>
                                </div>
                                <div class="natsumi-custom-theme-slider natsumi-color-slider-text-color-saturation">
                                    <div class="natsumi-custom-theme-slider-icon-1"></div>
                                </div>
                                <div class="natsumi-custom-theme-slider natsumi-color-slider-text-color-value">
                                    <div class="natsumi-custom-theme-slider-icon-1"></div>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="natsumi-custom-theme-bottom-controls">
                        <div class="natsumi-custom-theme-sliders">
                            <div class="natsumi-custom-theme-luminosity">
                                <div class="natsumi-custom-theme-slider natsumi-color-slider-luminosity">
                                    <div class="natsumi-custom-theme-slider-icon-1"></div>
                                    <div class="natsumi-custom-theme-slider-icon-0"></div>
                                </div>
                            </div>
                            <div class="natsumi-custom-theme-opacity">
                                <div class="natsumi-custom-theme-slider natsumi-color-slider-opacity">
                                    <div class="natsumi-custom-theme-slider-icon-1"></div>
                                    <div class="natsumi-custom-theme-slider-icon-0"></div>
                                </div>
                            </div>
                        </div>
                        <div class="natsumi-custom-theme-angle">
                            <div class="natsumi-gradient-angle"></div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        return convertToXUL(nodeString);
    }

    displayAction(actionType, actionValue) {
        let actionTypeNode = this.node.querySelector(".natsumi-custom-theme-action-type");
        let actionValueNode = this.node.querySelector(".natsumi-custom-theme-action-value");
        let gridContainerNode = this.node.querySelector(".natsumi-custom-theme-grid-container");

        actionTypeNode.innerHTML = actionType;
        actionValueNode.innerHTML = actionValue;

        gridContainerNode.setAttribute("natsumi-action-displayed", "");
    }

    hideAction() {
        let gridContainerNode = this.node.querySelector(".natsumi-custom-theme-grid-container");
        gridContainerNode.removeAttribute("natsumi-action-displayed");
    }

    calculateAngleRadiusGrid(relativeX, relativeY, radian = false) {
        let gridWidth = Math.max(this.node.querySelector(".natsumi-custom-theme-grid").getBoundingClientRect().width, 300);
        let gridHeight = Math.max(this.node.querySelector(".natsumi-custom-theme-grid").getBoundingClientRect().height, 300);

        return this.calculateAngleRadius(relativeX, relativeY, gridWidth, gridHeight, radian);
    }

    calculateAngleRadiusPos(relativeX, relativeY, radian = false) {
        let gridWidth = 355;
        let gridHeight = 355;

        return this.calculateAngleRadius(relativeX, relativeY, gridWidth, gridHeight, radian);
    }

    calculateAngleRadius(relativeX, relativeY, width, height, radian = false, lockRadius = false) {
        // Calculate the center of object
        let centerX = width / 2;
        let centerY = height / 2;

        // Calculate the angle and radius from the center
        let angle = Math.atan2(relativeY - centerY, relativeX - centerX) + (0.5 * Math.PI);
        let radius = Math.sqrt(Math.pow(relativeX - centerX, 2) + Math.pow(relativeY - centerY, 2)) / (width / 2);

        if (angle < 0 || angle >= (2 * Math.PI)) {
            angle = (angle + (2 * Math.PI)) % (2 * Math.PI);
        }

        if (!radian) {
            angle = angle * (180 / Math.PI);
        }

        if (radius > centerX) {
            // Cap radius
            radius = centerX;
        }

        if (lockRadius) {
            radius = 1;
        }

        return {"angle": angle, "radius": Math.min(radius, 1)};
    }

    calculatePositionGrid(angle, radius, radian = false) {
        let gridWidth = Math.max(this.node.querySelector(".natsumi-custom-theme-grid").getBoundingClientRect().width, 300);
        let gridHeight = Math.max(this.node.querySelector(".natsumi-custom-theme-grid").getBoundingClientRect().height, 300);

        return this.calculatePosition(angle, radius, gridWidth, gridHeight, radian);
    }

    calculatePositionPos(position, radian = false) {
        let gridWidth = 355;
        let gridHeight = 355;
        let angle = position * 300 - 150;

        return this.calculatePosition(angle, 1, gridWidth, gridHeight, radian);
    }

    calculatePosition(angle, radius, width, height, radian = false) {
        if (!radian) {
            angle = angle * (Math.PI / 180); // Convert to radians
        }

        // Ensure radius is within bounds
        radius = Math.max(0, Math.min(radius, 1));
        angle = angle % (2 * Math.PI) - (0.5 * Math.PI);

        // Calculate the center of the grid
        let centerX = width / 2;
        let centerY = height / 2;

        // Calculate the position based on angle and radius
        let posX = centerX - 24 + (centerX * radius * Math.cos(angle));
        let posY = centerY - 24 + (centerX * radius * Math.sin(angle));

        return {"x": posX, "y": posY};
    }

    normalizeAngle(angle) {
        return (angle + 360) % 360;
    }

    hsbToHsl(h, s, b) {
        const l = (b / 100) * (100 - s / 2);
        s = l === 0 || l === 1 ? 0 : ((b - l) / Math.min(l, 100 - l)) * 100;
        return {"hue": h, "saturation": s, "luminosity": l};
    }

    rgbToHsb(r, g, b) {
        r /= 255;
        g /= 255;
        b /= 255;

        const max = Math.max(r, g, b);
        const min = Math.min(r, g, b);
        const delta = max - min;

        // Calculate hue
        let hue = 0;
        if (delta > 0) {
            switch (max) {
                case r:
                    hue = this.normalizeAngle(60 * ((g - b) / delta % 6));
                    break;
                case g:
                    hue = this.normalizeAngle(60 * ((b - r) / delta + 2));
                    break;
                case b:
                    hue = this.normalizeAngle(60 * ((r - g) / delta + 4));
                    break;
            }
        }

        // Calculate saturation
        let saturation = 0;
        if (max !== 0) {
            saturation = delta / max;
        }

        return {"hue": hue, "saturation": saturation, "value": max};
    }

    generateCssColorCode(hue, saturation, brightness, alpha) {
        let hslColor = this.hsbToHsl(hue, saturation, brightness);
        return `hsla(${hue}, ${hslColor.saturation}%, ${Math.floor(hslColor.luminosity * 100)}%, ${alpha})`;
    }

    generateCssColorCodeFromData(colorData, full_value = false) {
        const hue = Math.floor(colorData["angle"]);
        const saturation = Math.floor(colorData["radius"] * 100);
        let value = colorData["value"] ?? 1;
        let opacity = colorData["opacity"] ?? 1;

        if (full_value) {
            value = 1;
            opacity = 1;
        }

        return this.generateCssColorCode(hue, saturation, value, opacity);
    }

    resetListeners() {
        document.onmouseup = null;
        document.onmousemove = null;
    }

    ensureOrder() {
        if (this.singleColor) {
            return;
        }

        let presetOrder = null;
        if (this.preset) {
            presetOrder = colorPresetOrders[this.preset];
        }

        for (let index in this.colors) {
            if (presetOrder) {
                this.colors[index]["order"] = presetOrder[Number.parseInt(index)];
            } else {
                this.colors[index]["order"] = Number.parseInt(index);
            }
        }
    }

    ensurePreset() {
        if (this.singleColor) {
            return;
        }

        this.ensureOrder();

        if (this.preset) {
            const presetOffsets = colorPresetOffsets[this.preset];

            for (let colorIndex in this.colors) {
                if (Number.parseInt(colorIndex) in presetOffsets) {
                    this.colors[colorIndex]["angle"] = (this.colors[0]["angle"] + presetOffsets[Number.parseInt(colorIndex)]) % 360;
                    this.colors[colorIndex]["radius"] = this.colors[0]["radius"];
                    this.colors[colorIndex]["value"] = this.colors[0]["value"];
                    this.colors[colorIndex]["opacity"] = this.colors[0]["opacity"];
                    this.colors[colorIndex]["code"] = this.generateCssColorCodeFromData(this.colors[colorIndex]);
                } else {
                    console.warn(`No preset offset for color index ${colorIndex} in preset ${this.preset}`);
                }
            }
        }
    }

    renderGrid() {
        let gridContainerNode = this.node.querySelector(".natsumi-custom-theme-grid-container");

        if (this.colors.length === 0) {
            gridContainerNode.setAttribute("natsumi-is-empty", "");
        } else {
            gridContainerNode.removeAttribute("natsumi-is-empty");
        }

        let gridNode = this.node.querySelector(".natsumi-custom-theme-grid");
        let positionNode = this.node.querySelector(".natsumi-custom-theme-position-container");
        let newColors = this.colors.length;
        let currentColors = gridNode.querySelectorAll(".natsumi-custom-theme-color");
        let currentColorPositions = gridNode.querySelectorAll(".natsumi-custom-theme-position-color");
        const replaceColors = (newColors !== currentColors.length);

        if (replaceColors) {
            gridNode.innerHTML = "";
        }

        if (this.preset) {
            this.ensurePreset();
        } else {
            this.ensureOrder();
        }

        let selectedColorData = null
        if (this.lastSelected !== null && this.lastSelected in this.colors) {
            selectedColorData = this.colors[this.lastSelected];
        }
        if (this.preset) {
            selectedColorData = this.colors["0"];
        }

        let sliderColor = null;
        let colorPickerNode = this.node.querySelector(".natsumi-custom-theme-picker");

        if (selectedColorData) {
            sliderColor = this.generateCssColorCodeFromData(selectedColorData, true);

            if ((45 <= selectedColorData["angle"] && selectedColorData["angle"] <= 205) || selectedColorData["radius"] <= 0.5) {
                colorPickerNode.style.setProperty("--natsumi-slider-custom-stroke", "black");
            } else {
                colorPickerNode.style.setProperty("--natsumi-slider-custom-stroke", "white");
            }
        } else {
            sliderColor = "#ff0000";
            colorPickerNode.style.removeProperty("--natsumi-slider-custom-stroke");
        }

        colorPickerNode.style.setProperty("--natsumi-last-selected-color", sliderColor);

        for (let colorIndex in this.colors) {
            let colorData = this.colors[colorIndex];

            // Process color grid entry
            let colorNode;

            if (replaceColors) {
                colorNode = document.createElement("div");
                colorNode.classList.add("natsumi-custom-theme-color");
            } else {
                colorNode = currentColors[colorIndex];
            }

            colorNode.style.setProperty("--natsumi-selected-color", `${colorData.code}`);

            if (replaceColors) {
                let colorDisplayNode = document.createElement("div");
                colorDisplayNode.classList.add("natsumi-custom-theme-color-display");
                colorNode.appendChild(colorDisplayNode);
            }

            if (colorIndex === "0") {
                colorNode.classList.add("natsumi-custom-theme-primary-color");
            }

            if (colorIndex === this.lastSelected) {
                colorNode.setAttribute("selected", "");
            } else {
                colorNode.removeAttribute("selected");
            }

            let colorNodePosition = this.calculatePositionGrid(colorData.angle, colorData.radius);
            colorNode.style.translate = `${colorNodePosition.x}px ${colorNodePosition.y}px`;
            colorNode.style.setProperty("--natsumi-color-index", `"${colorData.order + 1}"`);

            if ((45 <= colorData.angle && colorData.angle <= 205 && colorData.value >= 0.8 && colorData.opacity >= 0.6) || (colorData.radius <= 0.5 && colorData.value >= 0.8)) {
                colorNode.style.setProperty("--natsumi-color-index-color", "black");
            } else if (colorData.opacity < 0.6 && colorData.value >= 0.8) {
                colorNode.style.setProperty("--natsumi-color-index-color", "light-dark(black, white)");
            } else {
                colorNode.style.setProperty("--natsumi-color-index-color", "white");
            }

            if (replaceColors) {
                gridNode.appendChild(colorNode);
                colorNode.addEventListener("mousedown", (event) => {
                    event.stopPropagation();
                    event.preventDefault();

                    let gridContainerNode = this.node.querySelector(".natsumi-custom-theme-grid-container");
                    gridContainerNode.setAttribute("natsumi-color-dragging", "");

                    document.onmouseup = () => {
                        gridContainerNode.removeAttribute("natsumi-color-dragging");
                        this.resetListeners();
                    }
                    document.onmousemove = (event => {
                        let observeColorIndex = colorIndex;

                        if (this.preset) {
                            observeColorIndex = "0";
                        }

                        let relativeX = event.clientX - gridNode.getBoundingClientRect().left;
                        let relativeY = event.clientY - gridNode.getBoundingClientRect().top;
                        this.moveColor(observeColorIndex, relativeX, relativeY);
                    });
                });
                colorNode.addEventListener("contextmenu", (event) => {
                    event.stopPropagation();
                    event.preventDefault();
                    this.removeColor(colorIndex);
                });
                colorNode.addEventListener("click", (event) => {
                    event.stopPropagation();
                    event.preventDefault();
                    this.setLastSelected(colorIndex);
                });
            }

            // Process color position entry
            if (enablePositionFreeform) {
                let colorPosNode;

                if (replaceColors) {
                    colorPosNode = document.createElement("div");
                    colorPosNode.classList.add("natsumi-custom-theme-position-color");
                } else {
                    colorPosNode = currentColorPositions[colorIndex];
                }

                colorPosNode.style.setProperty("--natsumi-selected-color", `${colorData.code}`);

                if (replaceColors) {
                    let colorDisplayNode = document.createElement("div");
                    colorDisplayNode.classList.add("natsumi-custom-theme-position-color-display");
                    colorPosNode.appendChild(colorDisplayNode);
                }

                let colorPosNodePosition = this.calculatePositionPos(colorData.position);
                colorPosNode.style.translate = `${colorPosNodePosition.x}px ${colorPosNodePosition.y}px`;
                colorPosNode.style.setProperty("--natsumi-color-index", `"${colorData.order + 1}"`);

                if ((45 <= colorData.angle && colorData.angle <= 205 && colorData.value >= 0.8 && colorData.opacity >= 0.6) || (colorData.radius <= 0.5 && colorData.value >= 0.8)) {
                    colorPosNode.style.setProperty("--natsumi-color-index-color", "black");
                } else if (colorData.opacity < 0.6 && colorData.value >= 0.8) {
                    colorPosNode.style.setProperty("--natsumi-color-index-color", "light-dark(black, white)");
                } else {
                    colorPosNode.style.setProperty("--natsumi-color-index-color", "white");
                }

                if (replaceColors) {
                    positionNode.appendChild(colorPosNode);
                }

                colorPosNode.addEventListener("mousedown", (event) => {
                    event.stopPropagation();
                    event.preventDefault();

                    let gridPositionNode = this.node.querySelector(".natsumi-custom-theme-position-container");
                    gridPositionNode.setAttribute("natsumi-color-dragging", "");

                    document.onmouseup = () => {
                        gridPositionNode.removeAttribute("natsumi-color-dragging");
                        this.resetListeners();
                    }
                    document.onmousemove = (event => {
                        let relativeX = event.clientX - gridPositionNode.getBoundingClientRect().left;
                        let relativeY = event.clientY - gridPositionNode.getBoundingClientRect().top;
                        this.moveColor(colorIndex, relativeX, relativeY);
                    });
                });
            }
        }
    }

    addNewColor(relativeX, relativeY) {
        if (!this.newColorAllowed) {
            return;
        }

        let maxColors = 6;
        if (ucApi.Prefs.get("natsumi.theme.max-custom-colors").exists()) {
            maxColors = Math.max(6, ucApi.Prefs.get("natsumi.theme.max-custom-colors").value);
        }

        if (this.singleColor) {
            maxColors = 1;
        }

        if (this.colors.length >= maxColors) {
            return;
        }

        if (this.preset) {
            this.preset = null;
        }

        const circlePosData = this.calculateAngleRadiusGrid(relativeX, relativeY);
        const hue = Math.floor(circlePosData["angle"]);
        const saturation = Math.floor(circlePosData["radius"] * 100);
        const value = 1;
        const opacity = 1;

        // Add new color
        const colorData = {
            "code": this.generateCssColorCode(hue, saturation, value, opacity),
            "angle": circlePosData["angle"],
            "radius": circlePosData["radius"],
            "value": value,
            "opacity": opacity,
            "order": this.colors.length,
            "position": 1
        }
        this.colors.push(colorData);

        // Set managed position
        this.managedPosition = true;
        this.ensureManagedPosition();

        this.setLastSelected(`${this.colors.length - 1}`);
        this.saveLayer();
    }

    addNewColorHex(code) {
        if (code.startsWith("#")) {
            code = code.slice(1);
        }

        if (code.length !== 6 && (code.length !== 8 && this.allowOpacity)) {
            throw new Error("This is not a valid HEX code.");
        }

        if (!/^[0-9a-fA-F]{6}$/.test(code) && !/^[0-9a-fA-F]{8}$/.test(code)) {
            throw new Error("This is not a valid HEX code.");
        }

        if (this.preset) {
            this.preset = null;
        }

        const r = parseInt(code.slice(0, 2), 16);
        const g = parseInt(code.slice(2, 4), 16);
        const b = parseInt(code.slice(4, 6), 16);
        let a = 1;

        if (code.length === 8) {
            a = parseInt(code.slice(6, 8), 16) / 255;
        }

        const hsb = this.rgbToHsb(r, g, b);

        const colorData = {
            "code": this.generateCssColorCode(hsb.hue, hsb.saturation * 100, hsb.value, a),
            "angle": hsb.hue,
            "radius": hsb.saturation,
            "value": hsb.value,
            "opacity": a,
            "order": this.colors.length
        }
        this.colors.push(colorData);

        // Set managed position
        this.managedPosition = true;
        this.ensureManagedPosition();

        this.setLastSelected(`${this.colors.length - 1}`);
        this.saveLayer();
    }

    moveColor(index, relativeX, relativeY) {
        if (index < 0 || index >= this.colors.length) {
            console.error("Invalid color index:", index);
            return;
        }

        if (this.preset) {
            if (!availablePresets[this.colors.length].includes(this.preset)) {
                this.preset = null;
            }

            if (index !== "0") {
                return;
            }
        }

        const circlePosData = this.calculateAngleRadiusGrid(relativeX, relativeY);
        this.colors[index]["angle"] = circlePosData["angle"];
        this.colors[index]["radius"] = circlePosData["radius"];
        this.colors[index]["code"] = this.generateCssColorCodeFromData(this.colors[index]);

        this.setLastSelected(index);
        this.saveLayer();
    }

    moveColorPosition(index, relativeX, relativeY) {
        if (index < 0 || index >= this.colors.length) {
            console.error("Invalid color index:", index);
            return;
        }

        if (this.preset) {
            if (!availablePresets[this.colors.length].includes(this.preset)) {
                this.preset = null;
            }

            if (index !== "0") {
                return;
            }
        }

        const circlePosData = this.calculateAngleRadiusGrid(relativeX, relativeY);
        this.colors[index]["angle"] = circlePosData["angle"];
        this.colors[index]["radius"] = circlePosData["radius"];
        this.colors[index]["code"] = this.generateCssColorCodeFromData(this.colors[index]);

        this.saveLayer();
    }

    moveAngle(relativeX, relativeY) {
        if (this.singleColor) {
            return;
        }

        let angleNode = this.node.querySelector(".natsumi-gradient-angle");

        // Only allow angle modification since radial gradients don't have angles to adjust
        if (this.gradientType === "linear" || this.gradientType === "conic") {
            const angleData = this.calculateAngleRadius(relativeX, relativeY, angleNode.getBoundingClientRect().width, angleNode.getBoundingClientRect().height, false, true);
            let newAngle = angleData["angle"];

            if (this.shiftPressed) {
                // Snap to nearest 15 degree increment
                newAngle = Math.round(newAngle / 15) * 15;
            }

            if (newAngle === 360) {
                this.angle = 0;
            }

            this.angle = newAngle;
        }

        this.renderAngle();
        this.saveLayer();
    }

    moveSlider(slider, relativeX) {
        let sliderNode = this.node.querySelector(`.natsumi-color-slider-${slider}`);
        if (!sliderNode) {
            return;
        }

        // Get slider width
        let sliderWidth = sliderNode.getBoundingClientRect().width;
        relativeX = Math.max(0, Math.min(relativeX, sliderWidth));

        // The sliders are inverted (left = 1, right = 0), so we'd need to factor that in
        let sliderValue = 1 - (relativeX / sliderWidth);

        if (this.shiftPressed) {
            // Snap to nearest 0.1 increment
            sliderValue = Math.round(sliderValue * 10) / 10;
            relativeX = Math.round(sliderWidth * (1 - sliderValue));
        }

        if (slider !== "grain" && slider !== "image-opacity" && this.lastSelected === null) {
            // No color selected here, so we can't modify its properties
            return;
        }

        if (slider === "luminosity") {
            this.setColorProperties(this.lastSelected, sliderValue);
        } else if (slider === "opacity") {
            this.setColorProperties(this.lastSelected, null, sliderValue);
        } else if (slider === "grain") {
            sliderValue = 1 - sliderValue;
            this.setGrain(sliderValue);
        } else if (slider === "image-opacity") {
            this.setImageOpacity(sliderValue);
        }

        sliderNode.style.setProperty("--natsumi-slider-position", `${relativeX}px`);

        this.renderGrid();
        this.saveLayer();
    }

    renderSliders() {
        let luminositySliderNode = this.node.querySelector(".natsumi-color-slider-luminosity");
        let opacitySliderNode = this.node.querySelector(".natsumi-color-slider-opacity");
        let grainSliderNode = this.node.querySelector(".natsumi-color-slider-grain");
        let imageOpacitySliderNode = this.node.querySelector(".natsumi-color-slider-image-opacity");
        let textColorHueSliderNode = this.node.querySelector(".natsumi-color-slider-text-color-hue");
        let textColorSaturationSliderNode = this.node.querySelector(".natsumi-color-slider-text-color-saturation");
        let textColorValueSliderNode = this.node.querySelector(".natsumi-color-slider-text-color-value");

        // Render background color sliders
        let colorData = null;
        if (this.lastSelected !== null && this.lastSelected in this.colors) {
            colorData = this.colors[this.lastSelected];
        }
        if (this.preset) {
            colorData = this.colors["0"];
        }

        if (colorData) {
            const sliderWidth = Math.max(luminositySliderNode.getBoundingClientRect().width, 290);
            const luminosityPosition = sliderWidth * (1 - colorData["value"]);
            const opacityPosition = sliderWidth * (1 - colorData["opacity"]);
            luminositySliderNode.style.setProperty("--natsumi-slider-position", `${luminosityPosition}px`);
            opacitySliderNode.style.setProperty("--natsumi-slider-position", `${opacityPosition}px`);
        } else {
            luminositySliderNode.style.setProperty("--natsumi-slider-position", "0px");
            opacitySliderNode.style.setProperty("--natsumi-slider-position", "0px");
        }

        // Render grain slider
        const grainSliderWidth = Math.max(grainSliderNode.getBoundingClientRect().width, 380);
        const grainPosition = grainSliderWidth * this.grain;
        grainSliderNode.style.setProperty("--natsumi-slider-position", `${grainPosition}px`);

        // Render image opacity slider
        const imageOpacitySliderWidth = Math.max(imageOpacitySliderNode.getBoundingClientRect().width, 380);
        const imageOpacityPosition = imageOpacitySliderWidth * (1 - this.customImageOpacity);
        imageOpacitySliderNode.style.setProperty("--natsumi-slider-position", `${imageOpacityPosition}px`);

        // Render text color sliders
        if (this.textColor) {
            const textColorHuePosition = textColorHueSliderNode.getBoundingClientRect().width * (1 - (this.textColor["hue"] / 360));
            const textColorSaturationPosition = textColorSaturationSliderNode.getBoundingClientRect().width * (1 - this.textColor["saturation"]);
            const textColorValuePosition = textColorValueSliderNode.getBoundingClientRect().width * (1 - this.textColor["value"]);
            textColorHueSliderNode.style.setProperty("--natsumi-slider-position", `${textColorHuePosition}px`);
            textColorSaturationSliderNode.style.setProperty("--natsumi-slider-position", `${textColorSaturationPosition}px`);
            textColorValueSliderNode.style.setProperty("--natsumi-slider-position", `${textColorValuePosition}px`);
        }
    }

    renderAngle() {
        let angleNode = this.node.querySelector(".natsumi-gradient-angle");
        const angleData = this.calculatePosition(this.angle, 1, 60, 60);
        angleNode.style.setProperty("--natsumi-angle-position", `${angleData.x}px ${angleData.y}px`);
        angleNode.style.setProperty("--natsumi-angle-string", `"${Math.floor(this.angle)}°"`);

        if (this.gradientType !== "linear" && this.gradientType !== "conic") {
            angleNode.setAttribute("disabled", "");
        } else {
            angleNode.removeAttribute("disabled");
        }
    }

    renderMisc(ignoreFileUpload = false) {
        let imageBlurOptions = this.node.querySelectorAll(".natsumi-image-blur-choice");

        if (!ignoreFileUpload) {
            if (this.customImage) {
                this.fileUpload.setFile(this.customImage);
            } else {
                this.fileUpload.resetFile();
            }
        }

        imageBlurOptions.forEach((btn) => {
            btn.checked = false;
            btn.removeAttribute("selected")
            let radioCheck = btn.querySelector(".radio-check");
            radioCheck.removeAttribute("selected");

            if (btn.getAttribute("value") === this.customImageBlur) {
                btn.checked = true;
                btn.setAttribute("selected", "true");
                let selectedRadioCheck = btn.querySelector(".radio-check");
                selectedRadioCheck.setAttribute("selected", "true");
            }
        });
    }

    sliderEvent(slider, event) {
        let sliderNode = this.node.querySelector(`.natsumi-color-slider-${slider}`);
        if (!sliderNode) {
            return;
        }

        const immediateRelativeX = event.clientX - sliderNode.getBoundingClientRect().left;
        this.moveSlider(slider, immediateRelativeX);

        document.onmouseup = this.resetListeners;
        document.onmousemove = (event => {
            const relativeX = event.clientX - sliderNode.getBoundingClientRect().left;
            this.moveSlider(slider, relativeX);
        });
    }

    setLastSelected(index) {
        if (this.preset) {
            index = "0";
        }

        const numericalIndex = Number.parseInt(index);
        if (isNaN(numericalIndex) || numericalIndex < 0 || numericalIndex >= this.colors.length) {
            return;
        }

        this.lastSelected = index;
        this.renderGrid();
        this.renderSliders();
    }

    setColorProperties(index, brightness = null, opacity = null) {
        if (index < 0 || index >= this.colors.length) {
            console.error("Invalid color index:", index);
            return;
        }

        if (brightness !== null) {
            this.colors[index]["value"] = brightness;
        }

        if (opacity !== null) {
            this.colors[index]["opacity"] = opacity;
        }

        this.colors[index]["code"] = this.generateCssColorCodeFromData(this.colors[index]);
        this.renderGrid();
        this.saveLayer();
    }

    setGrain(opacity) {
        this.grain = opacity;
    }

    removeColor(index) {
        if (index < 0 || index >= this.colors.length) {
            console.error("Invalid color index:", index);
            return;
        }

        this.colors.splice(index, 1);

        if (this.preset) {
            this.preset = null;
        }

        this.setLastSelected(`${this.colors.length - 1}`);
        if (this.colors.length === 0) {
            this.lastSelected = null;
            this.renderGrid();
            this.renderSliders();
        }
        this.saveLayer();
    }

    removeAllColors() {
        this.colors = [];
        this.textColor = {"enabled": false, "hue": 0, "saturation": 0, "value": 0};
        this.grain = 0;
        this.preset = null;
        this.angle = 0;
        this.gradientType = "linear";
        this.lastSelected = null;
        this.renderGrid();
        this.renderSliders();
        this.renderAngle();
        this.renderMisc();
        this.saveLayer();
    }

    cyclePreset() {
        if (this.singleColor) {
            return;
        }

        const currentPreset = this.preset;
        const presetIndex = availablePresets[this.colors.length].indexOf(currentPreset);

        let nextPreset = null;
        let nextPresetIndex = presetIndex + 1

        if (nextPresetIndex < availablePresets[this.colors.length].length) {
            nextPreset = availablePresets[this.colors.length][nextPresetIndex];
        }

        if (currentPreset === nextPreset) {
            return;
        }

        this.preset = nextPreset;
        this.setLastSelected("0");
        this.saveLayer();
    }

    cycleGradientType() {
        if (this.singleColor) {
            return;
        }

        const currentGradient = this.gradientType;
        const gradientTypeList = Object.keys(gradientTypeNames);
        const gradientIndex = gradientTypeList.indexOf(currentGradient);

        let nextGradient = "linear";
        let nextGradientIndex = gradientIndex + 1

        if (nextGradientIndex < gradientTypeList.length) {
            nextGradient = gradientTypeList[nextGradientIndex];
        }

        this.gradientType = nextGradient;
        this.renderGrid();
        this.renderSliders();
        this.renderAngle();
        this.saveLayer();
    }

    toggleManagedPosition() {
        this.managedPosition = !this.managedPosition;
        this.saveLayer();
    }

    ensureManagedPosition() {
        if (!this.managedPosition) {
            return;
        }

        for (let i = 0; i < this.colors.length; i++) {
            this.colors[i]["position"] = (1 / (this.colors.length - 1)) * i;
        }
    }

    async setImage(fileId) {
        this.customImage = fileId;

        this.renderMisc(true);
        await this.saveLayer();
    }

    async resetImage() {
        this.customImage = null;

        this.renderMisc(true);
        this.saveLayer();
    }

    async removeImage() {
        await this.fileUpload.removeFile();
        await this.resetImage();
    }

    setImageOpacity(opacity) {
        this.customImageOpacity = opacity;
    }

    setImageBlur(imageBlur) {
        this.customImageBlur = imageBlur;
    }
}
