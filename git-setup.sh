#!/bin/sh
# If no project name is given
if [ $# -eq 0 ]; then
  # Display usage and stop
  echo "Usage: git-setup.sh <console,website>"
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
    
    # Update to the latest from main in that submodule
    cd apps/$module && git pull origin main && cd ../..

    # We forcefully added the subdmoule which was in .gitignore, so unstage it.
    git restore --staged apps/$module
  else
    echo "You don't have access to: '${module}' module."
  fi
done
git restore --staged .gitmodules
