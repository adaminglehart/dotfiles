{ pkgs, ... }:

{
  # Ghostty terminal
  xdg.configFile."ghostty/config".source = ../configs/ghostty/config;

  # Zellij multiplexer
  home.packages = [ pkgs.zellij ];
  xdg.configFile."zellij/config.kdl".source = ../configs/zellij/config.kdl;
  xdg.configFile."zellij/layouts".source = ../configs/zellij/layouts;
}
