CHEZMOI_CONFIG := "~/.config/chezmoi-dotfiles/chezmoi.yaml"

init:
    # Generate the config file
    chezmoi init --config-path ~/.config/chezmoi-dotfiles/chezmoi.yaml --source ~/dev/dotfiles/home --apply=false
    # Re-run init using the generated config so state is written to the right place
    chezmoi --config ~/.config/chezmoi-dotfiles/chezmoi.yaml init --source ~/dev/dotfiles/home --apply=false

apply:
    chezmoi --config {{ CHEZMOI_CONFIG }} apply

diff:
    chezmoi --config {{ CHEZMOI_CONFIG }} diff
