# Launch Oh My Pi with its own agent directory and fnox secrets.
function omp --description "Launch Oh My Pi with fnox secrets"
    set -lx PI_CODING_AGENT_DIR $HOME/.omp/agent
    set -l omp_bin (type -P omp)
    set -l fnox_config $HOME/.config/fnox/fnox.toml

    if test -f $fnox_config
        fnox exec --config $fnox_config -- $omp_bin $argv
        return $status
    end

    $omp_bin $argv
end
