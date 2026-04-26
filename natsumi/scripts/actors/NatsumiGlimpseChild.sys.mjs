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

export class NatsumiGlimpseChild extends JSWindowActorChild {
    constructor() {
        super();
        this.activationMethod = "alt";
        this.holdClickTimeout = null;
        this.usedHoldClick = false;
    }

    consoleLog(message) {
        this.sendAsyncMessage("Natsumi:ConsoleLog", {"message": message});
    }

    handleEvent(event) {
        switch (event.type) {
            case "DOMContentLoaded": {
                // Request for Glimpse activation method
                this.sendAsyncMessage("Natsumi:GlimpseActivationMethodRequest", {});
                break;
            }
            case "click": {
                this.onClickEvent(event);
                break;
            }
            case "mousedown": {
                this.onMouseDownEvent(event);
                break;
            }
            case "mouseup": {
                this.onMouseUpEvent(event);
                break;
            }
            case "drag": {
                this.onMouseUpEvent(event);
                break;
            }
            default: {
                // Do nothing
                break;
            }
        }
    }

    onMouseDownEvent(event) {
        this.usedHoldClick = false;
        if (this.activationMethod !== "hold") {
            return;
        }

        // Check if modifiers are being pressed
        const hasModifier = (
            event.altKey ||
            event.ctrlKey ||
            event.shiftKey ||
            event.metaKey
        )

        if (hasModifier) {
            return;
        }

        let detectedLink = event.target.href || event.target.closest("A").href;
        if (!detectedLink) {
            return;
        }

        this.sendAsyncMessage("Natsumi:GlimpseHold", {
            content: detectedLink
        });
    }

    onMouseUpEvent() {
        if (this.activationMethod !== "hold") {
            return;
        }

        this.sendAsyncMessage("Natsumi:GlimpseHoldCancel", {});
    }

    onClickEvent(event) {
        // for testing, force activation to be alt
        let detectedLink = event.target.href || event.target.closest("A").href;

        // Do not trigger on hold click activation
        if (this.usedHoldClick) {
            event.preventDefault();
            event.stopPropagation();
            this.usedHoldClick = false;
            return;
        }

        const hasModifier = (
            (event.altKey && this.activationMethod === "alt") ||
            (event.ctrlKey && this.activationMethod === "ctrl") ||
            (event.shiftKey && this.activationMethod === "shift") ||
            (event.metaKey && this.activationMethod === "meta")
        );

        if (hasModifier && detectedLink) {
            event.preventDefault();
            event.stopPropagation();

            this.sendAsyncMessage("Natsumi:Glimpse", {
                content: detectedLink
            });
        }
    }

    async receiveMessage(message) {
        switch (message.name) {
            case "Natsumi:GlimpseActivationMethod": {
                this.activationMethod = message.data["method"];
                break;
            }
            case "Natsumi:GlimpseHoldActivate": {
                this.usedHoldClick = true;
                break;
            }
        }
    }
}
