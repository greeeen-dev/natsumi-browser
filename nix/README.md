# programs.natsumi — Nix module for Natsumi Browser + fx-autoconfig

Pick a browser, and `programs.natsumi` installs
[fx-autoconfig](https://github.com/MrOtherGuy/fx-autoconfig) and
[Natsumi Browser](https://github.com/greeeen-dev/natsumi-browser) into it
automatically — including Natsumi Append (the fx-autoconfig-powered JS
features, not just the CSS theme). Works as both a home-manager module
and a NixOS module.

## 1. Add it as a flake input

```nix
{
  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    home-manager.url = "github:nix-community/home-manager";

    natsumi = {
      url = "github:greeeen-dev/natsumi-browser?dir=nix";
      inputs.nixpkgs.follows = "nixpkgs";
    };
  };

  outputs = { self, nixpkgs, home-manager, natsumi, ... }: {
    # see below
  };
}
```

(`?dir=nix` because the flake lives in this repo's `nix/` subfolder,
alongside the browser's own source, rather than at the repo root.)

## 2a. Using it with home-manager (recommended for a per-user browser)

```nix
homeConfigurations."you" = home-manager.lib.homeManagerConfiguration {
  pkgs = nixpkgs.legacyPackages.x86_64-linux;
  modules = [
    natsumi.homeManagerModules.default
    {
      programs.natsumi = {
        enable = true;
        browser = "firefox"; # or "librewolf" | "floorp"
      };
    }
  ];
};
```

Or, inside an existing NixOS config that already uses home-manager as a
module:

```nix
home-manager.users.you = {
  imports = [ natsumi.homeManagerModules.default ];
  programs.natsumi = {
    enable = true;
    browser = "librewolf";
  };
};
```

## 2b. Using it as a NixOS module (system-wide)

```nix
{
  imports = [ natsumi.nixosModules.default ];
  programs.natsumi = {
    enable = true;
    browser = "floorp";
    # profiles live under $HOME, which a system-level module can't infer
    # on its own -- point it at the right user:
    homeDirectory = "/home/you";
  };
}
```

home-manager is the better fit for most setups (it already runs as your
user, so there's no root/ownership juggling involved). The NixOS module
exists for system-wide installs and handles that juggling itself, but
it's inherently more moving parts.

## Options

| Option | Default | Description |
|---|---|---|
| `enable` | `false` | Turn the module on |
| `browser` | `""` | `"firefox"` \| `"librewolf"` \| `"floorp"`, or `""` for manual mode |
| `profile` | `"default"` | `"default"` always targets a fixed profile named `natsumi.default-default` (creating it if needed); any other value targets that exact profile name (also creating it if needed). Either way, whichever profile gets targeted is forced to be the browser's actual default. |
| `homeDirectory` | `"/root"` | NixOS-module mode only — which user's `$HOME` to install into |
| `profilesDirectory` | auto-set by `browser` | Where `profiles.ini` and profile dirs live, if you need to override it |
| `desktopNameSuffix` | `" (Natsumi)"` | Appended to the `.desktop` entry's `Name=`, so it's distinguishable from a separately-installed stock copy of the same browser. `""` disables it. |
| `librewolf.DarkModeFix` | `false` | LibreWolf's fingerprinting protection normalizes away `prefers-color-scheme` by default, so sites can't detect dark/light preference. Set `true` to exclude just that from fingerprinting protection, leaving the rest intact. Only applies when `browser = "librewolf"`. |
| `fxAutoconfigSource` | this flake's pinned input | Override the fx-autoconfig source tree |
| `natsumiSource` | this flake's pinned input | Override the Natsumi source tree |
| `method` | `"wrapFirefox"` | Manual mode only (`browser = ""`): `"wrapFirefox"` (for anything nixpkgs builds from source, has an `*-unwrapped` package) or `"directPatch"` (for a prebuilt binary, like Floorp) |
| `unwrappedPackage` | `pkgs.firefox-unwrapped` | Manual mode: which browser derivation to install into |
| `wrapper` | `pkgs.wrapFirefox` | Manual mode, `wrapFirefox` method: the wrap function |
| `wrapperArgs` | `{ }` | Manual mode: extra args passed to `wrapper` |
| `package` | (computed) | Read-only: the resulting, ready-to-run browser package |
