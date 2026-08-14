function gcp
    if test -z "$argv[1]"
        echo "Usage: gcp '<commit message>'"
        return 1
    end

    git commit -m "$argv[1]" && git push
end
