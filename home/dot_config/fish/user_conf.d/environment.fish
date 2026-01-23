# and FNOX_AGE_KEY not already set
if test (which op) && test (which fnox) && test -z "$FNOX_AGE_KEY"
    set -g FNOX_AGE_KEY (op_cached "op://homelab/age key/secretkey")
end
