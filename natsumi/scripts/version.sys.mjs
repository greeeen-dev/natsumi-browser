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

export function getBrowserVersion() {
    let browserName = AppConstants.MOZ_APP_BASENAME;
    const forkedFox = browserName.toLowerCase() !== "firefox";

    if (!forkedFox) {
        return getFirefoxVersion();
    }

    let forkedVersion = AppConstants.MOZ_APP_VERSION_DISPLAY;

    if (browserName.toLowerCase() === "floorp") {
        // Browser version format: [Floorp version]@[Firefox version] (e.g. 12.3.0@144.0)
        forkedVersion = forkedVersion.split("@")[0];
    } else if (browserName.toLowerCase() === "mullvadbrowser") {
        forkedVersion = AppConstants.BASE_BROWSER_VERSION;
    }

    return forkedVersion;
}

export function getFirefoxVersion() {
    let browserName = AppConstants.MOZ_APP_BASENAME;
    let browserVersion = Services.appinfo.platformVersion ?? Services.appinfo.version;

    if (browserName.toLowerCase() === "glide") {
        browserVersion = AppConstants.GLIDE_FIREFOX_VERSION;
    }

    return browserVersion;
}

export function getMajorFirefoxVersion() {
    return parseInt(getFirefoxVersion().split(".", 1)[0]);
}