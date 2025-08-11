/*

Natsumi Browser - A userchrome for Zen Browser that makes things flow.

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

// Set this to true to disable hiding notifications.
// HIGHLY NOT RECOMMENDED for production environments.
const debugNotifications = false;
const overflowThreshold = 4;

export class NatsumiNotificationsParent {
    constructor(attachToExisting = false) {
        // Check if notifications container exists
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
            childList: true,
            subtree: true
        });
    }

    handleNotification(notificationNode) {
        if (debugNotifications) {
            return;
        }

        let notificationTimeout = notificationNode.getAttribute("natsumi-notification-time");

        setTimeout(() => {
            this.removeNotification(notificationNode);
        }, parseInt(notificationTimeout, 10) || 5000);
    }

    removeNotification(notificationNode) {
        if (notificationNode) {
            try {
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

export class NatsumiNotification {
    constructor(body, subtext = null, icon = null, time = 5000) {
        this.body = body;
        this.subtext = subtext;
        this.icon = icon;
        this.document = null;

        ucApi.Windows.forEach((browserDocument, browserWindow) => {
            if (browserDocument.hasFocus()) {
                this.document = browserDocument;
            }
        });

        // Create notification element
        this.notificationElement = this.document.createElement("div");
        this.notificationElement.classList.add("natsumi-notification");
        this.notificationElement.setAttribute("natsumi-notification-time", time.toString());

        // Add icon if provided
        if (this.icon) {
            this.notificationElement.setAttribute("has-icon", "");
            this.notificationElement.style.setProperty("--natsumi-notification-icon", `url("${this.icon}")`);
        }

        // Add body
        let bodyElement = this.document.createElement("div");
        bodyElement.classList.add("natsumi-notification-body");
        bodyElement.textContent = this.body;

        // Add subtext if provided
        if (this.subtext) {
            let subtextElement = this.document.createElement("div");
            subtextElement.classList.add("natsumi-notification-subtext");
            subtextElement.textContent = this.subtext;
            bodyElement.appendChild(subtextElement);
        }

        // Append body to notification element
        this.notificationElement.appendChild(bodyElement);
    }

    addToContainer() {
        // Append the notification element to the notifications container
        let notificationsContainer = this.document.getElementById("natsumi-notifications-container");

        if (notificationsContainer) {
            let firstNotification = notificationsContainer.querySelector(".natsumi-notification");
            if (firstNotification) {
                // Insert the new notification before the first one
                notificationsContainer.insertBefore(this.notificationElement, firstNotification);
            } else {
                // If no notifications exist, append it
                notificationsContainer.appendChild(this.notificationElement);
            }

            const allNotifications = notificationsContainer.querySelectorAll(".natsumi-notification");
            if (allNotifications.length > overflowThreshold) {
                notificationsContainer.style.setProperty("--natsumi-notifications-overflow", `"+${allNotifications.length - overflowThreshold}"`);
            }

            setTimeout(() => {
                this.notificationElement.setAttribute("natsumi-notification-animated", "");
            }, 300);
        }
    }
}
