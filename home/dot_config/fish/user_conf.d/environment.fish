# and FNOX_AGE_KEY not already set
if test (which op) && test (which fnox) && test -z "$FNOX_AGE_KEY"
    set -g FNOX_AGE_KEY (op_cached "op://homelab/age key/secretkey")
end

if test (which op)
    set -gx HONCHO_API_KEY (op_cached "op://dotenv/HONCHO_API_KEY/value")
end
