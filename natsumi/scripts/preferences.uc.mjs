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
import {
    customThemeLoader,
    customColorLoader,
    colorPresetNames,
    colorPresetOffsets,
    colorPresetOrders,
    availablePresets,
    gradientTypes,
    gradientTypeNames,
    applyCustomColor,
    applyCustomTheme
} from "./custom-theme.sys.mjs";
import {resetTabStyleIfNeeded} from "./reset-tab-style.sys.mjs";

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

class CustomThemePicker {
    constructor(id, loaderMethod, applyMethod, targetPref, singleColor = false, allowOpacity = true) {
        this.id = id;
        this.loaderMethod = loaderMethod;
        this.applyMethod = applyMethod;
        this.targetPref = targetPref;
        this.singleColor = singleColor;
        this.allowOpacity = allowOpacity;
        this.preset = null;
        this.gradientType = "linear";
        this.angle = 0;
        this.colors = [];
        this.newColorAllowed = true;
        this.lastSelected = null;
        this.layer = 0;
        this.theme = "light";
        this.data = {"light": {"0": {}, "1": {}}, "dark": {"0": {}, "1": {}}}
        this.node = null;

        // Configs
        this.availableLayers = 2;
        this.version = 1;

        if (this.singleColor) {
            this.data = {"color": {}};
        }

        // Shift pressed
        this.shiftPressed = false;
    }

    init() {
        let node = document.getElementById(this.id);

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

        // Load custom theme data from preferences
        let customThemeData = ucApi.Prefs.get(this.targetPref);
        if (customThemeData.exists()) {
            try {
                let toLoad = JSON.parse(customThemeData.value);

                if (!toLoad["version"]) {
                    toLoad["version"] = 1;
                }

                this.data = this.loaderMethod(toLoad);
            } catch (e) {
                console.error("Failed to parse custom theme data:", e);
            }
        }

        this.loadLayer(0);

        if (this.colors.length > 0) {
            this.setLastSelected("0");
            this.renderButtons();
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
        customThemeColorGrid.addEventListener("mouseenter", (event) => {
            this.newColorAllowed = true;
        });
        customThemeColorGrid.addEventListener("mouseleave", (event) => {
            this.newColorAllowed = false;
        });

        // Add listeners for top controls
        for (let i = 0; i < this.availableLayers; i++) {
            let layerButton = this.node.querySelector(`.natsumi-custom-layer-${i + 1}`);
            layerButton.addEventListener("click", (event) => {
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
            lightModeButton.addEventListener("click", (event) => {
                this.theme = "light";
                lightModeButton.setAttribute("selected", "");
                darkModeButton.removeAttribute("selected");
                this.loadLayer(this.layer);
            });
            darkModeButton.addEventListener("click", (event) => {
                this.theme = "dark";
                darkModeButton.setAttribute("selected", "");
                lightModeButton.removeAttribute("selected");
                this.loadLayer(this.layer);
            });
        }

        let importButton = this.node.querySelector(".natsumi-custom-import");
        let exportButton = this.node.querySelector(".natsumi-custom-export");

        if (!this.singleColor) {
            importButton.addEventListener("click", (event) => {
                this.import();
            });
            exportButton.addEventListener("click", (event) => {
                this.export();
            });
        }

        // Add listeners for gradient controls
        let presetButton = this.node.querySelector(".natsumi-preset-button");
        let gradientTypeButton = this.node.querySelector(".natsumi-gradient-button");
        let resetButton = this.node.querySelector(".natsumi-reset-button");
        let hexInput = this.node.querySelector(".natsumi-hex-input");
        let hexButton = this.node.querySelector(".natsumi-hex-button");

        if (!this.singleColor) {
            presetButton.addEventListener("click", (event) => {
                this.cyclePreset();
            });

            gradientTypeButton.addEventListener("click", (event) => {
                this.cycleGradientType();
            });
        }

        resetButton.addEventListener("click", (event) => {
            this.removeAllColors();
        });

        hexButton.addEventListener("click", (event) => {
            let hexInputContainer = this.node.querySelector(".natsumi-custom-theme-hex-input");
            if (hexInputContainer.attributes["hidden"]) {
                hexInputContainer.removeAttribute("hidden");
            } else {
                hexInputContainer.setAttribute("hidden", "");
                this.node.querySelector(".natsumi-hex-input").value = "";
            }
        });

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
        hexSubmitButton.addEventListener("click", (event) => {
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
            uploadNode.onchange = (event) => {
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

            this.data = this.loaderMethod(toLoad);
        } catch(e) {
            console.error("Import failed:", e);
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
        this.preset = null;
        this.lastSelected = null;

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

            this.lastSelected = "0";
        }

        this.renderGrid();
        this.renderSliders();
        this.renderButtons();
        this.renderAngle();
    }

    saveLayer() {
        if (this.singleColor) {
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
        }

        this.data["version"] = this.version;

        ucApi.Prefs.set(this.targetPref, JSON.stringify(this.data));
        this.applyMethod();
    }

    generateNode() {
        let nodeString = `
            <div id="${this.id}" class="natsumi-custom-theme-container">
                <div class="natsumi-custom-theme-picker">
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
                    <div class="natsumi-custom-theme-grid-container">
                        <div class="natsumi-custom-theme-grid"></div>
                        <div class="natsumi-custom-theme-empty">
                            Click anywhere on the grid to add a color.<br/>
                            Right-click on a color to remove it.
                        </div>
                    </div>
                    <div class="natsumi-custom-theme-controls">
                        <div class="natsumi-custom-theme-controls-button natsumi-preset-button">
                            <div class="natsumi-custom-theme-controls-icon"></div>
                            <div class="natsumi-custom-theme-controls-label">
                                Floating
                            </div>
                        </div>
                        <div class="natsumi-custom-theme-controls-button natsumi-gradient-button">
                            <div class="natsumi-custom-theme-controls-icon"></div>
                            <div class="natsumi-custom-theme-controls-label">
                                Linear
                            </div>
                        </div>
                        <div class="natsumi-custom-theme-controls-button natsumi-reset-button">
                            <div class="natsumi-custom-theme-controls-icon"></div>
                        </div>
                        <div class="natsumi-custom-theme-controls-button natsumi-hex-button">
                            <div class="natsumi-custom-theme-controls-icon"></div>
                        </div>
                    </div>
                    <div class="natsumi-custom-theme-hex-input" hidden="">
                        <html:input class="natsumi-hex-input" type="text" placeholder="HEX code (e.g. #ff0000)" maxlength="8"/>
                        <div class="natsumi-hex-submit"></div>
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

    calculateAngleRadiusGrid(relativeX, relativeY, radian = false) {
        let gridWidth = Math.max(this.node.querySelector(".natsumi-custom-theme-grid").getBoundingClientRect().width, 340);
        let gridHeight = Math.max(this.node.querySelector(".natsumi-custom-theme-grid").getBoundingClientRect().height, 340);

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
        let gridWidth = Math.max(this.node.querySelector(".natsumi-custom-theme-grid").getBoundingClientRect().width, 340);
        let gridHeight = Math.max(this.node.querySelector(".natsumi-custom-theme-grid").getBoundingClientRect().height, 340);

        return this.calculatePosition(angle, radius, gridWidth, gridHeight, radian);
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
        gridNode.innerHTML = "";

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
            let colorNode = document.createElement("div");
            colorNode.classList.add("natsumi-custom-theme-color");
            colorNode.style.setProperty("--natsumi-selected-color", `${colorData.code}`);

            let colorDisplayNode = document.createElement("div");
            colorDisplayNode.classList.add("natsumi-custom-theme-color-display");
            colorNode.appendChild(colorDisplayNode);

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

            gridNode.appendChild(colorNode);
            colorNode.addEventListener("mousedown", (event) => {
                event.stopPropagation();
                event.preventDefault();

                document.onmouseup = this.resetListeners;
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

        const colorData = {
            "code": this.generateCssColorCode(hue, saturation, value, opacity),
            "angle": circlePosData["angle"],
            "radius": circlePosData["radius"],
            "value": value,
            "opacity": opacity,
            "order": this.colors.length
        }

        this.colors.push(colorData);
        this.setLastSelected(`${this.colors.length - 1}`);
        this.renderButtons();
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
        this.setLastSelected(`${this.colors.length - 1}`);
        this.renderButtons();
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

        if (this.lastSelected === null) {
            // No color selected here, so we can't modify its properties
            return;
        }

        if (slider === "luminosity") {
            this.setColorProperties(this.lastSelected, sliderValue);
        } else if (slider === "opacity") {
            this.setColorProperties(this.lastSelected, null, sliderValue);
        }

        sliderNode.style.setProperty("--natsumi-slider-position", `${relativeX}px`);

        this.renderGrid();
        this.saveLayer();
    }

    renderSliders() {
        let luminositySliderNode = this.node.querySelector(".natsumi-color-slider-luminosity");
        let opacitySliderNode = this.node.querySelector(".natsumi-color-slider-opacity");

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
    }

    renderButtons() {
        let presetButtonNode = this.node.querySelector(".natsumi-preset-button .natsumi-custom-theme-controls-label");
        let gradientTypeButtonNode = this.node.querySelector(".natsumi-gradient-button .natsumi-custom-theme-controls-label");

        presetButtonNode.innerHTML = `${colorPresetNames[this.preset]}`;
        gradientTypeButtonNode.innerHTML = `${gradientTypeNames[this.gradientType]}`;
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
        this.renderButtons();
        this.saveLayer();
    }

    removeAllColors() {
        this.colors = [];
        this.preset = null;
        this.angle = 0;
        this.gradientType = "linear";
        this.lastSelected = null;
        this.renderGrid();
        this.renderSliders();
        this.renderButtons();
        this.renderAngle();
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
        this.renderButtons();
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
        this.renderButtons();
        this.renderAngle();
        this.saveLayer();
    }
}

class CheckboxChoice {
    constructor(preference, id, label, description = "", opposite = false) {
        this.preference = preference;
        this.id = id;
        this.label = label;
        this.description = description;
        this.opposite = opposite;
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

        let nodeString = `
            <checkbox id="${this.id}" preference="${this.preference}" opposite="${this.opposite}" checked="${selected}" label="${this.label}">
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
        return convertToXUL(nodeString);
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

        return node;
    }
}

const layouts = {
    "default": new MCChoice(
        false,
        "Multiple Toolbars",
        "Keeps both the navbar and sidebar separate.",
        "<div id='multiple-toolbars' class='natsumi-mc-choice-image-browser'></div>"
    ),
    "single": new MCChoice(
        true,
        "Single Toolbar (Zen-like)",
        "Merges everything into the sidebar for simplicity.",
        "<div id='single-toolbar' class='natsumi-mc-choice-image-browser'></div>"
    )
}

const themes = {
    "default": new MCChoice(
        "default",
        "Default",
        "No changes, just the default look.",
        "<div id='default' class='natsumi-mc-choice-image-browser'></div>"
    ),
    "gradient": new MCChoice(
        "gradient",
        "Gradient",
        "A light gradient of your accent color.",
        "<div id='gradient' class='natsumi-mc-choice-image-browser'></div>"
    ),
    "gradient-complementary": new MCChoice(
        "gradient-complementary",
        "Complementary Gradient",
        "A gradient of the accent color and its opposite color.",
        "<div id='gradient-complementary' class='natsumi-mc-choice-image-browser'><div class='natsumi-mc-choice-image-browser-additional'></div></div>"
    ),
    "colorful": new MCChoice(
        "colorful",
        "Colorful Solid",
        "A solid color with a tint of the accent color.",
        "<div id='colorful' class='natsumi-mc-choice-image-browser'></div>"
    ),
    "playful": new MCChoice(
        "playful",
        "Playful Solid",
        "A higher contrast version of Colorful Solid.",
        "<div id='playful' class='natsumi-mc-choice-image-browser'></div>"
    ),
    "lucid": new MCChoice(
        "lucid",
        "Lucid",
        "A recreation of the Zen Dream and Zen Galaxy themes.",
        "<div id='lucid' class='natsumi-mc-choice-image-browser'></div>"
    ),
    "oled": new MCChoice(
        "oled",
        "OLED",
        "A completely black and white theme for the minimalists.",
        "<div id='oled' class='natsumi-mc-choice-image-browser'></div>"
    ),
    "lgbtq": new MCChoice(
        "lgbtq",
        "LGBTQ+",
        "Browsing with pride!",
        "<div id='lgbtq' class='natsumi-mc-choice-image-browser'></div>"
    ),
    "transgender": new MCChoice(
        "transgender",
        "Transgender",
        "Trans rights are human rights!",
        "<div id='transgender' class='natsumi-mc-choice-image-browser'></div>"
    ),
    "custom": new MCChoice(
        "custom",
        "Custom",
        "Make your own theme!",
        "<div id='custom' class='natsumi-mc-choice-image-browser'></div>"
    )
}

const materials = {
    "haze": new MCChoice(
        "default",
        "Haze",
        "",
        "<div id='mat-hz' class='natsumi-mc-choice-image-browser'></div>"
    ),
    "tinted-haze": new MCChoice(
        "tinted-haze",
        "Tinted Haze",
        "",
        "<div id='mat-hz-tinted' class='natsumi-mc-choice-image-browser'></div>"
    )
}

const colors = {
    "default": new MCChoice(
        "default",
        "Light Green",
        "",
        "",
        "#a0d490"
    ),
    "sky-blue": new MCChoice(
        "sky-blue",
        "Sky Blue",
        "",
        "",
        "#aac7ff"
    ),
    "turquoise": new MCChoice(
        "turquoise",
        "Turquoise",
        "",
        "",
        "#74d7cb"
    ),
    "yellow": new MCChoice(
        "yellow",
        "Yellow",
        "",
        "",
        "#dec663"
    ),
    "peach-orange": new MCChoice(
        "peach-orange",
        "Peach Orange",
        "",
        "",
        "#ffb787"
    ),
    "warmer-pink": new MCChoice(
        "warmer-pink",
        "Warmer Pink",
        "",
        "",
        "#ff9eb3"
    ),
    "beige": new MCChoice(
        "beige",
        "Beige",
        "",
        "",
        "#dec1b1"
    ),
    "light-red": new MCChoice(
        "light-red",
        "Light Red",
        "",
        "",
        "#ffb1c0"
    ),
    "muted-pink": new MCChoice(
        "muted-pink",
        "Muted Pink",
        "",
        "",
        "#ddbcf3"
    ),
    "pink": new MCChoice(
        "pink",
        "Pink",
        "",
        "",
        "#f6b0ea"
    ),
    "lavender-purple": new MCChoice(
        "lavender-purple",
        "Lavender Purple",
        "",
        "",
        "#d4bbff"
    ),
    "system": new MCChoice(
        "system",
        "System Accent",
        "Use the system accent color.",
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

const compactStyles = {
    "default": new MCChoice(
        "default",
        "Hide both",
        "Hides both the toolbar and sidebar.",
        "<div id='compact-both' class='natsumi-mc-choice-image-browser'></div>"
    ),
    "toolbar": new MCChoice(
        "toolbar",
        "Hide toolbar",
        "Hides the toolbar only.",
        "<div id='compact-toolbar' class='natsumi-mc-choice-image-browser'></div>"
    ),
    "sidebar": new MCChoice(
        "sidebar",
        "Hide sidebar",
        "Hides the sidebar only.",
        "<div id='compact-sidebar' class='natsumi-mc-choice-image-browser'></div>"
    )
}

const tabDesigns = {
    "default": new MCChoice(
        "default",
        "Blade",
        "A modern and sleek, yet dynamic tab design.",
        `
            <div id='tab-blade' class='natsumi-mc-choice-image-browser'>
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
        "A Lepton-like design that 'combines' tab and web content.",
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
        "A Zen alpha-inspired design with a material-like look.",
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
        "A tab design inspired by Floorp's hexagonal branding.",
        `
            <div id='tab-hexagonal' class='natsumi-mc-choice-image-browser'>
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
        "Just the standard Firefox look.",
        `
            <div id='tab-classic' class='natsumi-mc-choice-image-browser'>
                <div class='natsumi-mc-tab'>
                    <div class='natsumi-mc-tab-icon'></div>
                    <div class='natsumi-mc-tab-text'></div>
                </div>
            </div>
        `
    ),
}

const urlbarLayouts = {
    "floating": new MCChoice(
        false,
        "Floating",
        "Lets the URL bar float above the browser window.",
        "<div id='urlbar-floating' class='natsumi-mc-choice-image-browser'></div>"
    ),
    "classic": new MCChoice(
        true,
        "Classic",
        "Keeps the URL bar on the navbar.",
        "<div id='urlbar-classic' class='natsumi-mc-choice-image-browser'></div>"
    )
}

const miniplayerLayouts = {
    "stacked": new MCChoice(
        false,
        "Stacked",
        "Places miniplayers on top of each other.",
        "<div id='miniplayer-stacked' class='natsumi-mc-choice-image-browser'></div>"
    ),
    "side-by-side": new MCChoice(
        true,
        "Side-by-side",
        "Places miniplayers next to each other.",
        "<div id='miniplayer-side-by-side' class='natsumi-mc-choice-image-browser'></div>"
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
    constructor(id, preference, label, description, overrideDefault = null) {
        this.id = id;
        this.preference = preference;
        this.label = label;
        this.description = description;
        this.options = {};
        this.extras = {}
        this.overrideDefault = overrideDefault;
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
            form.appendChild(choiceNode);
        }
        return node;
    }
}

function addToSidebar() {
    let nodeString = `
    <richlistitem id="natsumi-settings" class="category" value="paneNatsumiSettings" data-l10n-id="category-natsumi-settings" data-l10n-attrs="tooltiptext" align="center" tooltiptext="Customize Natsumi">
        <image class="category-icon"/>
        <label class="category-name" flex="1">
            Customize Natsumi
        </label>
    </richlistitem>
    `
    let sidebar = document.getElementById("categories");
    const generalPane = sidebar.querySelector("#category-general");
    sidebar.insertBefore(convertToXUL(nodeString), generalPane.nextSibling);

    // noinspection JSUnresolvedReference
    gCategoryInits.set("paneNatsumiSettings", {
        _initted: true,
        init: () => {}
    });
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

    let menuButtonCheckbox = new CheckboxChoice(
        "natsumi.theme.single-toolbar-show-menu-button",
        "natsumiShowMenuButton",
        "Show Menu button"
    )

    let addonsButtonCheckbox = new CheckboxChoice(
        "natsumi.theme.single-toolbar-hide-extensions-button",
        "natsumiShowAddonsButton",
        "Show Extensions button",
        "",
        true
    )

    let bookmarksOnHoverCheckbox = new CheckboxChoice(
        "natsumi.theme.show-bookmarks-on-hover",
        "natsumiShowBookmarksOnHover",
        "Show Bookmarks on hover",
        "When the Bookmarks bar is expanded, the bar will stay hidden until hovered."
    )

    let windowControlsCheckbox = new CheckboxChoice(
        "natsumi.theme.force-window-controls-to-left",
        "natsumiForceWinControlsToLeft",
        "Display window controls on the sidebar in Single Toolbar",
        windowControlsDescription
    )

    layoutSelection.registerExtras("natsumiShowMenuButtonBox", menuButtonCheckbox);
    layoutSelection.registerExtras("natsumiShowAddonsButtonBox", addonsButtonCheckbox);
    layoutSelection.registerExtras("natsumiShowBookmarksOnHoverBox", bookmarksOnHoverCheckbox);
    layoutSelection.registerExtras("natsumiForceWinControlsToLeftBox", windowControlsCheckbox);

    for (let layout in layouts) {
        layoutSelection.registerOption(layout, layouts[layout]);
    }

    let layoutNode = layoutSelection.generateNode();

    // Set listeners for each button
    let layoutButtons = layoutNode.querySelectorAll(".natsumi-mc-choice");
    layoutButtons.forEach(button => {
        button.addEventListener("click", () => {
            let selectedValue = button.getAttribute("value") === "true";
            console.log("Changing layout:", selectedValue);
            setStringPreference("natsumi.theme.single-toolbar", selectedValue);
            layoutButtons.forEach(btn => btn.classList.remove("selected"));
            button.classList.add("selected");
        });
    });

    // Set listeners for each checkbox
    let checkboxes = layoutNode.querySelectorAll("checkbox");
    checkboxes.forEach(checkbox => {
        checkbox.addEventListener("command", () => {
            let prefName = checkbox.getAttribute("preference");
            let isChecked = checkbox.checked;

            if (checkbox.getAttribute("opposite") === "true") {
                isChecked = !isChecked;
            }

            console.log(`Checkbox ${prefName} changed to ${isChecked}`);

            // noinspection JSUnresolvedReference
            ucApi.Prefs.set(prefName, isChecked);
        });
    });

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

    let windowsAppend = "";
    if (osName === "winnt") {
        windowsAppend = " Windows users: please use this if translucency is broken and let me know of the issue."
    }

    let translucencyLegacyCheckbox = new CheckboxChoice(
        "natsumi.theme.use-legacy-translucency",
        "natsumiTranslucencyLegacyToggle",
        "Use legacy translucency",
        `This will inherit the material from the 'titlebar' rather than the 'sidebar'.${windowsAppend}`
    )

    let grayOutCheckbox = new CheckboxChoice(
        "natsumi.theme.gray-out-when-inactive",
        "natsumiGrayOutWhenInactive",
        "Gray out background when the browser window is inactive"
    )

    let customThemePickerUi = new CustomThemePicker("natsumiCustomThemePicker", customThemeLoader, applyCustomTheme, "natsumi.theme.custom-theme-data");

    themeSelection.registerExtras("natsumiCustomThemePickerBox", customThemePickerUi);
    themeSelection.registerExtras("natsumiTranslucencyBox", translucencyCheckbox);
    themeSelection.registerExtras("natsumiTranslucencyLegacyBox", translucencyLegacyCheckbox);
    themeSelection.registerExtras("natsumiInactiveBox", grayOutCheckbox);

    for (let theme in themes) {
        themeSelection.registerOption(theme, themes[theme]);
    }

    let themeNode = themeSelection.generateNode();

    // Set listeners for each button
    let themeButtons = themeNode.querySelectorAll(".natsumi-mc-choice");
    themeButtons.forEach(button => {
        button.addEventListener("click", () => {
            let selectedValue = button.getAttribute("value");
            console.log("Changing theme:", selectedValue);
            setStringPreference("natsumi.theme.type", selectedValue);
            themeButtons.forEach(btn => btn.classList.remove("selected"));
            button.classList.add("selected");
        });
    });

    // Set listeners for each checkbox
    let checkboxes = themeNode.querySelectorAll("checkbox");
    checkboxes.forEach(checkbox => {
        checkbox.addEventListener("command", () => {
            let prefName = checkbox.getAttribute("preference");
            let isChecked = checkbox.checked;

            if (checkbox.getAttribute("opposite") === "true") {
                isChecked = !isChecked;
            }

            console.log(`Checkbox ${prefName} changed to ${isChecked}`);

            // noinspection JSUnresolvedReference
            ucApi.Prefs.set(prefName, isChecked);
        });
    });

    prefsView.insertBefore(themeNode, homePane);
    customThemePickerUi.init();
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

    // Set listeners for each button
    let colorButtons = colorNode.querySelectorAll(".natsumi-mc-choice");
    colorButtons.forEach(button => {
        button.addEventListener("click", () => {
            let selectedValue = button.getAttribute("value");
            console.log("Changing color:", selectedValue);
            setStringPreference("natsumi.theme.accent-color", selectedValue);
            colorButtons.forEach(btn => btn.classList.remove("selected"));
            button.classList.add("selected");
        });
    });

    let checkboxesColor = colorNode.querySelectorAll("checkbox");
    checkboxesColor.forEach(checkbox => {
        checkbox.addEventListener("command", () => {
            let prefName = checkbox.getAttribute("preference");
            let isChecked = checkbox.checked;

            if (checkbox.getAttribute("opposite") === "true") {
                isChecked = !isChecked;
            }

            console.log(`Checkbox ${prefName} changed to ${isChecked}`);

            // noinspection JSUnresolvedReference
            ucApi.Prefs.set(prefName, isChecked);
        });
    });

    prefsView.insertBefore(colorNode, homePane);
    //customColorPickerUi.init();
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
        selectedOverride
    );

    for (let style in tabDesigns) {
        tabDesignSelection.registerOption(style, tabDesigns[style]);
    }

    tabDesignSelection.registerExtras("natsumiTabFusionHighlight", new CheckboxChoice(
        "natsumi.tabs.fusion-highlight",
        "natsumiTabFusionHighlight",
        "Enable Fusion tab highlight",
        "This will add a Photon (Firefox Quantum)-like highlight to Fusion."
    ));

    let tabDesignNode = tabDesignSelection.generateNode();

    // Set listeners for each button
    let tabDesignButtons = tabDesignNode.querySelectorAll(".natsumi-mc-choice");
    tabDesignButtons.forEach(button => {
        button.addEventListener("click", () => {
            let selectedValue = button.getAttribute("value");
            console.log("Changing style:", selectedValue);

            // For non-Blade tab designs, we need to enable custom styles
            setStringPreference("natsumi.tabs.use-custom-type", selectedValue !== "default");

            // After that, we can set tab type
            setStringPreference("natsumi.tabs.type", selectedValue);
            tabDesignButtons.forEach(btn => btn.classList.remove("selected"));
            button.classList.add("selected");

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

    // Set listeners for each checkbox
    let checkboxes = tabDesignNode.querySelectorAll("checkbox");
    checkboxes.forEach(checkbox => {
        checkbox.addEventListener("command", () => {
            let prefName = checkbox.getAttribute("preference");
            let isChecked = checkbox.checked;

            if (checkbox.getAttribute("opposite") === "true") {
                isChecked = !isChecked;
            }

            console.log(`Checkbox ${prefName} changed to ${isChecked}`);

            // noinspection JSUnresolvedReference
            ucApi.Prefs.set(prefName, isChecked);
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

    workspacesGroup.registerOption("natsumiSidebarWorkspacesAsIcons", new CheckboxChoice(
        "natsumi.sidebar.workspaces-as-icons",
        "natsumiSidebarWorkspacesAsIcons",
        "Display Workspaces as an icon strip",
        "This does not make each icon clickable to switch Workspaces (for now)."
    ));

    let sidebarWorkspacesNode = workspacesGroup.generateNode();

    // Set listeners for each checkbox
    let checkboxes = sidebarWorkspacesNode.querySelectorAll("checkbox");
    checkboxes.forEach(checkbox => {
        checkbox.addEventListener("command", () => {
            let prefName = checkbox.getAttribute("preference");
            let isChecked = checkbox.checked;

            if (checkbox.getAttribute("opposite") === "true") {
                isChecked = !isChecked;
            }

            console.log(`Checkbox ${prefName} changed to ${isChecked}`);

            // noinspection JSUnresolvedReference
            ucApi.Prefs.set(prefName, isChecked);
        });
    });

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

    // Set listeners for each checkbox
    let checkboxes = panelSidebarNode.querySelectorAll("checkbox");
    checkboxes.forEach(checkbox => {
        checkbox.addEventListener("command", () => {
            let prefName = checkbox.getAttribute("preference");
            let isChecked = checkbox.checked;

            if (checkbox.getAttribute("opposite") === "true") {
                isChecked = !isChecked;
            }

            console.log(`Checkbox ${prefName} changed to ${isChecked}`);

            // noinspection JSUnresolvedReference
            ucApi.Prefs.set(prefName, isChecked);
        });
    });

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

    if (ucApi.Prefs.get("natsumi.browser.type").exists()) {
        if (
            ucApi.Prefs.get("natsumi.browser.type").value === "floorp" ||
            ucApi.Prefs.get("natsumi.browser.type").value === "waterfox"
        ) {
            buttonsGroup.registerOption("natsumiSidebarEnableToolbar", new CheckboxChoice(
                "natsumi.sidebar.use-statusbar-in-sidebar",
                "natsumiSidebarEnableToolbar",
                "Use Status Bar in the Sidebar when the Status Bar is &#34;hidden&#34;",
                "This will allow you to add toolbar buttons (e.g. Bookmarks menu, New tab) to the Sidebar just like Zen."
            ));
        }
    }

    buttonsGroup.registerOption("natsumiSidebarHideControls", new CheckboxChoice(
        "natsumi.sidebar.hide-sidebar-controls",
        "natsumiSidebarHideControls",
        "Hide Sidebar controls"
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
    ));

    buttonsGroup.registerOption("natsumiSidebarNewTabOptions", hideNewTabSubgroup);

    let sidebarButtonsNode = buttonsGroup.generateNode();

    let newTabPositionCheckbox = sidebarButtonsNode.querySelector("#natsumiSidebarNewTabPosition");

    if (ucApi.Prefs.get("natsumi.tabs.hide-new-tab-button").exists()) {
        newTabPositionCheckbox.setAttribute("disabled", `${ucApi.Prefs.get("natsumi.tabs.hide-new-tab-button").value}`);
    }

    // Set listeners for each checkbox
    let checkboxes = sidebarButtonsNode.querySelectorAll("checkbox");
    checkboxes.forEach(checkbox => {
        checkbox.addEventListener("command", () => {
            let prefName = checkbox.getAttribute("preference");
            let isChecked = checkbox.checked;

            if (checkbox.getAttribute("opposite") === "true") {
                isChecked = !isChecked;
            }

            if (checkbox.id === "natsumiSidebarHideNewTab") {
                newTabPositionCheckbox.setAttribute("disabled", `${isChecked}`);
            }

            console.log(`Checkbox ${prefName} changed to ${isChecked}`);

            // noinspection JSUnresolvedReference
            ucApi.Prefs.set(prefName, isChecked);
        });
    });

    prefsView.insertBefore(sidebarButtonsNode, homePane);
}

function addCompactStylesPane() {
    let prefsView = document.getElementById("mainPrefPane");
    let homePane = prefsView.querySelector("#firefoxHomeCategory");

    // Create theme selection
    let styleSelection = new MultipleChoicePreference(
        "natsumiCompactStyle",
        "natsumi.theme.compact-style",
        "Style",
        "Choose what you want to hide when Compact Mode is active."
    );

    for (let style in compactStyles) {
        styleSelection.registerOption(style, compactStyles[style]);
    }

    styleSelection.registerExtras("natsumiCompactMarginless", new CheckboxChoice(
        "natsumi.theme.compact-marginless",
        "natsumiCompactMarginless",
        "Marginless Compact Mode",
        "Removes the borders around the website content when in Compact Mode."
    ));

    let styleNode = styleSelection.generateNode();

    // Set listeners for each button
    let styleButtons = styleNode.querySelectorAll(".natsumi-mc-choice");
    styleButtons.forEach(button => {
        button.addEventListener("click", () => {
            let selectedValue = button.getAttribute("value");
            console.log("Changing style:", selectedValue);
            setStringPreference("natsumi.theme.compact-style", selectedValue);
            styleButtons.forEach(btn => btn.classList.remove("selected"));
            button.classList.add("selected");
        });
    });

    // Set listeners for each checkbox
    let checkboxes = styleNode.querySelectorAll("checkbox");
    checkboxes.forEach(checkbox => {
        checkbox.addEventListener("command", () => {
            let prefName = checkbox.getAttribute("preference");
            let isChecked = checkbox.checked;

            if (checkbox.getAttribute("opposite") === "true") {
                isChecked = !isChecked;
            }

            console.log(`Checkbox ${prefName} changed to ${isChecked}`);

            // noinspection JSUnresolvedReference
            ucApi.Prefs.set(prefName, isChecked);
        });
    });

    prefsView.insertBefore(styleNode, homePane);
}

function addCompactBehaviorPane() {
    let prefsView = document.getElementById("mainPrefPane");
    let homePane = prefsView.querySelector("#firefoxHomeCategory");

    // Create choices group
    let compactBehaviorGroup = new OptionsGroup(
        "natsumiCOmpactBehavior",
        "Behavior",
        "Tweak how you want Compact Mode to behave."
    );

    compactBehaviorGroup.registerOption("natsumiCompactNewWindow", new CheckboxChoice(
        "natsumi.theme.compact-on-new-window",
        "natsumiCompactNewWindow",
        "Enable Compact Mode by default",
        "If enabled, new windows will open with Compact Mode active."
    ));

    let compactBehaviorNode = compactBehaviorGroup.generateNode();

    // Set listeners for each checkbox
    let checkboxes = compactBehaviorNode.querySelectorAll("checkbox");
    checkboxes.forEach(checkbox => {
        checkbox.addEventListener("command", () => {
            let prefName = checkbox.getAttribute("preference");
            let isChecked = checkbox.checked;

            if (checkbox.getAttribute("opposite") === "true") {
                isChecked = !isChecked;
            }

            console.log(`Checkbox ${prefName} changed to ${isChecked}`);

            // noinspection JSUnresolvedReference
            ucApi.Prefs.set(prefName, isChecked);
        });
    });

    prefsView.insertBefore(compactBehaviorNode, homePane);
}

function addSidebarMiniplayerPane() {
    let prefsView = document.getElementById("mainPrefPane");
    let homePane = prefsView.querySelector("#firefoxHomeCategory");

    // Create layout selection
    let miniplayerLayoutSelection = new MultipleChoicePreference(
        "natsumiMiniplayerLayout",
        "natsumi.miniplayer.scroll-view",
        "Layout",
        "Choose the layout you want for the Miniplayers."
    );

    for (let layout in miniplayerLayouts) {
        miniplayerLayoutSelection.registerOption(layout, miniplayerLayouts[layout]);
    }

    miniplayerLayoutSelection.registerExtras("natsumiSidebarMiniplayerArtwork", new CheckboxChoice(
        "natsumi.miniplayer.disable-artwork",
        "natsumiSidebarMiniplayerArtwork",
        "Show media thumbnail/artwork as Miniplayer background",
        "",
        true
    ));

    let miniplayerLayoutNode = miniplayerLayoutSelection.generateNode();

    // Set listeners for each button
    let miniplayerLayoutButtons = miniplayerLayoutNode.querySelectorAll(".natsumi-mc-choice");
    miniplayerLayoutButtons.forEach(button => {
        button.addEventListener("click", () => {
            let selectedValue = button.getAttribute("value") === "true";
            console.log("Changing layout:", selectedValue);
            setStringPreference("natsumi.miniplayer.scroll-view", selectedValue);
            miniplayerLayoutButtons.forEach(btn => btn.classList.remove("selected"));
            button.classList.add("selected");
        });
    });

    // Set listeners for each checkbox
    let checkboxes = miniplayerLayoutNode.querySelectorAll("checkbox");
    checkboxes.forEach(checkbox => {
        checkbox.addEventListener("command", () => {
            let prefName = checkbox.getAttribute("preference");
            let isChecked = checkbox.checked;

            if (checkbox.getAttribute("opposite") === "true") {
                isChecked = !isChecked;
            }

            console.log(`Checkbox ${prefName} changed to ${isChecked}`);

            // noinspection JSUnresolvedReference
            ucApi.Prefs.set(prefName, isChecked);
        });
    });

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

    // Set listeners for each button
    let materialButtons = materialNode.querySelectorAll(".natsumi-mc-choice");
    materialButtons.forEach(button => {
        button.addEventListener("click", () => {
            let selectedValue = button.getAttribute("value");
            console.log("Changing theme:", selectedValue);
            setStringPreference("natsumi.pip.material", selectedValue);
            materialButtons.forEach(btn => btn.classList.remove("selected"));
            button.classList.add("selected");
        });
    });

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
        "Scroll-to-move allows you to move the Picture-in-Picture window by scrolling on it.",
        true
    ));

    let pipBehaviorNode = pipBehaviorGroup.generateNode();

    // Set listeners for each checkbox
    let checkboxes = pipBehaviorNode.querySelectorAll("checkbox");
    checkboxes.forEach(checkbox => {
        checkbox.addEventListener("command", () => {
            let prefName = checkbox.getAttribute("preference");
            let isChecked = checkbox.checked;

            if (checkbox.getAttribute("opposite") === "true") {
                isChecked = !isChecked;
            }

            console.log(`Checkbox ${prefName} changed to ${isChecked}`);

            // noinspection JSUnresolvedReference
            ucApi.Prefs.set(prefName, isChecked);
        });
    });

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

    // Set listeners for each button
    let materialButtons = materialNode.querySelectorAll(".natsumi-mc-choice");
    materialButtons.forEach(button => {
        button.addEventListener("click", () => {
            let selectedValue = button.getAttribute("value");
            console.log("Changing theme:", selectedValue);
            setStringPreference("natsumi.pdfjs.material", selectedValue);
            materialButtons.forEach(btn => btn.classList.remove("selected"));
            button.classList.add("selected");
        });
    });

    prefsView.insertBefore(materialNode, homePane);
}

function addPDFCompactPane() {
    let prefsView = document.getElementById("mainPrefPane");
    let homePane = prefsView.querySelector("#firefoxHomeCategory");

    // Create choices group
    let compactGroup = new OptionsGroup(
        "natsumiPDFCompact",
        "Compact Mode",
        "Compact Mode lets you focus on the document at hand by hiding the sidebar and toolbar when you don't need it."
    );

    compactGroup.registerOption("natsumiPDFEnableCompact", new CheckboxChoice(
        "natsumi.pdfjs.compact",
        "natsumiPDFEnableCompact",
        "Enable Compact Mode"
    ));

    let compactSubgroup = new OptionsGroup(
        "natsumiPDFCompactOptions",
        "",
        ""
    );

    compactSubgroup.registerOption("natsumiPDFDynamicCompact", new CheckboxChoice(
        "natsumi.pdfjs.compact-dynamic",
        "natsumiPDFDynamicCompact",
        "Dynamic Compact Mode",
        "Compact Mode will automatically disable if the sidebar is open."
    ));

    compactGroup.registerOption("natsumiPDFCompactOptions", compactSubgroup);

    let compactNode = compactGroup.generateNode();

    let dynamicCheckbox = compactNode.querySelector("#natsumiPDFDynamicCompact");

    if (ucApi.Prefs.get("natsumi.pdfjs.compact").exists()) {
        dynamicCheckbox.setAttribute("disabled", `${!ucApi.Prefs.get("natsumi.pdfjs.compact").value}`);
    }

    // Set listeners for each checkbox
    let checkboxes = compactNode.querySelectorAll("checkbox");
    checkboxes.forEach(checkbox => {
        checkbox.addEventListener("command", () => {
            let prefName = checkbox.getAttribute("preference");
            let isChecked = checkbox.checked;

            if (checkbox.getAttribute("opposite") === "true") {
                isChecked = !isChecked;
            }

            if (checkbox.id === "natsumiPDFEnableCompact") {
                dynamicCheckbox.setAttribute("disabled", `${!isChecked}`);
            }

            console.log(`Checkbox ${prefName} changed to ${isChecked}`);

            // noinspection JSUnresolvedReference
            ucApi.Prefs.set(prefName, isChecked);
        });
    });

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

    // Set listeners for each button
    let layoutButtons = layoutNode.querySelectorAll(".natsumi-mc-choice");
    layoutButtons.forEach(button => {
        button.addEventListener("click", () => {
            let selectedValue = button.getAttribute("value") === "true";
            console.log("Changing theme:", selectedValue);
            setStringPreference("natsumi.urlbar.do-not-float", selectedValue);
            layoutButtons.forEach(btn => btn.classList.remove("selected"));
            button.classList.add("selected");
        });
    });

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

    // Set listeners for each checkbox
    let checkboxes = behaviorNode.querySelectorAll("checkbox");
    checkboxes.forEach(checkbox => {
        checkbox.addEventListener("command", () => {
            let prefName = checkbox.getAttribute("preference");
            let isChecked = checkbox.checked;

            if (checkbox.getAttribute("opposite") === "true") {
                isChecked = !isChecked;
            }

            console.log(`Checkbox ${prefName} changed to ${isChecked}`);

            // noinspection JSUnresolvedReference
            ucApi.Prefs.set(prefName, isChecked);
        });
    });

    prefsView.insertBefore(behaviorNode, homePane);
}

function addPreferencesPanes() {
    // Category nodes
    let appearanceNode = convertToXUL(`
        <hbox id="natsumiAppearanceCategory" class="subcategory" data-category="paneNatsumiSettings" hidden="true">
            <html:h1>Browser Appearance</html:h1>
        </hbox>
    `);
    let sidebarNode = convertToXUL(`
        <hbox id="natsumiSidebarCategory" class="subcategory" data-category="paneNatsumiSettings" hidden="true">
            <html:h1>Sidebar &amp; Tabs</html:h1>
        </hbox>
    `);
    let compactModeNode = convertToXUL(`
        <hbox id="natsumiCompactModeCategory" class="subcategory" data-category="paneNatsumiSettings" hidden="true">
            <html:h1>Compact Mode</html:h1>
        </hbox>
        <groupbox id="natsumiCompactSingleToolbar" data-category="paneNatsumiSettings" hidden="true">
            <div class="natsumi-settings-info warning">
                <div class="natsumi-settings-info-icon"></div>
                <div class="natsumi-settings-info-text">
                    You need to use Multiple Toolbars layout to change Compact Mode styles.
                </div>
            </div>
        </groupbox>
    `);
    let miniPlayerNode = convertToXUL(`
        <hbox id="natsumiMiniplayerCategory" class="subcategory" data-category="paneNatsumiSettings" hidden="true">
            <html:h1>Miniplayer</html:h1>
        </hbox>
    `);
    let pipNode = convertToXUL(`
        <hbox id="natsumiPipCategory" class="subcategory" data-category="paneNatsumiSettings" hidden="true">
            <html:h1>Picture-in-Picture</html:h1>
        </hbox>
    `);
    let pdfjsNode = convertToXUL(`
        <hbox id="natsumiPDFCategory" class="subcategory" data-category="paneNatsumiSettings" hidden="true">
            <html:h1>PDF Viewer</html:h1>
        </hbox>
    `);
    let urlbarNode = convertToXUL(`
        <hbox id="natsumiUrlbarCategory" class="subcategory" data-category="paneNatsumiSettings" hidden="true">
            <html:h1>URL Bar</html:h1>
        </hbox>
    `);

    let prefsView = document.getElementById("mainPrefPane");
    let homePane = prefsView.querySelector("#firefoxHomeCategory");
    prefsView.insertBefore(appearanceNode, homePane);
    addLayoutPane();
    addThemesPane();
    addColorsPane();

    prefsView.insertBefore(sidebarNode, homePane);
    addSidebarTabsPane();
    addSidebarWorkspacesPane();
    addSidebarPanelSidebarPane();
    addSidebarButtonsPane();

    prefsView.insertBefore(compactModeNode, homePane);
    addCompactStylesPane();
    addCompactBehaviorPane();

    prefsView.insertBefore(miniPlayerNode, homePane);
    addSidebarMiniplayerPane();

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
}

console.log("Loading prefs panes...");
addToSidebar();
addPreferencesPanes();
