{ pkgs, environment, username, ... }:

{
  # Nix configuration
  nix.settings.experimental-features = [ "nix-command" "flakes" ];

  # Allow unfree packages (for things like 1password-cli)
  nixpkgs.config.allowUnfree = true;

  # Set fish as an allowed shell
  programs.fish.enable = true;

  # Homebrew — manages GUI casks and taps not in nixpkgs
  homebrew = {
    enable = true;
    # Don't remove unlisted packages during experiment
    # Change to "zap" once you're confident in the config
    onActivation.cleanup = "none";

    taps = [
      "withgraphite/tap"
    ] ++ (if environment == "home" then [
      "siderolabs/tap"
    ] else []);

    brews = [
      "withgraphite/tap/graphite"
    ] ++ (if environment == "home" then [
      "siderolabs/tap/talosctl"
      "fisher"
    ] else [
      "nodenv"
    ]);

    casks = [
      "slack"
      "sourcetree"
      "postman"
      "spotify"
      "visual-studio-code"
      "raycast"
      "1password-cli"
    ] ++ (if environment == "home" then [
      "ghostty"
      "dropbox"
      "orbstack"
      "rectangle-pro"
      "ngrok"
      "zed"
      "obsidian"
    ] else [
      "font-jetbrains-mono"
      "rectangle"
    ]);
  };

  # macOS system defaults (replaces .macos script)
  system.defaults = {
    dock = {
      # Hot corners — all disabled
      wvous-bl-corner = 1;
      wvous-bl-modifier = 0;
      wvous-tl-corner = 1;
      wvous-tl-modifier = 0;
      wvous-tr-corner = 1;
      wvous-tr-modifier = 0;
    };

    finder = {
      AppleShowAllFiles = true;
    };

    NSGlobalDomain = {
      "com.apple.swipescrolldirection" = false;
    };

    # Note: some .macos settings (menu bar, Photos, App Store auto-update)
    # don't have nix-darwin equivalents and may still need a script or
    # manual configuration.
  };

  # Security — enable Touch ID for sudo
  security.pam.services.sudo_local.touchIdAuth = true;

  system.stateVersion = 6;
}
