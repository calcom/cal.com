# We only branch if it's not main or production
if [[ ("$VERCEL_GIT_COMMIT_REF" == "main") || ("$VERCEL_GIT_COMMIT_REF" == "production") ]]; then
  exit 1
fi

# We don't have snaplet installed on the CI, so we use this script to get it temporarily.
curl -sL https://app.snaplet.dev/get-cli/ | bash &>/dev/null
export PATH=/vercel/.local/bin/:$PATH

if [ "$VERCEL_GIT_COMMIT_SHA" == "" ]; then
  echo "Error: VERCEL_GIT_COMMIT_SHA is empty"
  exit 0
fi

if [ "$VERCEL_TOKEN" == "" ]; then
  echo "Error: VERCEL_TOKEN is empty"
  exit 0
fi

if [ "$VERCEL_PROJECT_ID" == "" ]; then
  echo "Error: VERCEL_PROJECT_ID is empty"
  exit 0
fi

if [ "$SNAPLET_ACCESS_TOKEN" == "" ]; then
  echo "Error: SNAPLET_ACCESS_TOKEN is empty"
  exit 0
fi

if [ "$SNAPLET_PROJECT_ID" == "" ]; then
  echo "Error: SNAPLET_PROJECT_ID is empty"
  exit 0
fi

# stop execution on error - don't let it build if something goes wrong
set -e

# Create new snaplet instant db for this branch
snaplet db create --git --latest

# Save the new snaplet instant db url
NEW_DATABASE_URL=$(snaplet db url --git)

if [ "$NEW_DATABASE_URL" == "" ]; then
  echo "Error: NEW_DATABASE_URL is empty"
  exit 0
fi

if [ "$VERCEL_ORG_ID" == "" ]; then
  # Use this for personal projects
  VERCEL_PROJECT_ENDPOINT=$(echo "https://api.vercel.com/v1/projects/$VERCEL_PROJECT_ID/env")
else
  # Use this for team projects
  VERCEL_PROJECT_ENDPOINT=$(echo "https://api.vercel.com/v1/projects/$VERCEL_PROJECT_ID/env?teamId=$VERCEL_ORG_ID")
fi

echo "calling... $VERCEL_PROJECT_ENDPOINT"
# We update DATABASE_URL using Vercel API
curl -f -sS -o /dev/null -X POST "$VERCEL_PROJECT_ENDPOINT" \
  -H 'Content-Type: application/json' \
  -H "Authorization: Bearer $VERCEL_TOKEN" \
  --data-raw '{
    "target": "preview",
    "gitBranch": "'$VERCEL_GIT_COMMIT_REF'",
    "type": "encrypted",
    "key": "DATABASE_URL",
    "value": "'$NEW_DATABASE_URL'"
}'
res=$?
if test "$res" != "0"; then
  echo "the curl command failed with: $res"
  exit 0
else
  echo "Successfully updated DATABASE_URL"
  exit 1
fi
