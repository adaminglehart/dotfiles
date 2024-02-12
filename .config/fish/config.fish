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
alias g git
alias y yarn
alias ccat /bin/cat
alias cat bat

set --export FZF_DEFAULT_OPTS '--cycle --layout=reverse --border --height=90% --preview-window=wrap --marker="*"'
# set -g FZF_DEFAULT_COMMAND '' # use rg or something

set -gx EDITOR vim

set -gx PATH bin $PATH
set -gx PATH ~/bin $PATH
set -gx PATH ~/.local/bin $PATH

set -gx PRISMA_SKIP_POSTINSTALL_GENERATE true

# fish_add_path echo 'eval "$(/opt/homebrew/bin/brew shellenv)"' >> /Users/joshalletto/.zprofile
eval "$(/opt/homebrew/bin/brew shellenv)"

# NodeJS
set -gx PATH node_modules/.bin $PATH
set -gx NVM_DIR (brew --prefix nvm)

# Go
set -g GOPATH $HOME/go
set -gx PATH $GOPATH/bin $PATH

# NVM
function __check_rvm --on-variable PWD --description 'Do nvm stuff'
    status --is-command-substitution; and return

    if test -f .nvmrc; and test -r .nvmrc
        nvm use
    else
    end
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
