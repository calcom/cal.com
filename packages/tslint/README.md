# Translation String Linter

This package contains a simple script that helps manage various
aspects of this repo's translatable strings. Currently it only
contains 1 script, but it's built to be ready for expansion
as necessary.

## Unused Strings

This script simple reads the translation file associated with the
primary language (English, currently) and determine if there are
any translatable strings present in the code that are not present
in the codebase.

For detailed information, see the `OPTIONS` const within `./index.js`;

### What This Script Does

First, it processes the list of paths from the `primaryTranslationFiles` option, converts them to JSON, and merges all files into a single array of known key names. If `en/common.json` has 7 keys, and `en/vital.json` has 3, this script will merge them into 1 list of 10 keys (removing any duplicates)

Next, it generates a list of specific file paths based on the `projectsSources` option. This is typically the step that takes the most time. The more broad you are with this glob, the more time the script will take.

Once the script knows its list of files, it performs the following on each file:

- Reads the file's raw content
- Uses a regex to gather *all* strings within the given file. Everything from imports, to classNames, etc.
- It compares each string to the list of known key names. If there's a match, we assume that this key is being used and remove it from our "unused keys" array

Once the above happens on all files, we're left with an array of keyNames that don't exist within the provided files.