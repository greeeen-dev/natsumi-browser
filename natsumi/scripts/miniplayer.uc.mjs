// ==UserScript==
// @include   main
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

import * as ucApi from "chrome://userchromejs/content/uc_api.sys.mjs";

function convertToXUL(node) {
    // noinspection JSUnresolvedReference
    return window.MozXULElement.parseXULToFragment(node);
}

class NatsumiMiniplayerCounter {
    constructor(miniplayerContainer) {
        this._node = null;
        this._initialized = false;
        this._miniplayerContainer = miniplayerContainer;
        this._visibleMiniplayers = 0;
    }

    init() {
        if (this._initialized) {
            return;
        }

        // Generate node
        this._node = document.createElement("div");
        this._node.id = "natsumi-miniplayer-counter-container";

        // Append to container
        let tabsContainer = document.getElementById("vertical-tabs");
        tabsContainer.appendChild(this._node);

        // Get initial count
        this.updateCount();

        // Add event listener
        // Add scroll event listener
        this._miniplayerContainer.addEventListener("wheel", (event) => {
            this.updateSelected();
        });

        this._initialized = true;
    }

    updateCount() {
        const miniplayers = this._miniplayerContainer.querySelectorAll(".natsumi-miniplayer:not([hidden])");
        this._visibleMiniplayers = miniplayers.length;

        while (this._visibleMiniplayers !== this._node.childElementCount) {
            if (this._visibleMiniplayers > this._node.childElementCount) {
                let countNode = document.createElement("div");
                countNode.className = "natsumi-miniplayer-counter-dot";
                this._node.appendChild(countNode);
            } else {
                if (this._node.lastChild) {
                    this._node.removeChild(this._node.lastChild);
                }
            }
        }

        const miniplayerNode = document.getElementById("natsumi-miniplayer-container");
        if (this._visibleMiniplayers === 0) {
            miniplayerNode.setAttribute("hide-margin", "true");
        } else {
            miniplayerNode.removeAttribute("hide-margin");
        }

        this.updateSelected();
    }

    updateSelected() {
        // Get scrolled amount on container element (not the event)
        let currentScroll = this._miniplayerContainer.scrollLeft;
        let containerWidth = this._miniplayerContainer.getBoundingClientRect().width;
        let shouldScroll = containerWidth + 5;
        let currentPlayerIndex = Math.floor((currentScroll + (containerWidth / 2)) / shouldScroll);

        if (currentPlayerIndex < 0) {
            currentPlayerIndex = 0;
        } else if (currentPlayerIndex >= this._visibleMiniplayers) {
            currentPlayerIndex = this._visibleMiniplayers - 1;
        }

        this._node.querySelectorAll(".natsumi-miniplayer-counter-dot").forEach((node, index) => {
            if (index === currentPlayerIndex) {
                node.setAttribute("active", "true");
            } else {
                node.removeAttribute("active");
            }
        });
    }
}

class NatsumiMiniplayer {
    // "Miniplayer" was just a nickname I gave to Zen's sidebar media controls, but for some reason
    // everyone ended up calling it that, so I guess I coined that term...

    constructor(tab) {
        if (tab.nodeName.toLowerCase() === "browser") {
            // Throw an error so that I can remind myself to not get these two confused
            throw new Error("Failed to initialize miniplayer, the tab is a browser. I know, these can get confusing, but let's try to get it right.");
        }

        this._tab = tab;
        this._node = null;
        this._initialized = false;

        // Get media controller and metadata
        this._mediaMetadata = null;
        try {
            this._mediaMetadata = this._tab.linkedBrowser.browsingContext.mediaController.getMetadata();
        } catch(e) {}

        // Get media data
        this.artist = null;
        this.album = null;
        this.title = null;
        this.artwork = null;
        if (this._mediaMetadata) {
            this.getMediaMetadata();
        }

        // Get playback state
        this.isPlaying = false;
        this.isMuted = false;
        this.duration = 0;
        this.position = 0;
        //this._positionIncrement = null;
        this.getPlaybackState();

        // Get tab data
        this.siteName = null;
        this.siteIcon = null;
        try {
            this.getTabData();
        } catch(e) {
            // This is not critical, so we can do this next time we render the UI
        }

        // Set additional variables
        this.alternateButtonSet = false;
    }

    init() {
        if (this._initialized) {
            return;
        }

        // If there's no metadata, then skip
        try {
            this._mediaMetadata = this._tab.linkedBrowser.browsingContext.mediaController.getMetadata();
            this.getMediaMetadata();
        } catch(e) {
            console.error(e);
            return;
        }

        // Get available buttons
        const availableButtons = this._tab.linkedBrowser.browsingContext.mediaController.supportedKeys
        let playPauseAvailable = availableButtons.includes("playpause");
        let nextTrackAvailable = availableButtons.includes("nexttrack");
        let prevTrackAvailable = availableButtons.includes("previoustrack");
        let seekAvailable = availableButtons.includes("seekto");
        let pipAvailable = ucApi.Prefs.get("media.videocontrols.picture-in-picture.video-toggle.enabled").value;

        // Get seekbar times
        let positionMinutes = Math.floor(this.position / 60);
        let positionSeconds = Math.floor(this.position % 60);
        let durationMinutes = Math.floor(this.duration / 60);
        let durationSeconds = Math.floor(this.duration % 60);

        // Generate node
        let nodeString = `
            <div id="natsumi-miniplayer-${this._tab.linkedPanel}" class="natsumi-miniplayer" muted="${this.isMuted}" playing="${this.isPlaying}">
                <div class="natsumi-miniplayer-info-container">
                    <div class="natsumi-miniplayer-site-container">
                        <div class="natsumi-miniplayer-site-icon"></div>
                        <div class="natsumi-miniplayer-site-name"></div>
                    </div>
                    <div class="natsumi-miniplayer-title-container">
                        <div class="natsumi-miniplayer-title"></div>
                    </div>
                    <div class="natsumi-miniplayer-author-container">
                        <div class="natsumi-miniplayer-artist"></div>
                    </div>
                    <div class="natsumi-miniplayer-seekbar-container" hidden="${!seekAvailable}">
                        <div class="natsumi-miniplayer-position">${positionMinutes}:${positionSeconds.toString().padStart(2, "0")}</div>
                        <div class="natsumi-miniplayer-seekbar"></div>
                        <div class="natsumi-miniplayer-duration">${durationMinutes}:${durationSeconds.toString().padStart(2, "0")}</div>
                    </div>
                </div>
                <div class="natsumi-miniplayer-controls-container">
                    <div class="natsumi-miniplayer-pip-button" disabled="${!pipAvailable}"></div>
                    <div class="natsumi-miniplayer-prevtrack-button" disabled="${!prevTrackAvailable}"></div>
                    <div class="natsumi-miniplayer-pauseplay-button" disabled="${!playPauseAvailable}" playing="${this.isPlaying}"></div>
                    <div class="natsumi-miniplayer-nexttrack-button" disabled="${!nextTrackAvailable}"></div>
                    <div class="natsumi-miniplayer-mute-button"></div>
                </div>
            </div>
        `
        this._node = convertToXUL(nodeString);

        // Add event handlers to media controller
        this.registerEventHandlers();

        // Add event listeners to buttons
        this._node.querySelector(".natsumi-miniplayer-site-container").addEventListener("click", () => {
            window.gBrowser.selectedTab = this._tab;
        });
        this._node.querySelector(".natsumi-miniplayer-mute-button").addEventListener("click", () => {
            this.toggleMute();
        });
        this._node.querySelector(".natsumi-miniplayer-pauseplay-button").addEventListener("click", () => {
            this.togglePlayPause();
        });
        this._node.querySelector(".natsumi-miniplayer-prevtrack-button").addEventListener("click", () => {
            if (this.usesAlternateButtonSet()) {
                this.seekBackward();
            } else {
                this.prevTrack();
            }
        });
        this._node.querySelector(".natsumi-miniplayer-nexttrack-button").addEventListener("click", () => {
            if (this.usesAlternateButtonSet()) {
                this.seekForward();
            } else {
                this.nextTrack();
            }
        });
        this._node.querySelector(".natsumi-miniplayer-pip-button").addEventListener("click", (event) => {
            let result = this._tab.linkedBrowser.browsingContext.currentWindowGlobal.getActor("PictureInPictureLauncher").sendAsyncMessage("PictureInPicture:KeyToggle");
        });

        // Append to container
        let miniplayerContainer = document.getElementById("natsumi-miniplayer-container");
        miniplayerContainer.appendChild(this._node);

        // Replace DocumentFragment node with actual node
        this._node = document.getElementById(`natsumi-miniplayer-${this._tab.linkedPanel}`);

        // Add artwork and favicon
        this._node.style.setProperty("--natsumi-miniplayer-artwork", `url('${this.artwork}')`);
        this._node.style.setProperty("--natsumi-miniplayer-site-icon", `url('${this.siteIcon}')`);

        if (!this.artwork.endsWith("defaultFavicon.svg")) {
            // Only add has artwork attribute if the artwork is not the default favicon
            this._node.setAttribute("miniplayer-has-artwork", "");
        }

        // Set site data and media metadata
        this._node.querySelector(".natsumi-miniplayer-site-name").textContent = this.siteName || "Unknown site";
        this._node.querySelector(".natsumi-miniplayer-title").textContent = this.title || "Unknown";
        this._node.querySelector(".natsumi-miniplayer-artist").textContent = this.artist || "Unknown artist";
        if (this.album) {
            this._node.querySelector(".natsumi-miniplayer-artist").textContent = `${this.artist || "Unknown artist"} • ${this.album}`;
        }

        // Set key event listeners
        window.addEventListener("keydown", (event) => {
            this.onKeyDown(event);
        });
        window.addEventListener("keyup", (event) => {
            this.onKeyUp(event);
        });

        this._initialized = true;
        miniplayerCounter.updateCount();
    }

    registerEventHandlers() {
        if (!this._tab.linkedBrowser.browsingContext.mediaController.onpositionstatechange) {
            this._tab.linkedBrowser.browsingContext.mediaController.onpositionstatechange = (event) => {
                this.onPositionUpdate(event);
            };
        }
        if (!this._tab.linkedBrowser.browsingContext.mediaController.onplaybackstatechange) {
            this._tab.linkedBrowser.browsingContext.mediaController.onplaybackstatechange = (event) => {
                this.onPlaybackUpdate(event);
            };
        }
        if (!this._tab.linkedBrowser.browsingContext.mediaController.onmetadatachange) {
            this._tab.linkedBrowser.browsingContext.mediaController.onmetadatachange = (event) => {
                this.onMetadataUpdate(event);
            };
        }
        if (!this._tab.linkedBrowser.browsingContext.mediaController.onsupportedkeyschange) {
            this._tab.linkedBrowser.browsingContext.mediaController.onsupportedkeyschange = (event) => {
                this.onSupportedKeysUpdate(event);
            };
        }
    }

    usesAlternateButtonSet() {
        const availableButtons = this._tab.linkedBrowser.browsingContext.mediaController.supportedKeys
        const trackSkipAvailable = availableButtons.includes("nexttrack") || availableButtons.includes("previoustrack");
        return this.alternateButtonSet || !trackSkipAvailable;
    }

    getMediaMetadata() {
        this._mediaMetadata = this._tab.linkedBrowser.browsingContext.mediaController.getMetadata();
        this.artist = this._mediaMetadata.artist || null;
        this.album = this._mediaMetadata.album || null;
        this.title = this._mediaMetadata.title || null;
        this.artwork = this._mediaMetadata.artwork || null;

        if (this.artwork) {
            this.artwork = this.artwork[0].src;

            if (this._node) {
                let usedArtwork;
                this._node.style.setProperty("--natsumi-miniplayer-artwork", `url('${this.artwork}')`);

                if (!this.artwork.endsWith("defaultFavicon.svg")) {
                    // Only add has artwork attribute if the artwork is not the default favicon
                    this._node.setAttribute("miniplayer-has-artwork", "");
                    usedArtwork = this.artwork;
                } else {
                    this._node.removeAttribute("miniplayer-has-artwork");
                    usedArtwork = this.siteIcon;
                }

                this.getAverageColor(usedArtwork).then((averageColor) => {
                    if (averageColor) {
                        this._node.style.setProperty("--natsumi-miniplayer-artwork-color", `rgb(${averageColor.r}, ${averageColor.g}, ${averageColor.b})`);
                        this._node.setAttribute("miniplayer-has-custom-color", "");
                    } else {
                        this._node.style.removeProperty("--natsumi-miniplayer-artwork-color");
                        this._node.removeAttribute("miniplayer-has-custom-color");
                    }
                });
            }
        }

        // Re-add media controller event handlers in case the media controller was reset
        this.registerEventHandlers();

        // Update UI (if needed)
        if (this._node) {
            this.updateUI();
        }
    }

    getPlaybackState() {
        this.isPlaying = this._tab.linkedBrowser.browsingContext.mediaController.isPlaying;
        this.isMuted = this._tab.muted;
        this.updateUI();
    }

    getTabData() {
        this.siteName = this._tab.linkedBrowser.currentURI.host;
        this.siteIcon = this._tab.linkedBrowser.mIconURL || null;

        if (this.siteIcon && this._node) {
            this._node.style.setProperty("--natsumi-miniplayer-site-icon", `url('${this.siteIcon}')`);
        }
    }

    toggleMute() {
        this._tab.toggleMuteAudio();
        this.getPlaybackState();
        this.updateUI();
    }

    togglePlayPause() {
        if (this.isPlaying) {
            this._tab.linkedBrowser.browsingContext.mediaController.pause();
        } else {
            this._tab.linkedBrowser.browsingContext.mediaController.play();
        }
        this.getPlaybackState();
        this.updateUI();
    }

    prevTrack() {
        this._tab.linkedBrowser.browsingContext.mediaController.prevTrack();
        this.getPlaybackState();
    }

    nextTrack() {
        this._tab.linkedBrowser.browsingContext.mediaController.nextTrack();
        this.getPlaybackState();
    }

    seekForward() {
        this._tab.linkedBrowser.browsingContext.mediaController.seekForward(5);
    }

    seekBackward() {
        this._tab.linkedBrowser.browsingContext.mediaController.seekBackward(5);
    }

    handleSeekbarClick(event) {
        let seekbarNode = this._node.querySelector(".natsumi-miniplayer-seekbar");

        if (!seekbarNode) {
            return;
        }

        let seekbarWidth = seekbarNode.getBoundingClientRect().width;
        const relativeX = event.clientX - seekbarNode.getBoundingClientRect().left;
        const seekPosition = (relativeX / seekbarWidth) * this.duration;
        this._tab.linkedBrowser.browsingContext.mediaController.seekTo(seekPosition);
        this.position = seekPosition;
        this.updateSeekbar();
    }

    async getAverageColor(artworkUrl) {
        // Create offscreen canvas
        const temporaryCanvas = document.createElement("canvas");
        const canvasContext = temporaryCanvas.getContext("2d");

        // Create image element
        const temporaryImage = new Image();
        temporaryImage.src = artworkUrl;
        await temporaryImage.decode();

        // Draw image
        canvasContext.drawImage(temporaryImage, 0, 0, 1, 1);

        // Get pixel data
        const pixelData = canvasContext.getImageData(0, 0, 1, 1).data;

        // Remove canvas and image elements
        temporaryCanvas.remove();
        temporaryImage.remove();

        if (!pixelData) {
            // Could not get pixel data for some reason
            return;
        }

        // Check that opacity is above 0
        if (pixelData[3] === 0) {
            return;
        }

        // Return color data
        return {
            r: pixelData[0],
            g: pixelData[1],
            b: pixelData[2]
        };
    }

    // UI updates
    async updateUI() {
        if (!this._node) {
            return;
        }

        if (!this.siteName && !this.siteIcon) {
            try {
                this.getTabData();
            } catch(e) {
                // This is not critical, so we can skip it
            }
        }

        // Update titles
        this._node.querySelector(".natsumi-miniplayer-site-name").textContent = this.siteName || "Unknown site";
        this._node.querySelector(".natsumi-miniplayer-title").textContent = this.title || "Unknown";
        this._node.querySelector(".natsumi-miniplayer-artist").textContent = this.artist || "Unknown artist";
        if (this.album) {
            this._node.querySelector(".natsumi-miniplayer-artist").textContent = `${this.artist || "Unknown artist"} • ${this.album}`;
        }

        // Get available buttons
        let availableButtons = this._tab.linkedBrowser.browsingContext.mediaController.supportedKeys;
        let playPauseAvailable = availableButtons.includes("playpause");
        let nextTrackAvailable = availableButtons.includes("nexttrack");
        let prevTrackAvailable = availableButtons.includes("previoustrack");
        let seekAvailable = availableButtons.includes("seekto");
        let pipAvailable = ucApi.Prefs.get("media.videocontrols.picture-in-picture.video-toggle.enabled").value;

        if (this.usesAlternateButtonSet()) {
            nextTrackAvailable = availableButtons.includes("seekforward");
            prevTrackAvailable = availableButtons.includes("seekbackward");
        }

        // Get button objects
        let playPauseButton = this._node.querySelector(".natsumi-miniplayer-pauseplay-button");
        let nextTrackButton = this._node.querySelector(".natsumi-miniplayer-nexttrack-button");
        let prevTrackButton = this._node.querySelector(".natsumi-miniplayer-prevtrack-button");
        let pipButton = this._node.querySelector(".natsumi-miniplayer-pip-button");
        let seekbarContainer = this._node.querySelector(".natsumi-miniplayer-seekbar-container");
        let seekbarNode = this._node.querySelector(".natsumi-miniplayer-seekbar");
        let positionLabel = this._node.querySelector(".natsumi-miniplayer-position");
        let durationLabel = this._node.querySelector(".natsumi-miniplayer-duration");

        // Set play states
        this._node.setAttribute("muted", this.isMuted);
        this._node.setAttribute("playing", this.isPlaying);

        // Set alternate button set state
        this._node.setAttribute("alternate-buttons", this.usesAlternateButtonSet());

        // Disable buttons if needed
        if (playPauseButton) {
            playPauseButton.setAttribute("disabled", !playPauseAvailable);
        }
        if (nextTrackButton) {
            nextTrackButton.setAttribute("disabled", !nextTrackAvailable);
        }
        if (prevTrackButton) {
            prevTrackButton.setAttribute("disabled", !prevTrackAvailable);
        }
        if (pipButton) {
            pipButton.setAttribute("disabled", !pipAvailable);
        }
        if (seekbarContainer) {
            seekbarContainer.hidden = !seekAvailable;
        }

        // Update seekbar
        if (seekbarNode && seekAvailable) {
            let positionMinutes = Math.floor(this.position / 60);
            let positionSeconds = Math.floor(this.position % 60);
            let durationMinutes = Math.floor(this.duration / 60);
            let durationSeconds = Math.floor(this.duration % 60);
            positionLabel.textContent = `${positionMinutes}:${positionSeconds.toString().padStart(2, "0")}`;
            durationLabel.textContent = `${durationMinutes}:${durationSeconds.toString().padStart(2, "0")}`;
            this.updateSeekbar();
        }
    }

    async updateSeekbar() {
        let seekbarNode = this._node.querySelector(".natsumi-miniplayer-seekbar");
        let progress = (this.position / this.duration);
        let seekbarWidth = seekbarNode.getBoundingClientRect().width;

        let seekbarPosition = progress * seekbarWidth;
        if (isNaN(seekbarPosition)) {
            seekbarPosition = 0;
        }

        seekbarNode.style.setProperty("--natsumi-seekbar-position", `${seekbarPosition}px`);
    }

    updatePosition(duration, position, playbackRate) {
        this.duration = duration;
        this.position = position;
        this.updateSeekbar();

        if (this.isPlaying) {
            if (this._positionIncrement) {
                clearInterval(this._positionIncrement);
                this._positionIncrement = null;
            }

            this._positionIncrement = setInterval(() => {
                this.position += playbackRate;
                if (this.position > this.duration) {
                    this.position = this.duration;
                    clearInterval(this._positionIncrement);
                    this._positionIncrement = null;
                }
                this.updateUI();
            }, 1000);
        } else {
            clearInterval(this._positionIncrement);
            this._positionIncrement = null;
        }
    }

    // Events
    onPositionUpdate(event) {
        this.updatePosition(event.duration, event.position, event.playbackRate);
        this.getTabData();
        this.updateUI();
    }

    onPlaybackUpdate(event) {
        this.getPlaybackState();
        this.getTabData();
        this.updateUI();
    }

    onMetadataUpdate(event) {
        this._mediaMetadata = this._tab.linkedBrowser.browsingContext.mediaController.getMetadata();
        this.getMediaMetadata();
        this.getPlaybackState();
        this.getTabData();
        this.updateUI();
    }

    onSupportedKeysUpdate(event) {
        this.updateUI();
    }

    onKeyDown(event) {
        if (event.shiftKey) {
            this.alternateButtonSet = true;
            this.updateUI();
        }
    }

    onKeyUp(event) {
        if (!event.shiftKey) {
            this.alternateButtonSet = false;
            this.updateUI();
        }
    }

    hideMiniplayer() {
        if (this._node) {
            this._node.setAttribute("hidden", "true");
        }
        miniplayerCounter.updateCount();
    }

    showMiniplayer() {
        if (this._node) {
            this._node.removeAttribute("hidden");
        }
        miniplayerCounter.updateCount();
    }

    async destroy() {
        // Remove window event handlers
        window.removeEventListener("keydown", (event) => {
            this.onKeyDown(event);
        });
        window.removeEventListener("keyup", (event) => {
            this.onKeyUp(event);
        });

        if (this._node && this._node.parentNode) {
            this._node.parentNode.removeChild(this._node);
        }
        this._node = null;
        this._initialized = false;
        miniplayerCounter.updateCount();
    }
}

async function registerMiniplayer(tab) {
    if (tab.natsumiMiniplayer) {
        return;
    }

    try {
        tab.natsumiMiniplayer = new NatsumiMiniplayer(tab);
        tab.natsumiMiniplayer.init();
    } catch(e) {
        console.error(e);
        return;
    }

    if (tab.selected) {
        tab.natsumiMiniplayer.hideMiniplayer();
    }
}

let miniplayerContainer = document.getElementById("natsumi-miniplayer-container");
let miniplayerCounter = null;
if (!miniplayerContainer) {
    let tabsContainer = document.getElementById("vertical-tabs");

    miniplayerContainer = document.createElement("div");
    miniplayerContainer.id = "natsumi-miniplayer-container";
    tabsContainer.appendChild(miniplayerContainer);

    miniplayerCounter = new NatsumiMiniplayerCounter(miniplayerContainer);
    miniplayerCounter.init();
}

// Register miniplayer when audio starts playing
window.gBrowser.addEventListener("DOMAudioPlaybackStarted", (event) => {
    let tab = window.gBrowser.getTabForBrowser(event.target);

    if (!tab.natsumiMiniplayer) {
        registerMiniplayer(tab);
    } else {
        try {
            // If this is successful, the metadata still exists
            tab.natsumiMiniplayer.getMediaMetadata();

            // Since metadata exists, we can update some stuff
            tab.natsumiMiniplayer.getPlaybackState();
        } catch(e) {
            // Metadata doesn't exist
            tab.natsumiMiniplayer.destroy();
            tab.natsumiMiniplayer = null;
        }
    }
});

// Destroy miniplayer when audio stops playing (UNLESS metadata still exists)
window.gBrowser.addEventListener("DOMAudioPlaybackStopped", (event) => {
    let tab = window.gBrowser.getTabForBrowser(event.target);
    if (tab.natsumiMiniplayer) {
        try {
            // If this is successful, the metadata still exists
            tab.natsumiMiniplayer.getMediaMetadata();

            // Since metadata exists, we can update some stuff
            tab.natsumiMiniplayer.getPlaybackState();
        } catch(e) {
            // Metadata doesn't exist, so destroy
            tab.natsumiMiniplayer.destroy();
            tab.natsumiMiniplayer = null;
        }
    }
});

// Add event listener for reloads
let progressListener = {"onStateChange": (browser, webProgress) => {
    let tab = window.gBrowser.getTabForBrowser(browser.browsingContext.topFrameElement);
    if (!tab) {
        return;
    }

    // Try to check if metadata still exists
    if (tab.natsumiMiniplayer) {
        try {
            tab.natsumiMiniplayer.getMediaMetadata();
        } catch(e) {
            tab.natsumiMiniplayer.destroy();
            tab.natsumiMiniplayer = null;
        }
    } else {
        try {
            let mediaMetadata = tab.linkedBrowser.browsingContext.mediaController.getMetadata();
            if (mediaMetadata) {
                registerMiniplayer(tab);
            }
        } catch(e) {
            // No metadata, so skip
        }
    }
}};

window.gBrowser.addProgressListener(progressListener);

// Add event listeners to handle tab closing and unload
window.gBrowser.tabContainer.addEventListener("TabClose", (event) => {
    let tab = event.target;
    if (tab.natsumiMiniplayer) {
        tab.natsumiMiniplayer.destroy();
        tab.natsumiMiniplayer = null;
    }
});
window.gBrowser.tabContainer.addEventListener("TabBrowserDiscarded", (event) => {
    let tab = event.target;
    if (tab.natsumiMiniplayer) {
        tab.natsumiMiniplayer.destroy();
        tab.natsumiMiniplayer = null;
    }
});

// Add event listener to handle tab switching
window.gBrowser.tabContainer.addEventListener("TabSelect", (event) => {
    let newTab = event.target;
    let oldTab = event.detail.previousTab;

    if (oldTab && oldTab.natsumiMiniplayer) {
        oldTab.natsumiMiniplayer.showMiniplayer();
    }
    if (newTab && newTab.natsumiMiniplayer) {
        newTab.natsumiMiniplayer.hideMiniplayer();
    }
});