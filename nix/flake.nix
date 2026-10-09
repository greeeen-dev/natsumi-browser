{
  description = "Natsumi: pick a browser, get fx-autoconfig + Natsumi installed automatically (NixOS + home-manager module)";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";

    # "flake = false" -> plain source trees. Bump with
    # `nix flake update fx-autoconfig natsumi` to grab the newest commit on
    # each repo's default branch -- as close to "auto-install latest" as
    # pure Nix gets, since a real build has to pin to a fixed rev to stay
    # reproducible.
    fx-autoconfig = {
      url = "github:MrOtherGuy/fx-autoconfig";
      flake = false;
    };
    # Pinned to a tagged release rather than tracking the default
    # branch, since the repo doesn't publish separate release assets --
    # a tag is the closest equivalent. To update: bump the tag here, then
    # `nix flake update natsumi`. Check https://github.com/greeeen-dev/natsumi-browser/tags
    # for what's available.
    natsumi = {
      url = "github:greeeen-dev/natsumi-browser/v6.12.4";
      flake = false;
    };
  };

  outputs = { self, nixpkgs, fx-autoconfig, natsumi }:
    let
      mkNatsumiModule = { isHomeManager }:
        { config, lib, pkgs, ... }:
        with lib;
        let
          cfg = config.programs.natsumi;

          homeDir = if isHomeManager then config.home.homeDirectory else cfg.homeDirectory;

          fxAutoconfigConfigJs = cfg.fxAutoconfigSource + "/program/config.js";

          # nixpkgs marks removed/renamed packages with `throw "..."` rather
          # than just omitting the attribute -- `a.b or c` only catches a
          # genuinely *missing* attribute, not one that exists but throws
          # when evaluated (confirmed: floorp-unwrapped and floorp are both
          # throw-aliases on current nixpkgs, not missing keys). tryEval
          # actually catches the throw, so this is the only safe way to do
          # a "prefer X, fall back to Y" package lookup here.
          tryPkg = attr: fallback:
            # tryEval reliably catches a throw (confirmed: floorp,
            # floorp-unwrapped), but a genuinely *missing* attribute
            # raises a different kind of error during attribute selection
            # that tryEval does NOT consistently catch. `?`
            # (has-attribute) never forces evaluation, so checking
            # existence first, then only selecting if present, handles
            # both cases correctly.
            if pkgs ? ${attr}
            then
              let t = builtins.tryEval pkgs.${attr}; in
              if t.success then t.value else fallback
            else fallback;


          # ---- per-browser presets -------------------------------------
          # Natsumi itself supports Firefox and "all popular forks except
          # Zen Browser" -- Zen is deliberately left out of this list.
          #
          # method = "wrapFirefox": the *real*, universal fix. nixpkgs'
          #   own wrapFirefox already has first-class support for dropping
          #   extra AutoConfig JS in via `extraPrefsFiles` -- it gets
          #   concatenated into the same generated mozilla.cfg the wrapper
          #   builds, so it loads with full chrome privileges the same way
          #   fx-autoconfig's config.js would if placed by hand. Used for
          #   anything nixpkgs builds from source (has a `*-unwrapped`
          #   package): Firefox and LibreWolf, confirmed. For LibreWolf
          #   specifically, its own `extraPrefsFiles` (its privacy
          #   hardening) is inherited and ours appended *after* -- same
          #   effect as an override file loading after mozilla.cfg, via
          #   the standard mechanism instead of a special case.
          #
          # method = "directPatch": fallback for browsers nixpkgs ships as
          #   a prebuilt binary with no `*-unwrapped`/wrapper split to hook
          #   into (Floorp, Waterfox, as packaged today). Clones the
          #   package with `cp -rs` (cheap -- symlinks, not real copies)
          #   and swaps in fx-autoconfig's program-side files directly,
          #   locating the app dir generically via the shallowest
          #   `omni.ja` in the tree (every Gecko app ships one next to its
          #   binary) so it isn't tied to any particular directory-naming
          #   convention.
          browserPresets = {
            firefox = {
              method = "wrapFirefox";
              unwrapped = pkgs.firefox-unwrapped;
              wrapper = pkgs.wrapFirefox;
              displayName = "Firefox";
              profilesDirectory = "${homeDir}/.mozilla/firefox";
            };
            librewolf = {
              method = "wrapFirefox";
              unwrapped = pkgs.librewolf-unwrapped;
              wrapper = pkgs.wrapFirefox;
              displayName = "LibreWolf";
              # NOT ~/.librewolf -- confirmed on Axiom: LibreWolf profiles
              # live under the XDG config path. (Native messaging host
              # manifests are a separate, unrelated discovery path --
              # that one IS ~/.librewolf/native-messaging-hosts/, handled
              # internally by wrapFirefox's own nativeMessagingHosts arg,
              # not this option.)
              profilesDirectory = "${homeDir}/.config/librewolf/librewolf";
            };
            floorp = {
              # floorp/floorp-unwrapped are both throw-aliases pointing at
              # floorp-bin/floorp-bin-unwrapped as of nixpkgs' floorp 12.x
              # switch to prebuilt-only (source builds no longer feasible
              # upstream) -- confirmed directly against nixos-unstable.
              # floorp-bin's own .override isn't a wrapFirefox-style
              # function either, so this always goes through directPatch.
              # Must clone the fully-wrapped floorp-bin, not
              # floorp-bin-unwrapped -- the unwrapped one's bin/ only has a
              # private .floorp-wrapped binary, no actual `floorp` launcher
              # script or .desktop entry (confirmed directly on Axiom).
              method = "directPatch";
              package = tryPkg "floorp" pkgs.floorp-bin;
              displayName = "Floorp";
              profilesDirectory = "${homeDir}/.floorp";
            };
          };

          hasPreset = cfg.browser != "";
          preset = if hasPreset then browserPresets.${cfg.browser} else null;
          presetMethod = if hasPreset then preset.method else cfg.method;

          # ---- method 1: wrapFirefox + extraPrefsFiles -------------------
          wrapFirefoxBuilt =
            let
              baseUnwrapped = cfg.unwrappedPackage;
              inheritedExtraPrefsFiles = baseUnwrapped.extraPrefsFiles or [ ];

              # Always present, not an option -- same pref as the
              # unconditional one in user.js (which covers Floorp, where
              # there's no extraPrefs-equivalent to hook into), set here
              # too at the program level for anything going through
              # wrapFirefox (Firefox, LibreWolf).
              updaterDisabledPref = ''
                defaultPref("natsumi.updater.disabled", true);
              '';

              # LibreWolf's fingerprinting protection normalizes away
              # CSSPrefersColorScheme by default, so sites can't reliably
              # detect dark/light preference -- this override excludes
              # just that one target, leaving the rest of fingerprinting
              # protection intact. Off by default; only applies when
              # actually on LibreWolf.
              darkModeFixPref =
                optionalString (cfg.browser == "librewolf" && cfg.librewolf.DarkModeFix) ''
                  defaultPref("privacy.resistFingerprinting", false);
                  defaultPref("privacy.fingerprintingProtection", true);
                  defaultPref("privacy.fingerprintingProtection.overrides", "+AllTargets,-CSSPrefersColorScheme");
                '';
            in
            cfg.wrapper baseUnwrapped (cfg.wrapperArgs // {
              extraPrefsFiles = inheritedExtraPrefsFiles ++ [ fxAutoconfigConfigJs ]
                ++ (cfg.wrapperArgs.extraPrefsFiles or [ ]);
              extraPrefs = (cfg.wrapperArgs.extraPrefs or "")
                + updaterDisabledPref + darkModeFixPref;
              # wrapFirefox has first-class support for this (confirmed
              # directly in nixpkgs' own programs.firefox module source:
              # it's passed straight through, same shape as
              # extraPrefsFiles) -- it handles wiring the manifests to
              # wherever the wrapped browser actually looks for them
              # internally, no manual /etc wiring needed on our end.
              nativeMessagingHosts = cfg.nativeMessagingHosts
                ++ (cfg.wrapperArgs.nativeMessagingHosts or [ ]);
            });

          # ---- method 2: direct patch of a prebuilt package --------------
          # cp -rs (symlink-clone) is cheap, but it's fundamentally wrong
          # for this: Gecko's AutoConfig loader requires config.js to sit
          # physically next to the *real running binary* -- deliberately,
          # since config.js runs with full chrome/Components privileges
          # and Mozilla restricts where it can load from to prevent
          # exactly this kind of redirection. cp -s doesn't preserve a
          # symlink's own (often relative) target -- it makes a *new*
          # absolute symlink pointing straight back at the source file --
          # so every file cp -rs touches, all the way down to the actual
          # ELF binary, still physically lives inside the *original*
          # untouched package. Confirmed directly on Axiom: the browser
          # launched and ran entirely out of the unpatched original,
          # config.js sitting unused in our derivation's copy of the tree.
          # Fix: make the app dir (and bin/ launcher scripts, which
          # commonly hardcode an absolute exec path back to the original)
          # real, not symlinked, so the binary that actually launches is
          # the one living inside this derivation.
          directPatched = pkgs.runCommand "${cfg.unwrappedPackage.pname or "browser"}-fx-autoconfig"
            {
              preferLocalBuild = true;
            } ''
            mkdir -p "$out"
            cp -rs --no-preserve=mode,ownership ${cfg.unwrappedPackage}/. "$out/"
            chmod -R u+w "$out"

            appdir=$(find "$out" -mindepth 1 -name omni.ja -printf '%d %h\n' \
              | sort -n | head -n1 | cut -d' ' -f2-)
            if [ -z "$appdir" ]; then
              echo "natsumi: couldn't locate the app dir (no omni.ja found under $out)" >&2
              exit 1
            fi

            relpath="''${appdir#$out/}"
            rm -rf "$appdir"
            # --preserve=mode is deliberate here (unlike the --no-preserve
            # cp -rs clone above): confirmed on Axiom that discarding mode
            # (the earlier version of this fix used --no-preserve=mode)
            # silently strips the executable bit from the real Gecko
            # binary and every .so alongside it, since chmod -R u+w only
            # ever adds write, never execute -- the browser failed to
            # launch at all as a result.
            cp -r --preserve=mode --no-preserve=ownership "${cfg.unwrappedPackage}/$relpath" "$appdir"
            chmod -R u+w "$appdir"

            # fx-autoconfig has no mozilla.cfg -- just config.js next to
            # the binary, plus defaults/pref/config-prefs.js pointing
            # general.config.filename straight at it (confirmed against
            # the actual repo contents, not assumed).
            rm -f "$appdir/config.js"
            install -m644 ${cfg.fxAutoconfigSource}/program/config.js "$appdir/config.js"

            mkdir -p "$appdir/defaults/pref"
            # Some browsers ship their own defaults/pref/*.js already
            # setting general.config.filename to something else (confirmed
            # on Axiom: Floorp's own autoconfig.js points it at
            # "mozilla.cfg", a file that doesn't exist here) -- directory
            # read order isn't guaranteed alphabetical at the filesystem
            # level, so rather than gambling that ours loads last and
            # wins, remove any existing file setting this pref first, so
            # there's only ever one source of truth.
            for f in "$appdir"/defaults/pref/*.js; do
              [ -f "$f" ] || continue
              grep -q 'general\.config\.filename' "$f" 2>/dev/null && rm -f "$f"
            done
            rm -f "$appdir/defaults/pref/config-prefs.js"
            install -m644 ${cfg.fxAutoconfigSource}/program/defaults/pref/config-prefs.js \
              "$appdir/defaults/pref/config-prefs.js"

            # bin/ launcher scripts: recreate each one from the ORIGINAL
            # source's own raw link target (not cp -rs's corrupted
            # absolute-back-reference version) for symlinks -- so a
            # relative target like ../lib/foo-1.2.3/foo correctly resolves
            # against the real copy above -- and for regular wrapper
            # scripts, copy the real text and rewrite any hardcoded
            # absolute reference to the original package so the exec line
            # points at $out instead.
            if [ -d "$out/bin" ]; then
              # dotglob: plain */bin/* silently skips dotfiles like
              # .floorp-wrapped -- confirmed on Axiom, it never got
              # recreated at all under the plain glob and was left
              # pointing at the original package.
              shopt -s dotglob
              for f in "$out"/bin/*; do
                [ -e "$f" ] || [ -L "$f" ] || continue
                name=$(basename "$f")
                srcf="${cfg.unwrappedPackage}/bin/$name"
                rm -f "$f"
                if [ -L "$srcf" ]; then
                  ln -s "$(readlink "$srcf")" "$f"
                else
                  cp --preserve=mode --no-preserve=ownership "$srcf" "$f"
                  chmod u+w "$f"
                  sed -i "s|${cfg.unwrappedPackage}|$out|g" "$f" 2>/dev/null || true
                fi
              done
              shopt -u dotglob
            fi
          '';

          builtPackage =
            if presetMethod == "wrapFirefox" then wrapFirefoxBuilt else directPatched;

          # ---- rename the desktop entry so it's distinguishable from a
          # ---- separately-installed stock copy of the same browser -----
          renamedPackage =
            if cfg.desktopNameSuffix == "" then builtPackage
            else builtPackage.overrideAttrs (old: {
              postFixup = (old.postFixup or "") + ''
                for f in "$out"/share/applications/*.desktop; do
                  [ -f "$f" ] || continue
                  sed -i "s/^Name=.*/&${cfg.desktopNameSuffix}/" "$f" 2>/dev/null || true
                done
              '';
            });

          resolvedPackage = renamedPackage;

          # Guess at the launcher binary name, used to force-create a
          # profile when one doesn't exist yet (see installProfileScript
          # below). NOT resolvedPackage.meta -- confirmed directly (via
          # nix eval, no build) that a plain pkgs.runCommand output (what
          # directPatch produces) has no meta.mainProgram and no .pname at
          # all, which would silently fall through to the "firefox"
          # default for every directPatch browser (Floorp, Waterfox) and
          # break -CreateProfile outright. The pre-patch source package
          # (cfg.unwrappedPackage) has correct metadata for directPatch
          # (confirmed: pkgs.floorp-bin.meta.mainProgram = "floorp", while
          # its own .pname is "floorp-bin" -- wrong -- so mainProgram has
          # to come first). For wrapFirefox, the wrapped resolvedPackage
          # itself carries correct meta (confirmed against pkgs.firefox
          # and pkgs.librewolf, both built the same way).
          binaryName =
            if presetMethod == "wrapFirefox"
            then (resolvedPackage.meta.mainProgram or resolvedPackage.pname or "firefox")
            else (cfg.unwrappedPackage.meta.mainProgram or cfg.unwrappedPackage.pname or "firefox");

          # ---- profile-side install, identical for every browser --------
          # Uses rsync so re-running on a newer flake.lock (new natsumi/
          # fx-autoconfig commit) actually syncs -- updates changed files
          # *and* removes ones the new commit dropped -- rather than just
          # overlaying on top and leaving orphaned files behind.
          # Standalone, not an inline heredoc inside installProfileScript's
          # bash string -- an inline heredoc starting at column 0 (which
          # Python needs for its own indentation) drags down Nix's
          # ''-string dedent calculation for the *whole* surrounding bash
          # script (it strips the minimum common indentation across every
          # line in the string), which silently broke the
          # chrome.manifest heredoc's closing EOF marker further down --
          # confirmed on Axiom: bash reported "here-document ... delimited
          # by end-of-file", having swallowed everything after
          # chrome.manifest (including the final fix_ownership) as
          # heredoc body. Keeping this in its own file sidesteps the
          # interaction entirely.
          setDefaultProfilePy = pkgs.writeText "set-default-profile.py" ''
            import re, sys
            path, target = sys.argv[1], sys.argv[2]
            with open(path) as f:
                content = f.read()
            blocks = re.split(r"(?m)^(?=\[)", content)
            out = []
            for block in blocks:
                if not block.strip():
                    out.append(block)
                    continue
                lines = block.splitlines()
                header, body = lines[0], lines[1:]
                body = [l for l in body if not l.startswith("Default=")]
                sec_path = next((l[len("Path="):] for l in body if l.startswith("Path=")), None)
                if header.startswith("[Profile") and sec_path == target:
                    body.append("Default=1")
                out.append("\n".join([header] + body) + "\n")
            with open(path, "w") as f:
                f.write("".join(out))
          '';

          installProfileScript = pkgs.writeShellScript "install-natsumi-profile" ''
            set -eu
            profiles_ini="$1"
            profiles_root="$2"
            browser_bin="$3"
            requested="${cfg.profile}"
            rsync="${pkgs.rsync}/bin/rsync"
            # -CreateProfile still needs a DISPLAY even though it's not
            # supposed to open a window -- confirmed directly on Axiom:
            # running it with no display gives a flat "Error: no DISPLAY
            # environment variable specified" and exits 1, which activation
            # (with no desktop session attached at all) will always hit.
            # xvfb-run gives it a throwaway virtual one just for this call.
            xvfb_run="${pkgs.xvfb-run}/bin/xvfb-run"
            runuser="${pkgs.util-linux}/bin/runuser"
            # Many Firefox-family browsers flatly refuse to start as root
            # regardless of display availability -- confirmed on Axiom:
            # the exact same -CreateProfile call under xvfb-run succeeded
            # when run manually as a normal user, then failed under the
            # real system.activationScripts run (which is root). So when
            # this script is running as root, the browser itself has to
            # be dropped down to the real target user first; everything
            # else in this script (fix_ownership, mkdir, chmod) still
            # needs root and stays as-is.
            run_as_target_user() {
              if [ "$(id -u)" = "0" ]; then
                target_user="$(stat -c '%U' "${homeDir}" 2>/dev/null || true)"
                if [ -n "$target_user" ] && [ "$target_user" != "root" ]; then
                  "$runuser" -u "$target_user" -- "$@"
                  return $?
                fi
              fi
              "$@"
            }

            mkdir -p "$profiles_root"

            # If this tree (or anything -CreateProfile writes into it
            # below) ends up owned by someone else -- root, since
            # system.activationScripts runs the whole script including
            # $browser_bin as root, or a leftover from however it was
            # originally created (confirmed on Axiom: an existing profile
            # had ended up owned by nobody:nogroup, silently killing every
            # write) -- fix it automatically when possible. Only root can
            # chown away from another owner; a plain user-level
            # home-manager activation is already running as the right
            # user and doesn't need this.
            fix_ownership() {
              if [ "$(id -u)" = "0" ]; then
                target_owner="$(stat -c '%u:%g' "${homeDir}" 2>/dev/null || true)"
                [ -n "$target_owner" ] && chown -R "$target_owner" "$profiles_root" 2>/dev/null || true
              fi
            }

            fix_ownership

            if [ -e "$profiles_root" ] && [ ! -w "$profiles_root" ]; then
              echo "natsumi: $profiles_root is not writable by $(id -un) (owned by $(stat -c '%U:%G' "$profiles_root" 2>/dev/null)). Fix with: sudo chown -R $(id -un): $profiles_root -- then rebuild." >&2
              exit 1
            fi

            profile_registered() {
              # A directory existing on disk is NOT the same as the
              # browser actually knowing about it -- confirmed on Axiom: a
              # pre-existing profile dir with no profiles.ini entry got
              # silently skipped here (treated as "already there"), so
              # -CreateProfile never ran, the profile never got
              # registered, and the browser created an entirely separate
              # profile of its own on first launch instead. profiles.ini
              # is the only thing that actually matters.
              [ -f "$profiles_ini" ] && grep -q "^Path=$1\$" "$profiles_ini" 2>/dev/null
            }

            # Rewrites profiles.ini so exactly one [ProfileN] section --
            # the one whose Path matches $1 -- has Default=1, clearing it
            # from every other section. Only called right after creating
            # a brand new profile; an already-existing target is left as
            # whatever default state it already had.
            set_as_default() {
              [ -f "$profiles_ini" ] || return 0
              "${pkgs.python3}/bin/python3" "${setDefaultProfilePy}" "$profiles_ini" "$1"
            }

            # "default" means a fixed, always-the-same name --
            # natsumi.default-default -- not "whatever profiles.ini
            # currently marks Default=1" (that auto-resolve was the
            # earlier design; dropped because it let a browser's own
            # auto-created profile silently win over this module's, which
            # is exactly what happened on Axiom). An explicit name is used
            # as-is either way.
            #
            # A Firefox-family profile can only really be born from the
            # browser itself (or its -CreateProfile flag) -- profiles.ini
            # plus the internal salt/naming bookkeeping isn't something
            # safe to hand-fabricate. -CreateProfile writes the profile +
            # registers it in profiles.ini and exits without opening a
            # real window (just needs a virtual display to get that far,
            # see xvfb_run above).
            if [ "$requested" = "default" ]; then
              rel="natsumi.default-default"
            else
              rel="$requested"
            fi

            if ! profile_registered "$rel"; then
              run_as_target_user "$xvfb_run" -a "$browser_bin" -CreateProfile "$rel $profiles_root/$rel" -no-remote || true
              fix_ownership
              set_as_default "$rel"
            fi

            if [ ! -d "$profiles_root/$rel" ]; then
              echo "natsumi: could not create profile '$rel' (tried $browser_bin -CreateProfile under xvfb-run)" >&2
              exit 1
            fi

            profile_dir="$profiles_root/$rel"
            chrome_dir="$profile_dir/chrome"
            mkdir -p "$chrome_dir/utils" "$chrome_dir/natsumi"
            chmod -R u+w "$chrome_dir"

            # fx-autoconfig profile-side loader (includes module_loader.mjs,
            # which the upstream install guide forgets to mention but is
            # required for Natsumi's modules to actually load), plus its
            # own CSS/ and resources/ scaffold folders -- Natsumi's chrome.
            # manifest loads through these, not through files of its own.
            # Synced, not overlaid: a file removed upstream gets removed
            # here too.
            "$rsync" -a --delete ${cfg.fxAutoconfigSource}/profile/chrome/utils/. "$chrome_dir/utils/"
            "$rsync" -a --delete ${cfg.fxAutoconfigSource}/profile/chrome/CSS/. "$chrome_dir/CSS/"
            "$rsync" -a --delete ${cfg.fxAutoconfigSource}/profile/chrome/resources/. "$chrome_dir/resources/"

            # Natsumi itself goes into chrome/natsumi/ (its own subfolder,
            # not flattened into chrome/ root) -- synced at exactly the
            # commit this flake is pinned to.
            # The whole natsumi repo goes into chrome/ ROOT, not a
            # chrome/natsumi/ subfolder -- the repo itself already
            # contains a nested "natsumi/" folder alongside its loose
            # top-level files (natsumi-config.css, userChrome.css,
            # userContent.css), which is exactly what chrome.manifest's
            # "../natsumi/" references expect. Putting the whole repo a
            # level deeper (chrome/natsumi/natsumi/...) was wrong. Excludes
            # keep this rsync's --delete from wiping the fx-autoconfig
            # folders just synced above (natsumi's repo doesn't ship
            # utils/CSS/resources itself, so without these, --delete would
            # see them as "not in source" and remove them).
            "$rsync" -a --delete \
              --exclude '/utils/' --exclude '/CSS/' --exclude '/resources/' \
              --exclude '/chrome.manifest' --exclude '/.natsumi-commit' \
              ${cfg.natsumiSource}/. "$chrome_dir/"
            chmod -R u+w "$chrome_dir"

            # Marker: fingerprint of the currently-synced natsumi source
            # (its Nix store path, which changes whenever flake.lock points
            # at a different commit), so it's obvious at a glance whether a
            # rebuild actually picked up a newer pin.
            echo "${builtins.baseNameOf (toString natsumi)}" > "$chrome_dir/.natsumi-commit"

            cat > "$chrome_dir/utils/chrome.manifest" <<'EOF'
            content userchromejs ./
            content userscripts ../natsumi/scripts/
            skin userstyles classic/1.0 ../CSS/
            content userchrome ../resources/
            content natsumi ../natsumi/
            content natsumi-icons ../natsumi/icons/
            EOF

            # userChrome.css/userContent.css are ignored by default on
            # every Firefox-family browser (not just LibreWolf) until this
            # is flipped on -- do it once per profile, don't duplicate it
            # on repeat activation.
            user_js="$profile_dir/user.js"
            touch "$user_js"
            if ! grep -q 'toolkit.legacyUserProfileCustomizations.stylesheets' "$user_js" 2>/dev/null; then
              echo 'user_pref("toolkit.legacyUserProfileCustomizations.stylesheets", true);' >> "$user_js"
            fi
            if ! grep -q 'natsumi.updater.disabled' "$user_js" 2>/dev/null; then
              echo 'user_pref("natsumi.updater.disabled", true);' >> "$user_js"
            fi

            rm -rf "$profile_dir/startupCache" 2>/dev/null || true

            # Everything above this point (rsync, chmod, chrome.manifest,
            # user.js) ran as whoever invoked this script -- root, under
            # the real system.activationScripts run -- so it all just got
            # re-owned by root regardless of the run_as_target_user fix
            # for -CreateProfile earlier. One last pass fixes the whole
            # tree back to the real user so the browser (which runs as
            # that user in normal desktop use, never as root) can actually
            # read/write its own profile.
            fix_ownership
          '';
        in
        {
          options.programs.natsumi = {
            enable = mkEnableOption "fx-autoconfig + Natsumi theme for a Firefox-based browser";

            librewolf = {
              DarkModeFix = mkOption {
                type = types.bool;
                default = false;
                description = ''
                  LibreWolf's fingerprinting protection normalizes away
                  CSSPrefersColorScheme by default, so websites can't
                  reliably detect your dark/light mode preference. Setting
                  this to true excludes just that one target from
                  fingerprinting protection, leaving everything else
                  intact. Only has an effect when `browser = "librewolf"`.
                  Off by default.
                '';
              };
            };

            nativeMessagingHosts = mkOption {
              type = types.listOf types.package;
              default = [ ];
              example = literalExpression "[ pkgs.firefoxpwa ]";
              description = ''
                Packages providing native messaging hosts (e.g.
                `pkgs.firefoxpwa`) to make available to extensions. Only
                takes effect for `method = "wrapFirefox"` browsers
                (Firefox, LibreWolf) -- passed straight through to
                `wrapper`'s own `nativeMessagingHosts` argument, same as
                `programs.firefox.nativeMessagingHosts.packages` would.
                Not yet supported for `directPatch` browsers (Floorp).
              '';
            };

            browser = mkOption {
              type = types.enum ([ "" ] ++ builtins.attrNames browserPresets);
              default = "";
              example = "floorp";
              description = ''
                Pick a Natsumi-supported browser and everything else (nixpkgs
                package, install method, profiles directory) is filled in
                automatically. Supported: ${concatStringsSep ", " (builtins.attrNames browserPresets)}.
                Zen Browser is intentionally not listed -- Natsumi doesn't
                support it upstream. Leave as `""` for manual mode.
              '';
            };

            profile = mkOption {
              type = types.str;
              default = "default";
              description = ''
                Which profile to install into. `"default"` targets a fixed,
                always-the-same profile named `natsumi.default-default`
                (creating it if it doesn't exist yet); any other value
                targets exactly that profile name (creating it too, if
                needed). Either way, whichever profile ends up targeted
                gets forced to be the browser's actual default.
              '';
            };

            homeDirectory = mkOption {
              type = types.str;
              default = "/root";
              description = ''
                NixOS-module mode only: which user's $HOME to install into
                (profiles live under $HOME, not anywhere the NixOS module
                can infer on its own). Ignored by the home-manager module,
                which always uses the current user's home.homeDirectory.
              '';
            };

            profilesDirectory = mkOption {
              type = types.str;
              default = "${homeDir}/.mozilla/firefox";
              description = "Path to the profiles root (contains profiles.ini). Auto-set when `browser` is used.";
            };

            fxAutoconfigSource = mkOption {
              type = types.path;
              default = fx-autoconfig;
              description = "Source tree for fx-autoconfig (defaults to this flake's pinned input).";
            };

            natsumiSource = mkOption {
              type = types.path;
              default = natsumi;
              description = "Source tree for Natsumi Browser (defaults to this flake's pinned input).";
            };

            desktopNameSuffix = mkOption {
              type = types.str;
              default = " (Natsumi)";
              description = ''
                Appended to the .desktop entry's `Name=` line so this build
                is distinguishable in an app launcher from a separately
                installed stock copy of the same browser -- e.g. "Firefox"
                becomes "Firefox (Natsumi)". There's no reliable way for a
                pure Nix build to detect whether a stock copy already
                happens to be installed elsewhere on the system, so this
                defaults to on; set to `""` to keep the plain name.
              '';
            };

            method = mkOption {
              type = types.enum [ "wrapFirefox" "directPatch" ];
              default = "wrapFirefox";
              description = ''
                Manual mode only (`browser = ""`): "wrapFirefox" uses
                nixpkgs' `wrapFirefox`'s `extraPrefsFiles` (works for any
                browser built with an `*-unwrapped`/wrapper split).
                "directPatch" clones and patches the package directly
                (works even for a prebuilt binary package).
              '';
            };

            unwrappedPackage = mkOption {
              type = types.package;
              default = pkgs.firefox-unwrapped;
              example = literalExpression "pkgs.librewolf-unwrapped";
              description = ''
                Manual mode only: the browser derivation to install into --
                unwrapped if `method = "wrapFirefox"`, or the package to
                clone-and-patch directly if `method = "directPatch"`.
              '';
            };

            wrapper = mkOption {
              type = types.functionTo (types.functionTo types.package);
              default = pkgs.wrapFirefox;
              defaultText = literalExpression "pkgs.wrapFirefox";
              description = "Manual mode only, `method = \"wrapFirefox\"`: the wrap function, called as `wrapper unwrappedPkg wrapperArgs`.";
            };

            wrapperArgs = mkOption {
              type = types.attrs;
              default = { };
              description = "Manual mode only: extra attrset passed to `wrapper` (e.g. `extraPolicies`, more `extraPrefsFiles`).";
            };

            package = mkOption {
              type = types.package;
              default = resolvedPackage;
              readOnly = true;
              description = "The resulting browser package, ready to run with fx-autoconfig + Natsumi installed.";
            };
          };

          config = mkIf cfg.enable (mkMerge [
            (mkIf hasPreset {
              programs.natsumi.profilesDirectory = mkDefault preset.profilesDirectory;
              programs.natsumi.method = mkDefault preset.method;
              programs.natsumi.unwrappedPackage = mkDefault (
                if preset.method == "wrapFirefox" then preset.unwrapped else preset.package
              );
              programs.natsumi.wrapper = mkIf (preset.method == "wrapFirefox") (mkDefault preset.wrapper);
            })

            (if isHomeManager
              then { home.packages = [ cfg.package ]; }
              else { environment.systemPackages = [ cfg.package ]; })

            (let
              script = ''
                ${installProfileScript} \
                  "${cfg.profilesDirectory}/profiles.ini" "${cfg.profilesDirectory}" \
                  "${cfg.package}/bin/${binaryName}"
              '';
            in
              if isHomeManager
              then {
                home.activation.installNatsumiProfile =
                  config.lib.dag.entryAfter [ "writeBoundary" ] ''
                    $DRY_RUN_CMD ${script}
                  '';
              }
              else {
                system.activationScripts.installNatsumiProfile = {
                  text = script;
                };
              })
          ]);
        };
    in
    {
      nixosModules.default = mkNatsumiModule { isHomeManager = false; };
      homeManagerModules.default = mkNatsumiModule { isHomeManager = true; };
    };
}
