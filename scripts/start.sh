#!/bin/sh
set -x

# Replace the statically built values with run-time values
# NOTE: if the values are the same, the replacement will be skipped.
scripts/replace-placeholder.sh "$BUILT_NEXT_PUBLIC_WEBAPP_URL" "$NEXT_PUBLIC_WEBAPP_URL"
scripts/replace-placeholder.sh "$BUILT_NEXT_PUBLIC_WEBSITE_TERMS_URL" "$NEXT_PUBLIC_WEBSITE_TERMS_URL"
scripts/replace-placeholder.sh "$BUILT_NEXT_PUBLIC_WEBSITE_PRIVACY_POLICY_URL" "$NEXT_PUBLIC_WEBSITE_PRIVACY_POLICY_URL"

scripts/wait-for-it.sh ${DATABASE_HOST} -- echo "database is up"
npx prisma migrate deploy --schema /calcom/packages/prisma/schema.prisma
npx ts-node --transpile-only /calcom/scripts/seed-app-store.ts
yarn start
