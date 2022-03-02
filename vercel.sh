# github submodule repo addresses without https:// prefix

# This didn't work ¯\_(ツ)_/¯
# declare -A remotes=(
#     ["apps/website"]="github.com/calcom/website"
#     ["apps/api"]="github.com/calcom/api"
# )

# github access token is necessary
# add it to Environment Variables on Vercel
if [ "$GITHUB_ACCESS_TOKEN" == "" ]; then
    echo "Error: GITHUB_ACCESS_TOKEN is empty"
    exit 1
fi

# stop execution on error - don't let it build if something goes wrong
set -e

# get submodule commit
output=$(git submodule status --recursive) # get submodule info

# Extract each submodule commit hash and path
submodules=$(echo $output | sed "s/ -/__/g" | sed "s/ /=/g" | sed "s/-//g" | tr "__" "\n")

git config --global init.defaultBranch main
git config --global advice.detachedHead false

for submodule in $submodules; do
    IFS="=" read COMMIT SUBMODULE_PATH <<<"$submodule"

    # This should be a hash table but couldn't make it work ¯\_(ツ)_/¯
    # SUBMODULE_GITHUB=$remotes[$SUBMODULE_PATH]
    if [ "$SUBMODULE_PATH" == "apps/website" ]; then
        SUBMODULE_GITHUB=github.com/calcom/website
    fi

    if [ "$SUBMODULE_PATH" == "apps/api" ]; then
        SUBMODULE_GITHUB=github.com/calcom/api
    fi

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
