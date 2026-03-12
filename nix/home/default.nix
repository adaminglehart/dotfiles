{ pkgs, lib, environment, ... }:

{
  imports = [
    ./shell.nix
    ./git.nix
    ./terminal.nix
    ./editors.nix
  ];

  home.stateVersion = "24.11";

  home.packages = with pkgs; [
    # Core CLI tools
    tree
    ripgrep
    fd
    graphviz
    gh
    jq
    just
    mise
    gitui
    neofetch

    # Home-specific
  ] ++ lib.optionals (environment == "home") (with pkgs; [
    cloudflared
    ghq
    rustup
    television
    kubernetes-helm
    nomad
    jujutsu
    ansible
  ]);

  # 1Password SSH agent config
  xdg.configFile."1Password/ssh/agent.toml".source = ../configs/1Password/ssh/agent.toml;

  # Mise tool version manager
  xdg.configFile."mise/config.toml".source = ../configs/mise/config.toml;

  # Television interactive picker
  xdg.configFile."television/config.toml".source = ../configs/television/config.toml;

  # Just command runner
  xdg.configFile."just/justfile".source = ../configs/just/justfile;
  xdg.configFile."just/home/mod.just".source = ../configs/just/home/mod.just;
  xdg.configFile."just/onepassword/justfile".source = ../configs/just/onepassword/justfile;
  xdg.configFile."just/onepassword/dotenv_template.json".source = ../configs/just/onepassword/dotenv_template.json;

  # Jujutsu VCS
  xdg.configFile."jj/config.toml".source = ../configs/jj/config.toml;
}
