#!/bin/sh
# Usage: ./deploy-env.sh .env.local.development development
set -a
. $1
set +a
env_vars=$(cat "$1" | sed s/\#.*//g | sed s/=.*//g)

for key in $(echo $env_vars); do
    if [[ $key =~ ^\#.* ]]; then
        echo "Skipping the commented value" - $key
    else
        echo "Uploading" - $key
        #sleep 2 #For vercel API
        vc env rm ${key} $2 -y
        echo "${!key}" | vc env add $key $2
    fi
done

exit 0
