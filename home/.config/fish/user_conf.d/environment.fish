# Set FNOX_AGE_KEY from local file (create from 1Password if needed)
if test (which fnox) && test -z "$FNOX_AGE_KEY"
  set -l age_file ~/.config/fnox/age.txt

  if not test -f $age_file
    if test (which op)
      op read "op://dotenv/AGE_KEY/secretkey" > $age_file
      chmod 600 $age_file
    end
  end

  if test -f $age_file
    set -x FNOX_AGE_KEY (grep "AGE-SECRET-KEY" $age_file)
  end
end

# Load secrets from fnox global config
# After first setup, run: fnox sync --provider age --global --force
if test (which fnox) && test -n "$FNOX_AGE_KEY"
  fnox export --format env | source
end
