#!/bin/bash

# Updates the forked repository from the original repository

# Set the current version tag to pull from (https://github.com/calcom/cal.com/releases)
TAG=v2.8.10
# SHA of the commit from the API repository (https://github.com/calcom/api)
API_HASH=9490b65

# add the original repository as a remote and set its URL
if ! git remote | grep -q "^calcom$"; then
  git remote add calcom https://github.com/calcom/cal.com.git
fi

# Clone the API repository into the API folder
API_PROJECT=git@github.com:calcom/api.git

if [ ! "$(git ls-remote "$API_PROJECT" 2>/dev/null)" ]; then
  echo "You do not have access to API module. Please request it from Cal.com"
  exit 1
fi

rm -rf apps/api
git clone --depth=1 --branch=main git@github.com:calcom/api.git apps/api
rm -rf apps/api/.git

# fetch the tag from the original repository
git fetch calcom refs/tags/$TAG

if git diff HEAD $TAG --quiet; then
  echo "Branches are identical, no merge necessary."
  exit 0
fi

# merge the fetched tag into the main branch of the fork repository
git merge calcom/$TAG
