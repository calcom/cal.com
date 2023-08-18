#!/usr/bin/env sh


staged_files=$(git diff --name-only --relative --cached)

if [ -n "$staged_files" ]; then
    echo "$staged_files" | cspell --file-list stdin --config .cspell/cspell.json --no-progress --no-summary --show-suggestions

    if [ $? -ne 0 ]; then
        echo
        echo "(If you want to ignore any of the words, please add them to ./.cspell/projectWords.txt)"
        echo
        exit 1
    fi
fi
