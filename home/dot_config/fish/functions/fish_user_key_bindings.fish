function fish_user_key_bindings
    # fzf
    bind \cf fzf_change_directory

    # vim-like
    # bind \cl forward-char

    # prevent iterm2 from closing when typing Ctrl-D (EOF)
    bind \cd delete-char

    bind \el _fzf_search_git_log
    bind \es _fzf_search_git_status
end

# fzf plugin
fzf_configure_bindings --directory=\co
