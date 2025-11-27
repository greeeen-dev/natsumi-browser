class NatsumiStickyTabsManager {
    constructor() {
        this.popupSet = null;
        this.tabContextMenu = null;
    }

    init() {
        this.popupSet = document.getElementById("mainPopupSet");
        this.tabContextMenu = document.getElementById("tabContextMenu");

        // Add event listeners
        this.popupSet.addEventListener("command", this.onPopupCommand.bind(this));
        this.tabContextMenu.addEventListener("popupshowing", this.onPopupShowing.bind(this));
    }

    onPopupCommand(event) {

    }

    onPopupShowing(event) {

    }

    addToStickyTabs(tab) {

    }
}

if (!document.body.natsumiStickyTabsManager) {
    document.body.natsumiStickyTabsManager = new NatsumiStickyTabsManager();
    document.body.natsumiStickyTabsManager.init();
}