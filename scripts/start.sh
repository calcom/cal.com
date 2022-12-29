#!/bin/sh
set -x

npx prisma migrate deploy --schema /calcom/packages/prisma/schema.prisma
npx ts-node --transpile-only /calcom/packages/prisma/seed-app-store.ts
yarn start
