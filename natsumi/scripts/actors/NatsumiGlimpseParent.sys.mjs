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

export class NatsumiGlimpseParent extends JSWindowActorParent {
    constructor() {
        super();
        this.natsumiMessageListeners = {}
        this.glimpseHoldTimeout = null;

        // Register listeners
        this.registerMessageListener("Natsumi:ConsoleLog", (message) => {
            console.log("[Glimpse]", message.data["message"]);
        })
        this.registerMessageListener("Natsumi:Glimpse", (message) => {
            console.log("[Glimpse] Got Glimpse link from child:", message.data["content"]);
            this.activateGlimpse(message.data["content"]);
        })
        this.registerMessageListener("Natsumi:GlimpseHold", (message) => {
            console.log("[Glimpse] Got Glimpse hold link from child:", message.data["content"]);
            this.glimpseHoldTimeout = this.browsingContext.topChromeWindow.setTimeout(() => {
                this.activateGlimpse(message.data["content"]);
                this.sendAsyncMessage("Natsumi:GlimpseHoldActivate", {});
            }, 500);
        });
        this.registerMessageListener("Natsumi:GlimpseHoldCancel", () => {
            if (this.glimpseHoldTimeout) {
                this.browsingContext.topChromeWindow.clearTimeout(this.glimpseHoldTimeout);
                this.glimpseHoldTimeout = null;
            }
        })
        this.registerMessageListener("Natsumi:GlimpseActivationMethodRequest", () => {
            this.pushActivationMethod();
        })

        Services.prefs.addObserver("natsumi.glimpse.key", this.pushActivationMethod.bind(this));
    }

    pushActivationMethod() {
        // Get activation method
        let activationMethod = "alt";

        try {
            activationMethod = Services.prefs.getStringPref("natsumi.glimpse.key");
        } catch (e) {
            // Activation method hasn't been changed
        }

        this.sendAsyncMessage("Natsumi:GlimpseActivationMethod", {"method": activationMethod});
    }

    registerMessageListener(messageName, callback) {
        if (this.natsumiMessageListeners[messageName]) {
            throw new Error("Listener already registered for message");
        }

        this.natsumiMessageListeners[messageName] = callback;
    }

    async receiveMessage(message) {
        if (!this.natsumiMessageListeners[message.name]) {
            console.warn("Got unexpected message from Glimpse child:", message.name);
            return;
        }

        this.natsumiMessageListeners[message.name](message);
    }

    activateGlimpse(link) {
        this.browsingContext.topChromeWindow.natsumiGlimpse.activateGlimpse(link);
    }
}