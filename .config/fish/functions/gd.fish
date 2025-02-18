function gd
    set -f preview "git diff $argv --color=always -- {-1}"
    git diff $argv --name-only | fzf -m --ansi --preview $preview
end
