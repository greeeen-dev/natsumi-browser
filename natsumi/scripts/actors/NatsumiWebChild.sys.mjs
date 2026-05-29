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

export class NatsumiWebChild extends JSWindowActorChild {
    constructor() {
        super();
    }

    consoleLog(message) {
        this.sendAsyncMessage("Natsumi:ConsoleLog", {"message": message});
    }

    handleEvent(event) {
        switch (event.type) {
            case "DOMContentLoaded": {
                try {
                    let document = this.contentWindow.document;
                    let installTest = document.body.querySelector("#natsumi-install-test");
                    let installTestText = installTest.querySelector(".natsumi-install-text");
                    let installTestDescription = installTest.querySelector(".natsumi-install-description");

                    // Set fully installed status
                    installTest.classList.add("natsumi-full-install");
                    installTestText.textContent = "Natsumi is installed";
                    installTestDescription.textContent = "You're already using Natsumi. Nice work!";
                } catch(e) {
                    this.consoleLog(e);
                }
            }
        }
    }
}
