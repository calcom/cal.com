#!/bin/sh
# If no project name is given
if [ $# -eq 0 ]; then
  # Display usage and stop
  echo "Usage: git-setup.sh <api,console,website>"
  exit 1
fi

for module in "$@"; do
  echo "Setting up '$module' module..."
  # Set the project name, adding .git if necessary
  project=$(echo "git@github.com:calcom/$module.git")
  [ "$(git ls-remote $project 2>/dev/null)" ] && {
    echo "You have access to '${module}'"
    ([ -e ".gitmodules" ] || touch ".gitmodules") && [ ! -w ".gitmodules" ] && echo cannot write to .gitmodules && exit 1
    git submodule add --force https://github.com/calcom/$module.git apps/$module
    git config -f .gitmodules --add submodule.apps/$module.branch main
  } || {
    if [ "$module" == "api" ]; then
      echo "You don't have access to: '${module}' module. You can request access in: https://console.cal.com"
      exit 0
    else
      echo "You don't have access to: '${module}' module."
      exit 0
    fi
  }
done
