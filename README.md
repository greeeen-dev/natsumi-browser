<h1 align="center">
  <img width="120" height="120" src="https://github.com/greeeen-dev/natsumi-browser/blob/main/images/icon.png?raw=true">
  <br>
  Natsumi Browser
</h1>

<p align="center">
  A skin for Zen Browser that makes things <strong><i>~flow~</i></strong>.
  <br><br>
  <a href="https://zen-browser.app"><img height="40" src="https://github.com/heyitszenithyt/zen-browser-badges/blob/fb14dcd72694b7176d141c774629df76af87514e/light/zen-badge-light.png"></a>
</p>

![](https://github.com/greeeen-dev/natsumi-browser/blob/main/images/main.png?raw=true)

## Meet Natsumi! 🦋
Natsumi Browser (or Natsumi, for short) is a skin made for [Zen Browser](https://zen-browser.app)
that adds lots of polish to the design by incorporating animations, blurs and more. It's pretty much
the skin I personally use, but made public because people wanted the CSS.

Natsumi is NOT a standalone browser. I don't even intend on making one.

Natsumi has been tested on `1.11b` (Beta) and `1.11t 2025-04-03` (Twilight).

> [!NOTE]
> Please remember that Natsumi in the end is **my personal browser skin**. If you don't like a design
> choice I've made, chances are I'll keep it if I still like it. So please be respectful and refrain
> from attacking people when you make suggestions. Thanks!

## Features
### Polished look
Natsumi Browser sports a modern look to bring you a beautiful and polished browsing experience, while
keeping much of Zen Browser's original design.

![](https://github.com/greeeen-dev/natsumi-browser/blob/main/images/home.png?raw=true)

### Natsumi URLbar
With Natsumi URLbar, Natsumi gives the expanded URLbar a completely fresh new look, so it feels very
cozy while also having lots of room for search suggestions. You can even make the URLbar stay out of
your way when collapsed with compact URLbar.

![](https://github.com/greeeen-dev/natsumi-browser/blob/main/images/urlbar.png?raw=true)

### Natsumi Findbar
Say hello to Natsumi Findbar! Natsumi Findbar shares a similar design as Natsumi URLbar, bringing you
the same cozy and modern experience. Inspired by [RobotoSkunk](https://github.com/RobotoSkunk)'s [Better
Find Bar](https://zen-browser.app/mods/a6335949-4465-4b71-926c-4a52d34bc9c0/) Mod.

![](https://github.com/greeeen-dev/natsumi-browser/blob/main/images/findbar.png?raw=true)

### Natsumi PDF Viewer
Send your PDF viewer to the 21st century! Natsumi Browser Pages includes tweaks for the default PDF
viewer, giving it the modern look it really deserves. And with compact view, you can focus on the file
at hand when you don't need the extra tools.

![](https://github.com/greeeen-dev/natsumi-browser/blob/main/images/pdfjs.png?raw=true)

### Enhanced sidebars
Elevate your sidebars to the next level! Not only does Natsumi add materials to both sidebars, it also
makes the Firefox sidebar more customizable by adding customization for its size and position.

![](https://github.com/greeeen-dev/natsumi-browser/blob/main/images/sidebars.png?raw=true)

### Marginless compact mode
Add even more screen real estate to compact mode by removing the website view's margins entirely. See
more of your website with even less distractions.

![](https://github.com/greeeen-dev/natsumi-browser/blob/main/images/compact.png?raw=true)

### Natsumi Picture-in-Picture (PiP)
Natsumi PiP gives the Picture-in-Picture window a fresh new look. Enjoy sleek animations, native icons,
and more.

![](https://github.com/greeeen-dev/natsumi-browser/blob/main/images/pip.png?raw=true)

### And much more!
There's much more than just those to discover!

## Installation
This skin is not available on the Zen Mods page, as this isn't intended to be a Mod. You will need to
install it by copying the files to your profile's chrome folder.

### Natsumi Browser
#### If you already have a userChrome.css file
1. Copy natsumi-config.css and natsumi folder to your chrome folder.
2. Add `@import "natsumi/natsumi.css";` to the beginning of your userChrome.css file.
3. Restart Zen Browser and enjoy!

#### If you don't have a userChrome.css file
1. Create a new chrome folder in your profile folder, if you haven't already.
   ([guide](https://docs.zen-browser.app/guides/live-editing))
2. Copy userChrome.css to the chrome folder.
3. Copy natsumi-config.css and natsumi folder to the chrome folder.
4. Restart Zen Browser and enjoy!

### Natsumi Browser Pages
#### If you already have a userContent.css file
1. Add `@import "natsumi-pages/natsumi-pages.css";` to the beginning of your userContent.css file.
2. Restart Zen Browser and enjoy!

#### If you don't have a userContent.css file
1. Create a new chrome folder in your profile folder, if you haven't already.
   ([guide](https://docs.zen-browser.app/guides/live-editing))
2. Copy userContent.css to the chrome folder.
3. Copy natsumi-config.css to the chrome folder, if you haven't already.
4. Copy natsumi-pages folder to the chrome folder.
5. Restart Zen Browser and enjoy!

## Browser configs (in about:config)
These are the configs you can use to tweak Natsumi Browser. If you want to tweak the animation duration
and delay, change the variables in the config.css file.

### Base theme
- `natsumi.theme.compact-marginless`: Removes margins from compact mode (unless in split view).
- `natsumi.theme.compact-marginless-hide-bookmarks`: Hides the bookmarks bar in marginless compact mode.
- `natsumi.theme.consistent-toolbar-button-size`: Makes toolbar buttons have a consistent size on Zen 1.7.5b.
- `natsumi.theme.disable-blur`: Disables blurring for materials. Use this if Zen Browser lags
  too much.
- `natsumi.theme.disable-glass-shadow`: Disables shadow for Glass material. Does not affect Mistcrylic and
  Haze.
- `natsumi.theme.disable-loading-animations`: Disables loading animation for tabs.
- `natsumi.theme.disable-urlbar-animation`: Disables URLbar loading animation for tabs.
- `natsumi.theme.enable-border-animation`: Enables border loading animation for tabs. This may use up
  quite some GPU.
- `natsumi.theme.force-blur`: Forces background blur support to be enabled regardless of whether a blurred
  element is shown or not.
- `natsumi.theme.force-glass-dark-shadows`: Forces dark shadows on Glass material.
- `natsumi.theme.opaque-icons`: Makes toolbar icon outlines opaque instead of semi-transparent.

### URLbar
- `natsumi.urlbar.disabled`: Disables Natsumi URLbar and reverts the URLbar style back.
- `natsumi.urlbar.disable-transparency`: Disables URLbar background transparency.
- `natsumi.urlbar.force-nowrap`: Prevents wrapping to make things more compact regardless of window
  width.
- `natsumi.urlbar.light`: Disables some animations to make Natsumi URLbar lighter.
- `natsumi.urlbar.no-compact`: Disables compact URLbar when not focused.

### Navbar
- `natsumi.navbar.glass-effect`: Adds Glass material for the navbar on compact mode.
- `natsumi.navbar.float`: Makes the navbar float. Glass material is required for this.

### Sidebar (Tabs)
- `natsumi.sidebar.container-tabs-border`: Adds a border to container tabs.
- `natsumi.sidebar.container-tabs-border-no-inactive`: Disables border for tabs that are not selected.
- `natsumi.sidebar.disable-bigger-tab-label`: Disables bigger tab labels and reverts them back to the
  normal font size.
- `natsumi.sidebar.tabs-glass-effect`: Adds Glass material for the sidebar on compact mode.
- `natsumi.sidebar.unlimited-pinned-tabs`: Removes the limit on the maximum number of tabs being shown
  in the pinned section of the vertical tabs.
- `natsumi.sidebar.rounded-corners`: Rounds the sidebar corners.

### Sidebar (Firefox)
- `natsumi.sidebar.ff-sidebar-blur`: Enables blur on Firefox sidebar when it is floating/unpinned.
- `natsumi.sidebar.ff-sidebar-float`: Makes the Firefox sidebar float on top of the website.
- `natsumi.sidebar.ff-sidebar-glass`: Adds Glass material to Firefox sidebar.
- `natsumi.sidebar.ff-sidebar-haze`: Adds Haze material to Firefox sidebar.
- `natsumi.sidebar.ff-sidebar-mistcrylic`: Adds Mistcrylic material to Firefox sidebar.
- `natsumi.sidebar.ff-sidebar.opaque`: Disables transparent background for Firefox sidebar.
- `natsumi.sidebar.ff-sidebar-position-center`: Vertically centers Firefox sidebar panel if it is
  floating.
- `natsumi.sidebar.ff-sidebar-position-bottom`: Moves Firefox sidebar panel to the bottom if it is
  floating. Overrides `natsumi.sidebar.ff-sidebar-position-center` if enabled.
- `natsumi.sidebar.ff-sidebar-resizable`: Makes the Firefox sidebar resizable.

### Findbar
- `natsumi.findbar.disabled`: Disables Natsumi Findbar and reverts the findbar style back.
- `natsumi.findbar.disable-not-found-bg`: Disables red background that appears when there are no
  results.
- `natsumi.findbar.wider-findbar`: Increases maximum Findbar width back to 720px.

### Miniplayer
- `natsumi.miniplayer.blur-fix`: Fixes blur on the miniplayer.
- `natsumi.miniplayer.disable-accent`: Disables the accent glow effect on the top left corner.

### Picture-in-Picture
- `natsumi.pip.disabled`: Disables Natsumi PiP and reverts the PiP style back.
- `natsumi.pip.native-border-radius`: Makes the PiP controls border radius look more native.
- `natsumi.pip.rounded`: Makes the PiP window round, like in macOS. Only supports Windows.

### Library
- `natsumi.library.disabled`: Disables Natsumi Library and reverts the library style back.

### Gamemode
- `natsumi.gamemode.enabled`: Enables Natsumi Gamemode.
- `natsumi.gamemode.gx-color`: Adds a red-pink accent color for aesthetics.

### PDF Viewer
- `natsumi.pdfjs.disabled`: Disables Natsumi PDF Viewer and reverts the PDF viewer back.
- `natsumi.pdfjs.compact`: Enables compact mode for Natsumi PDF Viewer.
- `natsumi.pdfjs.compact-dynamic`: Disables compact mode when the PDF Viewer's sidebar is expanded.

### Home
- `natsumi.home.disabled`: Disables Natsumi FF home and reverts the FF home page back.
- `natsumi.home.custom-background`: Uses the custom background set in config as the home screen
  background.

### Global tweaks
- `natsumi.global.highlight-accent-color`: Uses the accent color for highlighting.

### Experiments
- `natsumi.experiments.custom-font`: Sets a custom font set in natsumi-config.css.

### Floating toolbar
- `extras.floating-toolbar`: Adds a floating toolbar on the RHS top.

## FAQs
### "Can I use other userchromes with Natsumi?"
Sure! Just paste it right below the Natsumi Browser loader (userChrome.css) and you can use your own
userchrome alongside Natsumi Browser.

### "Can I disable individual features?"
You can disable some features using the configuration options.

If that doesn't help, you can remove certain modules (CSS files) from the natsumi.css file. However,
you will need to keep certain files (preload, postload, natsumi-config) for Natsumi to work properly.

> [!CAUTION]
> By modifying any part of Natsumi, you are responsible for any issues that may arise. If things do
> break, I will most likely not offer support for it.
> 
> If you installed Natsumi as part of another skin, your installation may be considered modified.
> Please check with the skin's developer for assistance in this case.

### "Is Natsumi compatible with the newest version of Zen Browser?"
Natsumi is always developed and tested on the newest Zen Twilight, so that it's always compatible with
the newest Zen Browser right on release day.

If you are unsure if Natsumi is compatible with your version, check the tested versions in the beginning
of the README.

### "When does Natsumi update?"
There is no fixed schedule for updates.

Usually, I time my releases to happen when Zen Browser updates, so that Natsumi is always compatible
with the newest version of Natsumi right on update day.

### "Is Natsumi compatible with other browsers (Firefox, Chrome, Arc, etc.)?"
No. Natsumi is made on top of Zen Browser, so it only supports Zen Browser.

If you try to apply Natsumi on other Firefox or other Firefox-based browsers, things will definitely
break. As for Chrome/Chromium-based browsers like Arc, you can't apply userchrome CSS files, making
Natsumi completely incompatible with those browsers.

I do have some plans to make a Firefox version called Natsumini, but I don't know if I'll go forward
with it.

### "I don't like the design, please change it!"
If I like the design, nah. My personal skin, my rules.

### "Can I use Natsumi with other Zen Mods?"
You can, but some mods (such as Better Find Bar and Super Url Bar) may conflict with Natsumi's CSS
rules. If this happens, please disable the conflicting mods or Natsumi features.

### "Why is userChrome.css so empty?"
Natsumi Browser uses a system where the userChrome.css file acts as a loader that loads the skin,
instead of being the file that contains all rules. This way, it's easier for users to quickly enable
and disable custom CSS.

## Troubleshooting
### "URLbar blur won't work!"
Make sure both `layout.css.backdrop-filter.enabled` and `layout.css.backdrop-filter.force-enabled` are
set to true. Also make sure that you're using WebRender and hardware rendering.

### "Zen Browser lags a lot!"
This may be due to the URLbar blurring or animations (likely the blur). Set `natsumi.theme.disable-blur`
to false to disable the blur, and `natsumi.urlbar.light` to true to disable the animations.

### "I don't see any of the Natsumi options in about:config!"
These are custom options which you need to create. Type in the exact name, then press the plus button on
the right to create the config.

### "Something's bugged!"
There may be Zen Mods or userchromes that you're using alongside Natsumi Browser that breaks things.
Please disable these then try again.

If the issue still persists, open an issue or report the bug to the developer through Discord.

## Acknowledgements
Thank you to:
- [asev](https://github.com/lunar-os) for ZenCss, which served as the base for Natsumi Browser's base
  CSS for v1
- [vicky5124](https://github.com/vicky5124) for the Tab Groups CSS used until v2.4.0
- [AlexCookieDev](https://github.com/AlexCookieDev) for inspiring some of the animations I use in Natsumi
- [mr-cheff](https://github.com/mr-cheff) and Zen's
  [contributors](https://github.com/zen-browser/desktop/graphs/contributors) for creating Zen Browser

## Disclaimer
THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT
LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO
EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER
IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR
THE USE OR OTHER DEALINGS IN THE SOFTWARE.

All screenshots displayed in this README are accurate as of March 16, 2025. If a feature was added,
changed or removed after this date, it may not be accurately reflected in the screenshots.
