// ==UserScript==
// @include      main
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

// CSS injector for styles that need inline injection

class NatsumiCSSInjector {
    constructor() {
        this.injected = new Map();
    }

    inject(filepath) {
        if (this.injected.has(filepath)) {
            console.error(`Style already exists for ${filepath}`);
            return;
        }

        const injectedStyle = document.createElement("link");
        injectedStyle.rel = "stylesheet"
        injectedStyle.href = `chrome://natsumi/content/modules/injected/${filepath}`;
        document.head.appendChild(injectedStyle);
        this.injected.set(filepath, injectedStyle);
    }

    remove(filepath) {
        if (!this.injected.has(filepath)) {
            console.error(`Style does not exist for ${filepath}`);
            return;
        }

        this.injected.get(filepath).remove();
        this.injected.delete(filepath);
    }
}

if (!document.body.natsumiCSSInjector) {
    document.body.natsumiCSSInjector = new NatsumiCSSInjector();
    document.body.natsumiCSSInjector.inject("linux-border-radius.css")
    document.body.natsumiCSSInjector.inject("macos-menus.css")
}
