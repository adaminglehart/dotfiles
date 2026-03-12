{ pkgs, ... }:

{
  programs.git = {
    enable = true;
    userName = "Adam Inglehart";
    userEmail = "adam.inglehart@gmail.com";

    extraConfig = {
      init.defaultBranch = "main";
      push.autoSetupRemote = true;
      pull.rebase = true;
      rerere.enabled = true;

      # 1Password SSH signing
      gpg.format = "ssh";
      "gpg \"ssh\"".program = "/Applications/1Password.app/Contents/MacOS/op-ssh-sign";
      commit.gpgsign = true;
      user.signingkey = "ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIPGZVgPGf192WQkW1J5Nqftu7CsnNo/0TcJbRKv1vlTd";
    };
  };

  # Jujutsu — config managed via xdg.configFile in default.nix
}
