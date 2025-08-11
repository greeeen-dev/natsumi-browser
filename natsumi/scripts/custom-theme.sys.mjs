import * as ucApi from "chrome://userchromejs/content/uc_api.sys.mjs";

export const colorPresetNames = {
    null: "Floating",
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
    "conic": "Conic"
}

export function customThemeLoader(data) {
    return data;
}

export function customColorLoader(data) {
    return data;
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
    // {"type": "linear", "angle": 135, "preset": null, "colors": [
    //   {"code": "hsla(255, 100%, 50%, 1)", "angle": 255, "radius": 1, "value": 1, "opacity": 1, "order": 0},
    //   {"code": "hsla(300, 100%, 50%, 1)", "angle": 300, "radius": 1, "value": 1, "opacity": 1, "order": 1}
    // ]}

    const gradientType = gradientTypes[data["type"]][0] ?? "linear";
    const angle = ((data["angle"] ?? 0) + 180) % 360;
    const angleString = `${angle}deg`;
    let angleOverride = gradientTypes[data["type"]][1] ?? null;
    let colors = data["colors"] ?? [];
    let colorCodes = [];

    if (colors.length === 0) {
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

export function applyCustomTheme() {
    let isCustomTheme = false;
    if (ucApi.Prefs.get("natsumi.theme.type").exists()) {
        isCustomTheme = ucApi.Prefs.get("natsumi.theme.type").value === "custom";
    }

    let customThemeData = {};

    // Example theme data
    // {"light": {"0": {
    //   "background": {"type": "linear", "angle": 135, "preset": null, "colors": [
    //     {"code": "hsla(255, 100%, 50%, 1)", "angle": 255, "radius": 1, "value": 1, "opacity": 1, "order": 0},
    //     {"code": "hsla(300, 100%, 50%, 1)", "angle": 300, "radius": 1, "value": 1, "opacity": 1, "order": 1}
    //   ]}
    // }}}

    try {
        customThemeData = JSON.parse(ucApi.Prefs.get("natsumi.theme.custom-theme-data").value);
    } catch (e) {
        console.error("Invalid theme data:", e);
        return;
    }

    ucApi.Windows.forEach((browserDocument, browserWindow) => {
        let body = browserDocument.body;

        for (let index in customThemeData["light"]) {
            let layerData = customThemeData["light"][index];

            if (layerData["background"]) {
                const backgroundValue = parseBackground(layerData["background"]);
                if (!backgroundValue) {
                    body.style.removeProperty(`--natsumi-theme-layer-${index}-background`);
                } else {
                    body.style.setProperty(`--natsumi-theme-layer-${index}-background`, backgroundValue);
                    }
            }
        }

        for (let index in customThemeData["dark"]) {
            let layerData = customThemeData["dark"][index];

            if (layerData["background"]) {
                const backgroundValue = parseBackground(layerData["background"]);
                if (!backgroundValue) {
                    body.style.removeProperty(`--natsumi-theme-layer-${index}-background-dark`);
                } else {
                    body.style.setProperty(`--natsumi-theme-layer-${index}-background-dark`, backgroundValue);
                }
            }
        }
    }, true);
}