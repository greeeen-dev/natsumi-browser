// ==UserScript==
// @include   main
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

// literally just a script for meowing because i felt cute :3
// also does initial setup for natsumi stuff

import * as ucApi from "chrome://userchromejs/content/uc_api.sys.mjs";
import {applyCustomColor, applyCustomTheme} from "./custom-theme.sys.mjs";

// enjoy the excessively and absurdly long function name
function makeCatNoisesAndDoSomeVeryCuteInitialSetupBecauseIFeltVeryCuteWhenWritingThisSoHereIsAFunctionWithAnExcessivelyLongNameThatMakesRandomCatNoisesAndSomeSetup() {
    // Set Natsumi Append installed status
    document.body.setAttribute("natsumi-append-installed", "");

    // Ensure icons work on Firefox
    ucApi.Prefs.set("svg.context-properties.content.enabled", true);

    // Ensure translucency works on macOS and Windows
    let isMac = Services.appinfo.OS.toLowerCase() === "darwin";
    let isWindows = Services.appinfo.OS.toLowerCase() === "winnt";

    if (isMac) {
        ucApi.Prefs.set("widget.macos.sidebar-blend-mode.behind-window", true);
        ucApi.Prefs.set("widget.macos.titlebar-blend-mode.behind-window", true);
    } else if (isWindows) {
        ucApi.Prefs.set("widget.windows.mica", true);
    }

    // Apply customizations
    applyCustomTheme();

    // Port 6.0.0 SDL2 setting to 6.1.0
    if (ucApi.Prefs.get("natsumi.theme.enable-sdl2").exists()) {
        ucApi.Prefs.set("natsumi.theme.disable-sdl2", !ucApi.Prefs.get("natsumi.theme.enable-sdl2").value);
        ucApi.Prefs.get("natsumi.theme.enable-sdl2").reset();
    }

    // communicate in the average transfemme communication language (i.e. make cat noises) >:3333
    const catNoises = [
        "meow",
        "mrrp",
        "mrrow",
        "nya"
    ]
    const catNoise = catNoises[Math.floor(Math.random() * catNoises.length)];
    console.log(`${catNoise} :3`);
}

makeCatNoisesAndDoSomeVeryCuteInitialSetupBecauseIFeltVeryCuteWhenWritingThisSoHereIsAFunctionWithAnExcessivelyLongNameThatMakesRandomCatNoisesAndSomeSetup();