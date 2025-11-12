init:
  chezmoi init adaminglehart/dotfiles --branch=chezmoi --ssh

update:
  chezmoi update

sync:
  chezmoi apply
