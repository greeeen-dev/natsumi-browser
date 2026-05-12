class NatsumiTabAnimationManager {
    constructor() {
        this.tabListObserver = null;
    }

    init() {
        this.tabListObserver = new MutationObserver((mutations) => {
            for (let mutation of mutations) {
                for (let tab of mutation.addedNodes) {
                    this.runTabAnimation(tab);
                }
            }
        });

        let unpinnedTabsList = document.getElementById("tabbrowser-arrowscrollbox");
        this.tabListObserver.observe(unpinnedTabsList, {childList: true});
    }

    runTabAnimation(tab) {
        if (tab.getAttribute("pending") === true) {
            return;
        }

        const tabWidth = tab.getBoundingClientRect().width;
        const tabHeight = tab.getBoundingClientRect().height;

        tab.style.setProperty("--natsumi-animation–width", `${tabWidth}px`);
        tab.style.setProperty("--natsumi-animation–height", `${tabHeight}px`);
        tab.setAttribute("natsumi-animation-incoming", "true");
        tab.setAttribute("natsumi-animation", "true");
        tab.removeAttribute("natsumi-animation-incoming");

        setTimeout(() => {
            tab.removeAttribute("natsumi-animation");
        }, 200);
    }
}

if (!document.body.natsumiTabAnimationManager) {
    document.body.natsumiTabAnimationManager = new NatsumiTabAnimationManager();
    document.body.natsumiTabAnimationManager.init();
}