{ pkgs, lib, environment, ... }:

{
  # Fish shell
  programs.fish = {
    enable = true;

    shellAliases = {
      ls = "ls -p -G";
      la = "ls -A";
      ll = "ls -l";
      lla = "ll -A";
      g = "git";
      gs = "git status";
      gts = "gt modify && gt submit --stack --update-only";
      y = "yarn";
      npr = "npm run";
      ccat = "/bin/cat";
      cat = "bat";
      now = "gdate +%s%3N";
      tar = "gtar";
      t = "tmux";
      n = "nvim";
      z = "zed";
      kub = "kubectl";
      tf = "terraform";
      tg = "terragrunt";
    };

    functions = {
      ga = "git add (gd $argv)";
      gd = ''
        set -f preview "git diff $argv --color=always -- {-1}"
        git diff $argv --name-only | fzf -m --ansi --preview $preview
      '';
      atob = ''node -e "console.log(Buffer.from('$argv', 'base64').toString('utf-8'))"'';
      btoa = ''node -e "console.log(Buffer.from('$argv').toString('base64'))"'';
    };

    plugins = [
      { name = "fzf-fish"; src = pkgs.fishPlugins.fzf-fish.src; }
    ] ++ lib.optionals (environment == "home") [
      { name = "nvm"; src = pkgs.fishPlugins.nvm.src; }
    ];

    interactiveShellInit = ''
      set fish_greeting ""

      # Environment
      set -gx TERM xterm-256color
      set -gx EDITOR code
      set -gx SSH_AUTH_SOCK ~/Library/Group\ Containers/2BUA8C4S2C.com.1password/t/agent.sock
      set -gx KUBECONFIG ~/dev/homelab/kubernetes/kubeconfig
      set -gx PRISMA_SKIP_POSTINSTALL_GENERATE true
      set -gx BUN_INSTALL "$HOME/.bun"
      set -g GOPATH $HOME/go

      # PATH additions not managed by Nix
      fish_add_path bin
      fish_add_path ~/bin
      fish_add_path ~/.local/bin
      fish_add_path ~/.orbstack/bin
      fish_add_path /usr/local/bin
      fish_add_path node_modules/.bin
      fish_add_path ~/.bun/bin
      fish_add_path $GOPATH/bin

      # FZF
      set -gx FZF_DEFAULT_OPTS '--cycle --layout=reverse --border --height=90% --preview-window=wrap --marker="*"'
      set -g FZF_PREVIEW_FILE_CMD "bat --style=numbers --color=always --line-range :500"
      set -g FZF_LEGACY_KEYBINDINGS 0

      # Theme
      set -g theme_color_scheme terminal-dark
      set -g fish_prompt_pwd_dir_length 1
      set -g theme_display_user yes
      set -g theme_hide_hostname no
      set -g theme_hostname always
      set -g fish_escape_delay_ms 1000
      set -g fish_sequence_key_delay_ms 1000

      # Cargo
      if test -f "$HOME/.cargo/env.fish"
        source "$HOME/.cargo/env.fish"
      end

      # eza aliases (override basic ls aliases)
      if type -q eza
        alias ll "eza -l -g --icons"
        alias llt "ll --tree --level=3"
        alias la "eza -l -A -g --icons"
        alias lat "la --tree --level=3"
      end

      # Starship — support SIMPLE_MODE toggle
      if test "$SIMPLE_MODE"
        set -gx STARSHIP_CONFIG "$HOME/.config/starship-simple.toml"
      end
      starship init fish | source

      # Completions
      if type -q kubectl
        kubectl completion fish | source
      end
      if type -q talosctl
        talosctl completion fish | source
      end

      # 1Password + fnox
      if type -q op; and type -q fnox; and test -z "$FNOX_AGE_KEY"
        set -g FNOX_AGE_KEY (op_cached "op://homelab/age key/secretkey")
      end

      # Mise
      if type -q mise
        mise activate fish | source
      end
    '' + lib.optionalString (environment == "home") ''

      # NVM
      set --universal nvm_default_version latest
    '' + lib.optionalString (environment == "work") ''

      # Stripe
      status --is-interactive; and nodenv init - --no-rehash fish | source
      nodenv shell 22.18.0
      fish_add_path ~/stripe/space-commander/bin
      set -gx CARGO_HOME "~/stripe/.cargo"
    '';
  };

  # Starship prompt — raw config files for SIMPLE_MODE support
  # Not using programs.starship module to avoid config file conflicts
  home.packages = [ pkgs.starship ];
  xdg.configFile."starship.toml".source = ../configs/starship.toml;
  xdg.configFile."starship-simple.toml".source = ../configs/starship-simple.toml;

  # Complex fish functions — placed as autoload files
  # (avoids double-wrapping from HM's function generator)
  xdg.configFile."fish/functions/op_cached.fish".source = ../configs/fish/user_functions/op_cached.fish;
  xdg.configFile."fish/functions/op_cache_clear.fish".source = ../configs/fish/user_functions/op_cache_clear.fish;
  xdg.configFile."fish/functions/watch_files.fish".source = ../configs/fish/user_functions/watch_files.fish;

  # Bat
  programs.bat.enable = true;

  # Eza
  programs.eza.enable = true;

  # Zoxide (replaces cd)
  programs.zoxide = {
    enable = true;
    enableFishIntegration = true;
    options = [ "--cmd" "cd" ];
  };

  # Direnv
  programs.direnv = {
    enable = true;
    enableFishIntegration = true;
    nix-direnv.enable = true;
  };

  # FZF
  programs.fzf = {
    enable = true;
    enableFishIntegration = false; # handled by fzf-fish plugin
  };

  # Git delta (pager)
  programs.git.delta.enable = true;
}
