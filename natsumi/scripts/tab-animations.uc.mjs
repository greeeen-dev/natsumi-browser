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
        if (tab.getAttribute("pending") === true || tab.hasAttribute("natsumi-animation-done")) {
            return;
        }

        const tabWidth = tab.getBoundingClientRect().width;
        const tabHeight = tab.getBoundingClientRect().height;
        const paddingLeft = window.getComputedStyle(tab).paddingLeft;
        const paddingRight = window.getComputedStyle(tab).paddingRight;
        const paddingTop = window.getComputedStyle(tab).paddingTop;
        const paddingBottom = window.getComputedStyle(tab).paddingBottom;

        tab.style.setProperty("--natsumi-animation–width", `calc(${tabWidth}px - ${paddingLeft} - ${paddingRight})`);
        tab.style.setProperty("--natsumi-animation–height", `calc(${tabHeight}px - ${paddingTop} - ${paddingBottom})`);
        tab.setAttribute("natsumi-animation-incoming", "true");
        tab.setAttribute("natsumi-animation", "true");
        tab.removeAttribute("natsumi-animation-incoming");

        setTimeout(() => {
            tab.removeAttribute("natsumi-animation");
            tab.setAttribute("natsumi-animation-done");
        }, 200);
    }
}

if (!document.body.natsumiTabAnimationManager) {
    document.body.natsumiTabAnimationManager = new NatsumiTabAnimationManager();
    document.body.natsumiTabAnimationManager.init();
}