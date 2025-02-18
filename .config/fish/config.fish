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

alias t tmux

set --export FZF_DEFAULT_OPTS '--cycle --layout=reverse --border --height=90% --preview-window=wrap --marker="*"'
# set -g FZF_DEFAULT_COMMAND '' # use rg or something

set -gx EDITOR nvim

set -gx PATH bin $PATH
set -gx PATH ~/bin $PATH
set -gx PATH ~/.local/bin $PATH
set -gx PATH /usr/local/opt/coreutils/libexec/gnubin $PATH

set -gx PATH ~/.orbstack/bin $PATH

source "$HOME/.cargo/env.fish"

set -gx PRISMA_SKIP_POSTINSTALL_GENERATE true

# fish_add_path echo 'eval "$(/opt/homebrew/bin/brew shellenv)"' >> /Users/joshalletto/.zprofile
# set brewpath $(which brew)
set brewpath /opt/homebrew/bin/brew
eval "$($brewpath shellenv)"

# NodeJS
set -gx PATH node_modules/.bin $PATH
set -gx NVM_DIR (brew --prefix nvm)

set --universal nvm_default_version latest

# Go
set -g GOPATH $HOME/go
set -gx PATH $GOPATH/bin $PATH

# NVM
function __check_nvm --on-variable PWD --description 'Check for .nvmrc file and switch to the correct Node version'
    status --is-command-substitution; and return

    set start_time (now) # Get the current time in milliseconds

    set max_depth 10
    set current_path $PWD

    for i in (seq 0 $max_depth)
        if test -f "$current_path/.nvmrc"; and test -r "$current_path/.nvmrc"
            nvm use
            break
        end
        set current_path (dirname $current_path)
    end

    set end_time (now) # Get the current time in milliseconds
    set elapsed_time (math $end_time - $start_time) # Calculate the elapsed time
    # echo "Time taken to find .nvmrc: $elapsed_time ms"
end

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

starship init fish | source
