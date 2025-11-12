if type -q eza
    alias ll "eza -l -g --icons"
    alias llt "ll --tree --level=3"

    alias la "eza -l -A -g --icons"
    alias lat "la --tree --level=3"
end

# Fzf
set -g FZF_PREVIEW_FILE_CMD "bat --style=numbers --color=always --line-range :500"
set -g FZF_LEGACY_KEYBINDINGS 0
