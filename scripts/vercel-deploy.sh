# github submodule repo addresses without https:// prefix
BRANCH_TO_CLONE="-b feat/api-keys"

# This didn't work ¯\_(ツ)_/¯
# declare -A remotes=(
#     ["apps/website"]="github.com/calcom/website"
#     ["apps/api"]="github.com/calcom/api"
# )

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
if [ "$VERCEL_GIT_COMMIT_REF" == "staging" ]; then
    BRANCH_TO_CLONE="-b $VERCEL_GIT_COMMIT_REF"
fi

# stop execution on error - don't let it build if something goes wrong
set -e

git config --global init.defaultBranch feat/node-v15x
git config --global advice.detachedHead false

# set up an empty temporary work directory
rm -rf ..?* .[!.]* * || true

# checkout the current commit
git clone $BRANCH_TO_CLONE https://$GITHUB_ACCESS_TOKEN@github.com/calcom/cal.com.git .

echo "Cloned"

# get submodule commit
output=$(git submodule status --recursive) # get submodule info

# Extract each submodule commit hash and path
submodules=$(echo "$output" | sed "s/ /,/g")

for submodule in $submodules; do
    IFS=',' read -ra submodule_parts <<<"$submodule"
    COMMIT=$(echo ${submodule_parts[0]} | sed "s/-/ /g")
    SUBMODULE_PATH=${submodule_parts[1]}
    echo "COMMIT: $COMMIT SUBMODULE_PATH: $SUBMODULE_PATH"

    # This should be a hash table but couldn't make it work ¯\_(ツ)_/¯
    # SUBMODULE_GITHUB=$remotes[$SUBMODULE_PATH]
    if [ "$SUBMODULE_PATH" == "apps/website" ]; then
        SUBMODULE_GITHUB=github.com/calcom/website
    fi

    if [ "$SUBMODULE_PATH" == "apps/api" ]; then
        SUBMODULE_GITHUB=github.com/calcom/api
        COMMIT=$VERCEL_GIT_COMMIT_SHA
    fi

    echo "Submodule init"

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
done

git diff --quiet HEAD^ HEAD ':!/apps/docs/*' ':!/apps/website/*' ':!/apps/web/*'

echo "✅ - Build can proceed"
exit 1