set fish_greeting ""

set -gx TERM xterm-256color

# theme
set -g theme_color_scheme terminal-dark
set -g fish_prompt_pwd_dir_length 1
set -g theme_display_user yes
set -g theme_hide_hostname no
set -g theme_hostname always

set -g fish_escape_delay_ms 1000
set -g fish_sequence_key_delay_ms 1000

# aliases
alias ls "ls -p -G"
alias la "ls -A"
alias ll "ls -l"
alias lla "ll -A"

## git
alias g git
# alias ga "git add"
alias gs "git status"
alias gts "gt modify && gt submit --stack --update-only"

alias y yarn
alias npr "npm run"
alias ccat /bin/cat
alias cat bat
alias now "gdate +%s%3N"

alias tar gtar

alias t tmux
alias n nvim
alias z zed

alias kub kubectl
alias tf terraform

set --export FZF_DEFAULT_OPTS '--cycle --layout=reverse --border --height=90% --preview-window=wrap --marker="*"'
# set -g FZF_DEFAULT_COMMAND '' # use rg or something

set -gx EDITOR nvim

set -gx PATH bin $PATH
set -gx PATH ~/bin $PATH
set -gx PATH ~/.local/bin $PATH
set -gx PATH /usr/local/opt/coreutils/libexec/gnubin $PATH
set -gx PATH ~/.orbstack/bin $PATH
set -gx PATH $(brew --prefix rustup)/bin $PATH

set -gx PATH /usr/local/opt/libpq/bin $PATH

set -gx PATH ~/.orbstack/bin $PATH

set -gx SSH_AUTH_SOCK ~/Library/Group\ Containers/2BUA8C4S2C.com.1password/t/agent.sock

if test -f "$HOME/.cargo/env.fish"
    source "$HOME/.cargo/env.fish"
end

# if test -f "$HOME/.sdkman/bin/sdkman-init.sh"
#     source "$HOME/.sdkman/bin/sdkman-init.sh"
#     set SDKMAN_PLATFORM "$(cat "${SDKMAN_DIR/var/platform")"
# end

set -gx PRISMA_SKIP_POSTINSTALL_GENERATE true

set brewpath $(which brew)
# set brewpath /opt/homebrew/bin/brew
eval "$($brewpath shellenv)"

# NodeJS
set -gx PATH node_modules/.bin $PATH
set -gx NVM_DIR (brew --prefix nvm)

set -gx PATH ~/.bun/bin $PATH

set --universal nvm_default_version latest

# Go
set -g GOPATH $HOME/go
set -gx PATH $GOPATH/bin $PATH

# NVM
# function __check_nvm --on-variable PWD --description 'Check for .nvmrc file and switch to the correct Node version'
#     status --is-command-substitution; and return

#     set start_time (now) # Get the current time in milliseconds

#     set max_depth 10
#     set current_path $PWD

#     for i in (seq 0 $max_depth)
#         if test -f "$current_path/.nvmrc"; and test -r "$current_path/.nvmrc"
#             echo "using nvmrc from $current_path/.nvmrc"
#             nvm use
#             break
#         end
#         set current_path (dirname $current_path)
#     end

#     set end_time (now) # Get the current time in milliseconds
#     set elapsed_time (math $end_time - $start_time) # Calculate the elapsed time
#     # echo "Time taken to find .nvmrc: $elapsed_time ms"
# end

switch (uname)
    case Darwin
        source (dirname (status --current-filename))/config-osx.fish
    case Linux
        source (dirname (status --current-filename))/config-linux.fish
    case '*'
        source (dirname (status --current-filename))/config-windows.fish
end

set LOCAL_CONFIG (dirname (status --current-filename))/config-local.fish
if test -f $LOCAL_CONFIG
    source $LOCAL_CONFIG
end

if test $SIMPLE_MODE
    export STARSHIP_CONFIG="$HOME/.config/starship-simple.toml"
else
    export STARSHIP_CONFIG="$HOME/.config/starship.toml"
end

# bun
set --export BUN_INSTALL "$HOME/.bun"
set --export PATH $BUN_INSTALL/bin $PATH

alias claude="/Users/adam/.claude/local/claude"

starship init fish | source

zoxide init fish --cmd cd | source
kubectl completion fish | source
talosctl completion fish | source

if test $(which direnv)
    direnv hook fish | source
end
