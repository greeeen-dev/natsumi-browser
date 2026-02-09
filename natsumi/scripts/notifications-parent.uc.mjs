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

import { debugNotifications, overflowThreshold } from "./notifications.sys.mjs";

class NatsumiNotificationsParent {
    constructor() {
        // Check if notifications container exists
        this.notificationsContainer = null;
    }

    init(attachToExisting = false) {
        this.notificationsContainer = document.getElementById("natsumi-notifications-container");

        if (this.notificationsContainer && !attachToExisting) {
            throw new Error("cannot attach to an existing notifications node");
        }

        if (!this.notificationsContainer) {
            // Create notifications container if it doesn't exist
            this.notificationsContainer = document.createElement("div");
            this.notificationsContainer.id = "natsumi-notifications-container";
            document.body.appendChild(this.notificationsContainer);
        }

        this.notificationsMutationObserver = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                mutation.addedNodes.forEach((node) => {
                    if (node.nodeType === Node.ELEMENT_NODE && node.classList.contains("natsumi-notification")) {
                        this.handleNotification(node);
                    }
                });
            });
        });

        // Observe the notifications container for added nodes
        this.notificationsMutationObserver.observe(this.notificationsContainer, {
            childList: true
        });
    }

    handleNotification(notificationNode) {
        if (debugNotifications) {
            return;
        }

        let notificationTimeout = notificationNode.getAttribute("natsumi-notification-time");

        notificationNode.addEventListener("click", () => {
            this.removeNotification(notificationNode);
        })

        setTimeout(() => {
            this.removeNotification(notificationNode);
        }, parseInt(notificationTimeout, 10) || 5000);
    }

    removeNotification(notificationNode) {
        if (notificationNode) {
            try {
                if (notificationNode.hasAttribute("natsumi-notification-disappear")) {
                    // Removal is already being handled
                    return;
                }

                notificationNode.setAttribute("natsumi-notification-disappear", "");
            } catch (e) {
                console.warn("Failed to remove notification:", e);
                return;
            }

            // Wait for the notification to disappear
            setTimeout(() => {
                try {
                    notificationNode.remove();
                } catch (e) {
                    console.warn("Failed to remove notification after disappear:", e);
                }
            }, 300);

            // Check number of notifications left
            const notificationsContainer = document.getElementById("natsumi-notifications-container");
            if (notificationsContainer) {
                const allNotifications = notificationsContainer.querySelectorAll(".natsumi-notification");

                if (allNotifications.length <= overflowThreshold) {
                    notificationsContainer.style.removeProperty("--natsumi-notifications-overflow");
                } else {
                    notificationsContainer.style.setProperty("--natsumi-notifications-overflow", `"+${allNotifications.length - overflowThreshold}"`);
                }
            }
        }
    }
}

const notificationsContainer = document.getElementById("natsumi-notifications-container");
if (!notificationsContainer) {
    document.body.natsumiNotificationsParent = new NatsumiNotificationsParent();
    document.body.natsumiNotificationsParent.init();
}