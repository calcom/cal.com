#!/bin/sh
# If no project name is given
if [ $# -eq 0 ]; then
  # Display usage and stop
  echo "Usage: git-setup.sh <api,console,website>"
  exit 1
fi
# Get remote url to support either https or ssh
remote_url=$(echo $(git config --get remote.origin.url) | sed 's![^/]*$!!')
# Loop through the requested modules
for module in "$@"; do
  echo "Setting up '$module' module..."
  # Set the project git URL
  project=$remote_url$module.git
  # Check if we have access to the module
  if [ "$(git ls-remote "$project" 2>/dev/null)" ]; then
    echo "You have access to '${module}'"
    # Create the .gitmodules file if it doesn't exist
    ([ -e ".gitmodules" ] || touch ".gitmodules") && [ ! -w ".gitmodules" ] && echo cannot write to .gitmodules && exit 1
    # Prevents duplicate entries
    git config -f .gitmodules --unset-all "submodule.apps/$module.branch"
    # Add the submodule
    git submodule add --force $project "apps/$module"
    # Set the default branch to main
    git config -f .gitmodules --add "submodule.apps/$module.branch" main
    # Adding the subdmoule ignores the `.gitignore` so a reset is needed
    git reset
  else
    # If the module is the API, display a link to request access
    if [ "$module" = "api" ]; then
      echo "You don't have access to: '${module}' module. You can request access in: https://console.cal.com"
    else
      # If the module is not the API, display normal message
      echo "You don't have access to: '${module}' module."
    fi
  fi
done
