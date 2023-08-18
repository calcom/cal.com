#!/usr/bin/env sh

cspell "**" --config .cspell/cspell.json --show-suggestions

if [ $? -ne 0 ]; then
    echo
    echo "(If you want to ignore any of the words, please add them to ./.cspell/projectWords.txt)"
    echo
    exit 1
fi
