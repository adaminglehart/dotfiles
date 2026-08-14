function review
    set -l review_dir (pwd)
    set -l review_args $argv

    if test (count $review_args) -gt 0; and test -d $review_args[1]
        set review_dir $review_args[1]
        set -e review_args[1]
    end

    set -l has_review_target false
    for arg in $review_args
        switch $arg
            case --base '--base=*' --uncommitted --commit '--commit=*'
                set has_review_target true
                break
        end
    end

    if not $has_review_target
        set review_args --base main $review_args
    end

    set -l review_output (mktemp -t codex-review.XXXXXX)
    set -l review_log (mktemp -t codex-review-log.XXXXXX)

    pushd $review_dir >/dev/null; or begin
        rm -f $review_output $review_log
        return 1
    end

    codex exec review --output-last-message $review_output $review_args >$review_log 2>&1
    set -l review_status $status
    popd >/dev/null

    if test -s $review_output
        cat $review_output
    else if test $review_status -ne 0
        cat $review_log >&2
    end

    rm -f $review_output $review_log

    return $review_status
end
