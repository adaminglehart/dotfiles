if test (which op) && test (which fnox)
  set -g FNOX_AGE_KEY (echo "op://homelab/age key/secretkey" | op inject)
end
