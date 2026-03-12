{ pkgs, ... }:

{
  # Neovim — kickstart.nvim config, managed as raw files
  programs.neovim = {
    enable = true;
    defaultEditor = false; # EDITOR is set to code in shell.nix
  };
  xdg.configFile."nvim" = {
    source = ../configs/nvim;
    recursive = true;
  };

  # Zed — config managed as raw JSON
  xdg.configFile."zed/settings.json".source = ../configs/zed/settings.json;
}
