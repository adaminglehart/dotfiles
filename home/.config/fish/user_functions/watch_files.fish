#!/usr/bin/env fish

function watch_files
    # Set the directory to watch
    set watch_dir $PWD

    # Initialize the timestamp
    set timestamp (find $watch_dir -type f -exec stat -f '%m' {} \;)

    set file_list (find $watch_dir -type f -exec stat -f '{}' \;)

    while true
        # Get the current timestamp
        set new_timestamp (find $watch_dir -type f -exec stat -f '%m' {} \;)

        # Check if the timestamp has changed
        if test "$timestamp" != "$new_timestamp"
            # Find the changed files
            for i in (seq 1 (count $new_timestamp))
                set nth_new_timestamp $new_timestamp[$i]
                set nth_old_timestamp $timestamp[$i]
                if test $nth_new_timestamp != $nth_old_timestamp
                    set idx (math $i - 1)
                    set changed (echo $file_list[$i])
                    echo "File changed: $changed"
                end
            end

            # Update the timestamp
            set timestamp $new_timestamp
        end

        sleep 2
    end
end
