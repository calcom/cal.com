# github submodule repo addresses without https:// prefix
BRANCH_TO_CLONE=""
SUBMODULE_GITHUB=github.com/calcom/api
SUBMODULE_PATH=apps/api
COMMIT=$VERCEL_GIT_COMMIT_SHA

if [ "$VERCEL_GIT_COMMIT_SHA" == "" ]; then
  echo "Error: VERCEL_GIT_COMMIT_SHA is empty"
  exit 0
fi

# github access token is necessary
# add it to Environment Variables on Vercel
if [ "$GITHUB_ACCESS_TOKEN" == "" ]; then
  echo "Error: GITHUB_ACCESS_TOKEN is empty"
  exit 0
fi

# We add an exception to test on staging
if [ "$VERCEL_GIT_COMMIT_REF" == "production" ]; then
  BRANCH_TO_CLONE="-b $VERCEL_GIT_COMMIT_REF"
fi
if [ "$VERCEL_GIT_COMMIT_REF" == "staging" ]; then
  BRANCH_TO_CLONE="-b $VERCEL_GIT_COMMIT_REF"
fi

# stop execution on error - don't let it build if something goes wrong
set -e

git config --global init.defaultBranch main
git config --global advice.detachedHead false

# set up an empty temporary work directory
rm -rf ..?* .[!.]* * || true

# checkout the current commit
git clone $BRANCH_TO_CLONE https://$GITHUB_ACCESS_TOKEN@github.com/calcom/cal.com.git .

echo "Cloned"

# Ensure the submodule directory exists
mkdir -p $SUBMODULE_PATH

# set up an empty temporary work directory
rm -rf tmp || true # remove the tmp folder if exists
mkdir tmp          # create the tmp folder
cd tmp             # go into the tmp folder

# checkout the current submodule commit
git init                                                                      # initialise empty repo
git remote add $SUBMODULE_PATH https://$GITHUB_ACCESS_TOKEN@$SUBMODULE_GITHUB # add origin of the submodule
git fetch --depth=1 $SUBMODULE_PATH $COMMIT                                   # fetch only the required version
git checkout $COMMIT                                                          # checkout on the right commit

# move the submodule from tmp to the submodule path
cd ..                     # go folder up
rm -rf tmp/.git           # remove .git
mv tmp/* $SUBMODULE_PATH/ # move the submodule to the submodule path

# clean up
rm -rf tmp # remove the tmp folder

git diff --quiet HEAD^ HEAD ':!/apps/docs/*' ':!/apps/website/*' ':!/apps/web/*' ':!/apps/swagger/*' ':!/apps/console/*'

echo "✅ - Build can proceed"
exit 1
