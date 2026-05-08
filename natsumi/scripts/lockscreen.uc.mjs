class NatsumiLockScreenWidget {
    constructor(scale, posX, posY) {
        this.scale = scale;
        this.posX = posX;
        this.posY = posY;
    }

    getX() {
        return document.body.getBoundingClientRect().width * this.posX;
    }

    getY() {
        return document.body.getBoundingClientRect().height * this.posY;
    }
}

class NatsumiLockScreenManager {
    constructor() {
        this.wallpaper = null;
        this.widgets = [];
        this.showing = false;
    }

    init() {

    }

    updateLockscreen() {
        if (!this.showing) {
            // We can't update anything
            return;
        }
    }
}

if (!document.body.natsumiLockScreenManager) {
    document.body.natsumiLockScreenManager = new NatsumiLockScreenManager();
    document.body.natsumiLockScreenManager.init();
}