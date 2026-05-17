import * as ucApi from "chrome://userchromejs/content/uc_api.sys.mjs";

class NatsumiWidgetStyle {
    constructor(value, name) {
        this.value = value;
        this.name = name;
    }
}

class NatsumiBaseWidget {
    constructor(scale, posX, posY) {
        this.scale = scale;
        this.posX = posX;
        this.posY = posY;
        this.displayed = false;
        this.font = null;
        this.node = null;
        this.styles = [];
        this.currentStyle = null;
    }

    init() {}

    getX() {
        return `${this.posX * 100}%`;
    }

    getY() {
        return `${this.posY * 100}%`;
    }

    update() {}

    toJson() {
        return {
            "scale": this.scale,
            "x": this.posX,
            "y": this.posY,
            "displayed": this.displayed,
            "font": this.font,
            "style": this.currentStyle.value ?? null
        }
    }
}

class NatsumiClockWidget extends NatsumiBaseWidget {
    init() {
        this.styles = [
            new NatsumiWidgetStyle("default", "Default"),
            new NatsumiWidgetStyle("stacked", "Stacked")
        ]
        this.currentStyle = this.styles[0];
    }
}

class NatsumiLockScreenManager {
    constructor() {
        this.node = null;
        this.lockNode = null;
        this.wallpaper = null;
        this.widgets = [];
        this.showing = false;
        this.deferTransition = false;
    }

    init() {
        let initialLocked = false;
        if (ucApi.Prefs.get("natsumi.lockscreen.default-lock").exists) {
            initialLocked = ucApi.Prefs.get("natsumi.lockscreen.default-lock").value;
        }

        let shouldPlayAudio = false;
        if (ucApi.Prefs.get("natsumi.lockscreen.play-audio").exists && initialLocked) {
            shouldPlayAudio = ucApi.Prefs.get("natsumi.lockscreen.play-audio").value;
        }

        // Create node
        this.node = document.createElement("div");
        this.node.id = "natsumi-lockscreen";

        if (initialLocked) {
            document.body.setAttribute("natsumi-locked", "true");
        } else {
            this.node.setAttribute("hidden", "true");
        }

        document.body.appendChild(this.node);

        // Create unlock text
        this.lockNode = document.createElement("div");
        this.lockNode.id = "natsumi-lockscreen-unlock";
        this.lockNode.textContent = "Press Ctrl+Alt+Enter to unlock";
        this.node.appendChild(this.lockNode);
    }

    computeXPercentage(xPos) {
        return xPos / document.body.getBoundingClientRect().width;
    }

    computeYPercentage(yPos) {
        return yPos / document.body.getBoundingClientRect().height;
    }

    unlockLockscreen() {
        if (!this.showing || this.deferTransition) {
            return;
        }

        this.showing = false;
        this.deferTransition = true;
        this.node.setAttribute("unlocking", "true");
        document.body.removeAttribute("natsumi-locked");

        setTimeout(() => {
            this.node.setAttribute("hidden", "true");
            this.node.removeAttribute("unlocking");
            this.deferTransition = false;
        }, 500);
    }

    lockLockscreen() {
        if (this.showing || this.deferTransition) {
            return;
        }

        document.body.setAttribute("natsumi-locked", "true");
        this.node.removeAttribute("hidden");
        this.showing = true;
    }

    updateLockscreen() {
        if (!this.showing) {
            // We can't update anything
            return;
        }
    }
}

// Disable lockscreen for now
/*
if (!document.body.natsumiLockScreenManager) {
    document.body.natsumiLockScreenManager = new NatsumiLockScreenManager();
    document.body.natsumiLockScreenManager.init();
}*/