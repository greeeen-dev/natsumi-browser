// ==UserScript==
// @include      main
// @ignorecache
// ==/UserScript==

const cssFix = `
  @media (-moz-platform: linux) {
    * {
      --natsumi-browser-border-radius: calc(env(-moz-gtk-csd-titlebar-radius, 5px) - 2px) !important;
    }
    
    :root[windowtype="navigator:browser"]:not([gtktiledwindow="true"]):not([sizemode="maximized"]) body {
      &::after,
      &::before {
        border-radius: env(-moz-gtk-csd-titlebar-radius, 5px) !important;
        
        @media not -moz-pref("widget.gtk.rounded-bottom-corners.enabled") {
          border-bottom-left-radius: 0 !important;
          border-bottom-right-radius: 0 !important;
        }
      }
    }
  }
`;

const radiusFix = document.createElement("style");
radiusFix.id = "natsumi-radius-fix";
radiusFix.textContent = cssFix;
document.head.appendChild(radiusFix);
