if test (which op)
  set -g FNOX_AGE_KEY (echo "op://homelab/age key/secretkey" | op inject)
else
  echo "not setting env vars from 1password"
end
