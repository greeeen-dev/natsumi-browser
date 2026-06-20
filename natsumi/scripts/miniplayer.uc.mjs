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
import {getMajorFirefoxVersion} from "./version.sys.mjs";

function convertToXUL(node) {
    // noinspection JSUnresolvedReference
    return window.MozXULElement.parseXULToFragment(node);
}

class NatsumiMiniplayerCounter {
    constructor(miniplayerContainer) {
        this.node = null;
        this._initialized = false;
        this._miniplayerContainer = miniplayerContainer;
        this._visibleMiniplayers = 0;
    }

    init() {
        if (this._initialized) {
            return;
        }

        // Generate node
        this.node = document.createElement("div");
        this.node.id = "natsumi-miniplayer-counter-container";

        // Append to container
        let tabsContainer = document.getElementById("vertical-tabs");
        tabsContainer.appendChild(this.node);

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

        while (this._visibleMiniplayers !== this.node.childElementCount) {
            if (this._visibleMiniplayers > this.node.childElementCount) {
                let countNode = document.createElement("div");
                countNode.className = "natsumi-miniplayer-counter-dot";
                this.node.appendChild(countNode);
            } else {
                if (this.node.lastChild) {
                    this.node.removeChild(this.node.lastChild);
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

        this.node.querySelectorAll(".natsumi-miniplayer-counter-dot").forEach((node, index) => {
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

        // Pinned and visibility state
        this.pinned = false;
        this.shouldHide = false;

        // Overflow animations
        this.titleAnimationScheduler = null;
        this.authorAnimationScheduler = null;
        this.globalAnimationScheduler = null;
        this.deferAnimationUpdate = false;

        // Scrubber
        this.scrubberLoop = null;
        this.canUseScrubber = getMajorFirefoxVersion() >= 152;
        this.scrubberDrag = false;
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
        let pipAvailable = ucApi.Prefs.get("media.videocontrols.picture-in-picture.video-toggle.enabled").value;

        // Generate node
        let nodeString = `
            <div id="natsumi-miniplayer-${this._tab.linkedPanel}" class="natsumi-miniplayer" muted="${this.isMuted}" playing="${this.isPlaying}">
                <div class="natsumi-miniplayer-info-container">
                    <div class="natsumi-miniplayer-top-container">
                        <div class="natsumi-miniplayer-site-container">
                            <div class="natsumi-miniplayer-site-icon"></div>
                            <div class="natsumi-miniplayer-site-name"></div>
                        </div>
                        <div class="natsumi-miniplayer-pin-button"></div>
                    </div>
                    <div class="natsumi-miniplayer-title-container">
                        <div class="natsumi-miniplayer-title-scrollable">
                            <div class="natsumi-miniplayer-title"></div>
                            <div class="natsumi-miniplayer-title" duplicate=""></div>
                        </div>
                    </div>
                    <div class="natsumi-miniplayer-author-container">
                        <div class="natsumi-miniplayer-author-scrollable">
                            <div class="natsumi-miniplayer-artist"></div>
                            <div class="natsumi-miniplayer-artist" duplicate=""></div>
                        </div>
                    </div>
                    <div class="natsumi-miniplayer-scrubber-container">
                        <div class="natsumi-miniplayer-position"></div>
                        <div class="natsumi-miniplayer-scrubber"></div>
                        <div class="natsumi-miniplayer-duration"></div>
                    </div>
                </div>
                <div class="natsumi-miniplayer-controls-container">
                    <div class="natsumi-miniplayer-pin-button"></div>
                    <div class="natsumi-miniplayer-pip-button" disabled="${!pipAvailable}"></div>
                    <div class="natsumi-miniplayer-prevtrack-button" disabled="${!prevTrackAvailable}"></div>
                    <div class="natsumi-miniplayer-pauseplay-button" disabled="${!playPauseAvailable}" playing="${this.isPlaying}"></div>
                    <div class="natsumi-miniplayer-nexttrack-button" disabled="${!nextTrackAvailable}"></div>
                    <div class="natsumi-miniplayer-mute-button"></div>
                </div>
            </div>
        `
        this._node = convertToXUL(nodeString);

        // Check miniplayer scrubber availability
        if (!this.canUseScrubber) {
            this._node.querySelector(".natsumi-miniplayer").setAttribute("natsumi-no-scrubber", "");
        }

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
        this._node.querySelector(".natsumi-miniplayer-pip-button").addEventListener("click", () => {
            this._tab.linkedBrowser.browsingContext.currentWindowGlobal.getActor("PictureInPictureLauncher").sendAsyncMessage("PictureInPicture:KeyToggle");
        });
        this._node.querySelector(".natsumi-miniplayer-scrubber").addEventListener("mousedown", (event) => {
            this.scrubberDrag = true;
            this.handleScrubber(event);
        });
        this._node.querySelector(".natsumi-miniplayer-scrubber").addEventListener("wheel", (event) => {
            this.handleScrubber(event, true);
        });
        window.addEventListener("mousemove", (event) => {
            if (this.scrubberDrag) {
                this.handleScrubber(event);
            }
        });
        window.addEventListener("mouseup", () => {
            this.scrubberDrag = false;
        })

        for (let pinButton of this._node.querySelectorAll(".natsumi-miniplayer-pin-button")) {
            pinButton.addEventListener("click", () => {
                if (this.pinned) {
                    this.unpinMiniplayer();
                } else {
                    this.pinMiniplayer();
                }
            });
        }

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

        // Set up debugging
        this._node.natsumiMiniplayerController = this;

        // Set site data and media metadata
        this._node.querySelector(".natsumi-miniplayer-site-name").textContent = this.siteName || "Unknown site";
        this._node.querySelector(".natsumi-miniplayer-title-container").setAttribute("text", this.title || "Unknown");
        this._node.querySelector(".natsumi-miniplayer-author-container").setAttribute("text", this.artist || "Unknown artist");
        if (this.album) {
            this._node.querySelector(".natsumi-miniplayer-artist").setAttribute("text", `${this.artist || "Unknown artist"} • ${this.album}`);
        }

        // Set animation listeners
        this._node.querySelector(".natsumi-miniplayer-title-scrollable").addEventListener("animationend", () => {
            this._node.querySelector(".natsumi-miniplayer-title-scrollable").removeAttribute("animate-overflow");

            if (this.deferAnimationUpdate) {
                return;
            }

            this.titleAnimationScheduler = setTimeout(() => {
                this._node.querySelector(".natsumi-miniplayer-title-scrollable").setAttribute("animate-overflow", "");
            }, 4000);
        });
        this._node.querySelector(".natsumi-miniplayer-author-scrollable").addEventListener("animationend", () => {
            this._node.querySelector(".natsumi-miniplayer-author-scrollable").removeAttribute("animate-overflow");

            if (this.deferAnimationUpdate) {
                return;
            }

            this.authorAnimationScheduler = setTimeout(() => {
                this._node.querySelector(".natsumi-miniplayer-author-scrollable").setAttribute("animate-overflow", "");
            }, 4000);
        });
        Services.prefs.addObserver("natsumi.miniplayer.disable-text-scrolling", () => {
            this.refreshMetadataAnimations();
        })

        // Set key event listeners
        window.addEventListener("keydown", (event) => {
            this.onKeyDown(event);
        });
        window.addEventListener("keyup", (event) => {
            this.onKeyUp(event);
        });

        // Set up animations
        this.refreshMetadataAnimations();
        let metadataMutationObserver = new MutationObserver(() => {
            this.refreshMetadataAnimations();
        });
        metadataMutationObserver.observe(
            this._node.querySelector(".natsumi-miniplayer-title-container"),
            {attributes: true, attributeFilter: ["text"]}
        );
        metadataMutationObserver.observe(
            this._node.querySelector(".natsumi-miniplayer-author-container"),
            {attributes: true, attributeFilter: ["text"]}
        );

        // Pin miniplayer if required
        if (ucApi.Prefs.get("natsumi.miniplayer.pin-by-default").exists) {
            let shouldPin = ucApi.Prefs.get("natsumi.miniplayer.pin-by-default").value;
            if (shouldPin) {
                this.pinMiniplayer();
            }
        }

        this._initialized = true;
        miniplayerCounter.updateCount();
    }

    registerEventHandlers() {
        this._tab.linkedBrowser.browsingContext.mediaController.onpositionstatechange = (event) => {
            this.onPositionUpdate(event);
        };
        this._tab.linkedBrowser.browsingContext.mediaController.onplaybackstatechange = () => {
            this.onPlaybackUpdate();
        };
        this._tab.linkedBrowser.browsingContext.mediaController.onmetadatachange = () => {
            this.onMetadataUpdate();
        };
        this._tab.linkedBrowser.browsingContext.mediaController.onsupportedkeyschange = () => {
            this.onSupportedKeysUpdate();
        };
    }

    usesAlternateButtonSet() {
        const availableButtons = this._tab.linkedBrowser.browsingContext.mediaController.supportedKeys
        const trackSkipAvailable = availableButtons.includes("nexttrack") || availableButtons.includes("previoustrack");
        return this.alternateButtonSet || !trackSkipAvailable;
    }

    refreshMetadataAnimations() {
        // Get miniplayer width
        const availableWidth = this._node.querySelector(".natsumi-miniplayer-info-container").getBoundingClientRect().width - 4;
        let scrollingDisabled = false;

        if (availableWidth === 0) {
            // Assume hidden and defer update
            return;
        }

        if (ucApi.Prefs.get("natsumi.miniplayer.disable-text-scrolling").exists) {
            scrollingDisabled = ucApi.Prefs.get("natsumi.miniplayer.disable-text-scrolling").value;
        }

        // Get title and author
        const mediaTitle = this._node.querySelector(".natsumi-miniplayer-title-container").getAttribute("text");
        const mediaAuthor = this._node.querySelector(".natsumi-miniplayer-author-container").getAttribute("text");

        // Set content
        for (let titleNode of this._node.querySelectorAll(".natsumi-miniplayer-title")) {
            titleNode.textContent = mediaTitle;
        }
        for (let authorNode of this._node.querySelectorAll(".natsumi-miniplayer-artist")) {
            authorNode.textContent = mediaAuthor;
        }

        // Clear existing timeouts
        this._node.removeAttribute("natsumi-title-overflow");
        this._node.removeAttribute("natsumi-author-overflow");
        clearTimeout(this.titleAnimationScheduler);
        clearTimeout(this.authorAnimationScheduler);
        this.titleAnimationScheduler = null;
        this.authorAnimationScheduler = null;
        this.deferAnimationUpdate = true;
        this._node.querySelector(".natsumi-miniplayer-title-scrollable").removeAttribute("animate-overflow");
        this._node.querySelector(".natsumi-miniplayer-author-scrollable").removeAttribute("animate-overflow");
        this.deferAnimationUpdate = false;

        if (this.globalAnimationScheduler) {
            clearTimeout(this.globalAnimationScheduler);
            this.globalAnimationScheduler = null;
        }

        if (scrollingDisabled) {
            // Defer animation until scrolling is enabled
            this._node.setAttribute("animations-disabled", "");
            return;
        } else {
            if (this._node.hasAttribute("animations-disabled")) {
                this._node.removeAttribute("animations-disabled");
            }
        }

        // Get new width for each node
        const pixelsPerSecond = 40;
        const singleTitleWidth = this._node.querySelector(".natsumi-miniplayer-title").getBoundingClientRect().width;
        const singleAuthorWidth = this._node.querySelector(".natsumi-miniplayer-artist").getBoundingClientRect().width;

        let scheduleTitleOverflow = false;
        let scheduleAuthorOverflow = false;

        if (singleTitleWidth > availableWidth) {
            scheduleTitleOverflow = true;
            this._node.setAttribute("natsumi-title-overflow", "");
            this._node.querySelector(".natsumi-miniplayer-title-container").style.setProperty("--natsumi-animation-duration", `${(singleTitleWidth + 150) / pixelsPerSecond}s`);
            this._node.querySelector(".natsumi-miniplayer-title-container").style.setProperty("--natsumi-animation-width", `${singleTitleWidth + 150}px`);
        }
        if (singleAuthorWidth > availableWidth) {
            scheduleAuthorOverflow = true;
            this._node.setAttribute("natsumi-author-overflow", "");
            this._node.querySelector(".natsumi-miniplayer-author-container").style.setProperty("--natsumi-animation-duration", `${(singleAuthorWidth + 150) / pixelsPerSecond}s`);
            this._node.querySelector(".natsumi-miniplayer-author-container").style.setProperty("--natsumi-animation-width", `${singleAuthorWidth + 150}px`);
        }

        if (scheduleTitleOverflow || scheduleAuthorOverflow) {
            this.globalAnimationScheduler = setTimeout(() => {
                if (scheduleTitleOverflow) {
                    this._node.querySelector(".natsumi-miniplayer-title-scrollable").setAttribute("animate-overflow", "");
                }
                if (scheduleAuthorOverflow) {
                    this._node.querySelector(".natsumi-miniplayer-author-scrollable").setAttribute("animate-overflow", "");
                }
            }, 4000);
        }
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

    async getAverageColor(artworkUrl) {
        const sampleSize = 3;

        // Create offscreen canvas
        const temporaryCanvas = document.createElement("canvas");
        const canvasContext = temporaryCanvas.getContext("2d");

        // Create image element
        const temporaryImage = new Image();
        temporaryImage.src = artworkUrl;
        await temporaryImage.decode();

        // Draw image
        canvasContext.drawImage(temporaryImage, 0, 0, sampleSize, sampleSize);

        // Get pixel data
        let rArray = [];
        let gArray = [];
        let bArray = [];

        for (let x = 0; x < sampleSize; x++) {
            for (let y = 0; y < sampleSize; y++) {
                const pixelData = canvasContext.getImageData(x, y, 1, 1).data;

                if (!pixelData) {
                    // Could not get pixel data for some reason
                    temporaryCanvas.remove();
                    temporaryImage.remove();
                    return;
                }

                // Check that opacity is above 0
                if (pixelData[3] === 0) {
                    continue;
                }

                rArray.push(pixelData[0]);
                gArray.push(pixelData[1]);
                bArray.push(pixelData[2]);
            }
        }

        // Remove canvas and image elements
        temporaryCanvas.remove();
        temporaryImage.remove();

        // Calculate average color
        const averageColors = [
            Math.round(rArray.reduce((a, b) => a + b, 0) / rArray.length),
            Math.round(gArray.reduce((a, b) => a + b, 0) / gArray.length),
            Math.round(bArray.reduce((a, b) => a + b, 0) / bArray.length)
        ]

        // Return color data
        return {
            r: averageColors[0],
            g: averageColors[1],
            b: averageColors[2]
        };
    }

    // UI updates
    async updateUI(forceAnimationUpdate = false) {
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

        // Update site name
        this._node.querySelector(".natsumi-miniplayer-site-name").textContent = this.siteName || "Unknown site";

        // Update metadata if required
        let currentTitle = this._node.querySelector(".natsumi-miniplayer-title-container").getAttribute("text");
        let currentAuthor = this._node.querySelector(".natsumi-miniplayer-author-container").getAttribute("text");
        let newTitle = this.title || "Unknown";
        let newAuthor = this.artist || "Unknown artist"

        if (this.album) {
            newAuthor = `${this.artist || "Unknown artist"} • ${this.album}`;
        }

        if (currentTitle !== newTitle || forceAnimationUpdate) {
            this._node.querySelector(".natsumi-miniplayer-title-container").setAttribute("text", newTitle);
        }
        if (currentAuthor !== newAuthor || forceAnimationUpdate) {
            this._node.querySelector(".natsumi-miniplayer-author-container").setAttribute("text", newAuthor);
        }

        // Get available buttons
        let availableButtons = this._tab.linkedBrowser.browsingContext.mediaController.supportedKeys;
        let playPauseAvailable = availableButtons.includes("playpause");
        let nextTrackAvailable = availableButtons.includes("nexttrack");
        let prevTrackAvailable = availableButtons.includes("previoustrack");
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
    }

    getTimestamp(seconds) {
        // Get minutes
        let minutes = Math.floor(seconds / 60);
        seconds = Math.floor(seconds % 60);

        // Get hours from minutes
        let hours = Math.floor(minutes / 60);
        minutes = minutes % 60;

        // Get strings
        let secondsString = `${seconds}`;
        let minutesString = `${minutes}`;

        if (seconds < 10) {
            secondsString = `0${seconds}`;
        }
        if (minutes < 10) {
            minutesString = `0${minutes}`;
        }

        if (hours > 0) {
            return `${hours}:${minutesString}:${secondsString}`;
        } else {
            return `${minutesString}:${secondsString}`;
        }
    }

    updateScrubber() {
        let positionNode = this._node.querySelector(".natsumi-miniplayer-position");
        let scrubberNode = this._node.querySelector(".natsumi-miniplayer-scrubber");
        let durationNode = this._node.querySelector(".natsumi-miniplayer-duration");

        // Set timestamps
        positionNode.textContent = this.getTimestamp(this.position);
        durationNode.textContent = this.getTimestamp(this.duration);

        // Set scrubber position
        if (this.duration > 0) {
            scrubberNode.style.setProperty("--natsumi-scrubber-position", `${this.position / this.duration * 100}%`);
        } else {
            scrubberNode.style.setProperty("--natsumi-scrubber-position", "0%");
        }
    }

    handleScrubber(event, isScroll = false) {
        let newPosition;
        const scrubber = this._node.querySelector(".natsumi-miniplayer-scrubber");

        if (isScroll) {
            const scrollMultiplier = 1;
            let scrollAmount;

            if (Math.abs(event.deltaX) > Math.abs(event.deltaY)) {
                scrollAmount = event.deltaX * -1;
            } else {
                scrollAmount = event.deltaY * -1;
            }

            if (ucApi.Prefs.get("natsumi.browser.invert-scroll").exists) {
                if (ucApi.Prefs.get("natsumi.browser.invert-scroll").value) {
                    scrollAmount = scrollAmount * -1;
                }
            }

            newPosition = this.position + (scrollAmount * scrollMultiplier);
        } else {
            // Get width and relative position
            const scrubberWidth = scrubber.getBoundingClientRect().width;
            const scrubberPos = scrubber.getBoundingClientRect().x;
            const scrubberRelativePos = event.clientX - scrubberPos;

            if (scrubberWidth === 0) {
                return;
            }

            // Get new position
            newPosition = (scrubberRelativePos / scrubberWidth) * this.duration;
        }

        if (newPosition > this.duration) {
            newPosition = this.duration;
        } else if (newPosition < 0) {
            newPosition = 0;
        }

        this._tab.linkedBrowser.browsingContext.mediaController.seekTo(newPosition);
    }

    hideScrubber() {
        if (!this._node) {
            return;
        }

        let scrubberContainer = this._node.querySelector(".natsumi-miniplayer-scrubber-container");
        scrubberContainer.setAttribute("hidden", "");
    }

    showScrubber() {
        if (!this._node) {
            return;
        }

        let scrubberContainer = this._node.querySelector(".natsumi-miniplayer-scrubber-container");

        if (!scrubberContainer.hasAttribute("hidden")) {
            return;
        }

        scrubberContainer.removeAttribute("hidden");
    }

    // Scrubber
    scheduleScrubberUpdate(playbackRate = 1) {
        if (this.scrubberLoop) {
            this.resetScrubberUpdate();
        }

        if (playbackRate === 0) {
            // We're probably paused here
            return;
        }

        this.scrubberLoop = setInterval(() => {
            if (!this._node) {
                this.resetScrubberUpdate();
            }

            this.position++;
            this.updateScrubber();

            if (this.position >= this.duration) {
                this.resetScrubberUpdate();
            }
        }, 1000 / playbackRate);
    }

    resetScrubberUpdate() {
        if (this.scrubberLoop) {
            clearInterval(this.scrubberLoop);
            this.scrubberLoop = null;
        }
    }

    // Events
    onPositionUpdate(event) {
        if (isNaN(event.duration)) {
            this.hideScrubber();
            this.resetScrubberUpdate();
        } else {
            // Set scrubber data
            this.position = event.position;
            this.duration = event.duration;
            this.showScrubber();
            this.updateScrubber();
            this.scheduleScrubberUpdate(event.playbackRate);
        }

        // Update UI
        this.getTabData();
        this.updateUI();
    }

    onPlaybackUpdate() {
        this.getPlaybackState();
        this.getTabData();
        this.updateUI();
    }

    onMetadataUpdate() {
        this._mediaMetadata = this._tab.linkedBrowser.browsingContext.mediaController.getMetadata();
        this.getMediaMetadata();
        this.getPlaybackState();
        this.getTabData();
        this.updateUI();
    }

    onSupportedKeysUpdate() {
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
        this.shouldHide = true;

        if (this.pinned) {
            return;
        }

        if (this._node) {
            this._node.setAttribute("hidden", "true");
        }
        miniplayerCounter.updateCount();
    }

    showMiniplayer() {
        this.shouldHide = false;

        if (this._node && this._node.hasAttribute("hidden")) {
            this._node.removeAttribute("hidden");
            this.refreshMetadataAnimations();
        }
        miniplayerCounter.updateCount();
    }

    pinMiniplayer() {
        this.pinned = true;

        if (this._node) {
            this._node.setAttribute("pinned", "true");
        }
    }

    unpinMiniplayer() {
        this.pinned = false;

        if (this._node) {
            this._node.removeAttribute("pinned");
        }

        if (this.shouldHide) {
            this.hideMiniplayer();
        }
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

    if (tab.selected && !tab.natsumiMiniplayer.pinned) {
        tab.natsumiMiniplayer.hideMiniplayer();
    }
}

let miniplayerContainer = document.getElementById("natsumi-miniplayer-container");
let miniplayerCounter = null;
if (!miniplayerContainer) {
    let isVerticalTabs = ucApi.Prefs.get("sidebar.verticalTabs").value;
    let tabsContainer = document.getElementById("vertical-tabs");
    let navBarLastButton = document.getElementById("PanelUI-button");

    miniplayerContainer = document.createElement("div");
    miniplayerContainer.id = "natsumi-miniplayer-container";

    if (isVerticalTabs) {
        tabsContainer.appendChild(miniplayerContainer);
    } else {
        navBarLastButton.parentElement.insertBefore(miniplayerContainer, navBarLastButton);
    }

    miniplayerCounter = new NatsumiMiniplayerCounter(miniplayerContainer);
    miniplayerCounter.init();

    Services.prefs.addObserver("sidebar.verticalTabs", () => {
        if (ucApi.Prefs.get("sidebar.verticalTabs").value) {
            tabsContainer.insertBefore(miniplayerContainer, miniplayerCounter.node);

            // Refresh miniplayer text scroll
            for (let miniplayerNode of miniplayerContainer.querySelectorAll(".natsumi-miniplayer")) {
                if (!miniplayerNode.natsumiMiniplayerController) {
                    // This Miniplayer is broken
                    continue;
                }

                miniplayerNode.natsumiMiniplayerController.refreshMetadataAnimations();
            }
        } else {
            navBarLastButton.parentElement.insertBefore(miniplayerContainer, navBarLastButton);
        }
    });
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